import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { connectDatabase } from "@/server/db/connection";
import { building, report, reportCategory } from "@/server/db/schema";
import { renderEmail, sendEmail } from "@/server/email/send";
import { ReportConfirmEmail, ReportStatusEmail } from "@/server/email/templates/report-emails";
import {
  clearMemoryOutbox,
  createMemoryTransport,
  readMemoryOutbox,
  selectEmailTransport,
} from "@/server/email/transport";

import { migrateDatabase } from "../../../scripts/db-migrate";
import { seedCatalog } from "../../../scripts/seed";
import { createReportRecord } from "../reports/mutations";
import { ACTION_TOKEN_LIFETIME_MS, issueActionToken, peekActionToken } from "./action-tokens";
import { applyEmailVerification } from "./verification";

const secret = "tx-test-notification-secret-with-no-production-access";

async function withReport(
  run: (database: ReturnType<typeof connectDatabase>, reportId: string) => Promise<void>,
) {
  const database = connectDatabase({ url: "file::memory:" });
  try {
    await migrateDatabase(database);
    await seedCatalog(database);
    const [category] = await database.select().from(reportCategory).limit(1);
    const [campusBuilding] = await database.select().from(building).limit(1);
    if (!category || !campusBuilding) throw new Error("Expected seeded catalog.");
    const created = await createReportRecord(
      database,
      {
        categoryId: category.id,
        buildingId: campusBuilding.id,
        locationReference: "Pasillo",
        description: "Luminaria fundida",
        reporterName: "Persona",
        reporterEmail: "persona@example.com",
        deviceHash: "device",
        ipHash: "ip",
      },
      secret,
    );
    await run(database, created.id);
  } finally {
    database.$client.close();
  }
}

describe("email double opt-in", () => {
  test("confirms a report email once and rejects reuse, tampering and expiry", async () => {
    await withReport(async (database, reportId) => {
      const now = new Date();
      const token = await issueActionToken(
        database,
        { purpose: "verify_report_email", subjectId: reportId },
        secret,
        now,
      );
      expect(await peekActionToken(database, token, secret)).toEqual({
        purpose: "verify_report_email",
        subjectId: reportId,
      });
      expect(await applyEmailVerification(database, `${token.slice(0, -1)}A`, secret)).toBeNull();
      expect(await applyEmailVerification(database, token, `${secret}-other`)).toBeNull();

      expect(await applyEmailVerification(database, token, secret)).toEqual({
        purpose: "verify_report_email",
        subjectId: reportId,
      });
      const [row] = await database.select().from(report).where(eq(report.id, reportId));
      expect(row?.reporterEmailVerifiedAt).toBeInstanceOf(Date);
      expect(await applyEmailVerification(database, token, secret)).toBeNull();
      expect(await peekActionToken(database, token, secret)).toBeNull();

      const expired = await issueActionToken(
        database,
        { purpose: "verify_report_email", subjectId: reportId },
        secret,
        now,
      );
      expect(
        await applyEmailVerification(
          database,
          expired,
          secret,
          new Date(now.getTime() + ACTION_TOKEN_LIFETIME_MS + 1),
        ),
      ).toBeNull();
    });
  });
});

describe("email rendering and transports", () => {
  test("renders spanish html and plain text with the confirmation and tracking links", async () => {
    const { html, text } = await renderEmail(
      ReportConfirmEmail({
        number: 12,
        confirmUrl: "https://tecverde.example/verify/abc",
        trackingUrl: "https://tecverde.example/reports/track/xyz",
      }),
    );
    expect(html).toContain('lang="es-MX"');
    expect(html).toContain("https://tecverde.example/verify/abc");
    expect(text).toContain("Confirma tu correo");
    expect(text).toContain("https://tecverde.example/reports/track/xyz");
  });

  test("includes the staff note and duplicate target in status emails", async () => {
    clearMemoryOutbox();
    await sendEmail(
      {
        to: "persona@example.com",
        subject: "Reporte #3: Duplicado",
        element: ReportStatusEmail({
          number: 3,
          statusLabel: "Duplicado",
          note: "Gracias por avisar",
          duplicateOfNumber: 1,
        }),
      },
      createMemoryTransport(),
    );
    const [message] = readMemoryOutbox();
    expect(message?.to).toBe("persona@example.com");
    expect(message?.text).toContain("Gracias por avisar");
    expect(message?.text).toContain("reporte #1");
  });

  test("selects transports from configuration and fails closed in production", () => {
    expect(selectEmailTransport({ EMAIL_TRANSPORT: "memory" }).name).toBe("memory");
    expect(selectEmailTransport({}).name).toBe("console");
    expect(
      selectEmailTransport({ RESEND_API_KEY: "re_test", EMAIL_FROM: "TecVerde <a@example.com>" })
        .name,
    ).toBe("resend");
    expect(() => selectEmailTransport({ VERCEL_ENV: "production" })).toThrow();
  });
});
