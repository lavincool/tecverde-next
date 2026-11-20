import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { loadReportMetrics, median, startOfMatamorosDay } from "@/features/metrics/repository";
import { hasStaffPermission } from "@/server/auth/permissions";
import { connectDatabase } from "@/server/db/connection";
import {
  auditLog,
  building,
  report,
  reportCategory,
  reportConfirmation,
  reportStatusEvent,
  user,
} from "@/server/db/schema";

import { migrateDatabase } from "../../../scripts/db-migrate";
import { seedCatalog } from "../../../scripts/seed";
import { csvCell, toCsv } from "./export";
import { createReportRecord } from "./mutations";
import { confirmReportRecord, listSimilarOpenReports } from "./repository";
import { canTransitionReport, nextReportStatuses } from "./status-machine";
import {
  addReportComment,
  assignReport,
  changeReportStatus,
  findTriageReport,
  inboxFiltersSchema,
  listInboxReports,
  markReportDuplicate,
  ReportTriageError,
  resolveReport,
  setReportPriority,
} from "./triage";

import type { TriageActor } from "./triage";

type Database = ReturnType<typeof connectDatabase>;

const secret = "tx-test-triage-secret-with-no-production-access";

async function withDatabase(run: (database: Database) => Promise<void>) {
  const database = connectDatabase({ url: "file::memory:" });
  try {
    await migrateDatabase(database);
    await seedCatalog(database);
    await run(database);
  } finally {
    database.$client.close();
  }
}

async function insertStaff(database: Database, role: string, name: string, banned = false) {
  const id = Bun.randomUUIDv7();
  await database.insert(user).values({
    id,
    name,
    email: `${name.toLowerCase()}@tecverde.test`,
    emailVerified: true,
    role,
    banned,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

async function createReport(database: Database, deviceHash = "device-a") {
  const [category] = await database.select().from(reportCategory).limit(1);
  const [campusBuilding] = await database.select().from(building).limit(1);
  if (!category || !campusBuilding) throw new Error("Expected seeded catalog.");
  return createReportRecord(
    database,
    {
      categoryId: category.id,
      buildingId: campusBuilding.id,
      locationReference: "Planta baja",
      description: "Fuga en el lavabo",
      reporterName: null,
      reporterEmail: null,
      deviceHash,
      ipHash: "ip",
    },
    secret,
  );
}

async function reasonOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );
  return error instanceof ReportTriageError ? error.reason : error;
}

describe("report status machine", () => {
  test("follows the documented transitions", () => {
    expect(nextReportStatuses("open", "maintenance")).toEqual([
      "in_review",
      "in_progress",
      "dismissed",
      "duplicate",
    ]);
    expect(canTransitionReport("in_progress", "resolved", "maintenance")).toBe(true);
    expect(canTransitionReport("open", "resolved", "maintenance")).toBe(false);
    expect(canTransitionReport("resolved", "in_progress", "maintenance")).toBe(true);
    expect(canTransitionReport("resolved", "open", "admin")).toBe(false);
  });

  test("only admins reopen dismissed or duplicate reports", () => {
    expect(canTransitionReport("dismissed", "open", "maintenance")).toBe(false);
    expect(canTransitionReport("duplicate", "open", "maintenance")).toBe(false);
    expect(canTransitionReport("dismissed", "open", "admin")).toBe(true);
    expect(canTransitionReport("duplicate", "open", "admin")).toBe(true);
  });
});

describe("report permissions", () => {
  test("separate maintenance, moderation and administration", () => {
    expect(hasStaffPermission("maintenance", { report: ["triage", "resolve", "assign"] })).toBe(
      true,
    );
    expect(hasStaffPermission("maintenance", { report: ["export"] })).toBe(false);
    expect(hasStaffPermission("maintenance", { report: ["delete"] })).toBe(false);
    expect(hasStaffPermission("moderator", { report: ["read"] })).toBe(false);
    expect(hasStaffPermission("moderator", { metrics: ["read"] })).toBe(false);
    expect(hasStaffPermission("admin", { report: ["export", "delete"] })).toBe(true);
  });
});

describe("report triage", () => {
  test("changes status through the state machine and records the timeline and audit log", async () => {
    await withDatabase(async (database) => {
      const actor: TriageActor = {
        id: await insertStaff(database, "maintenance", "Ana"),
        role: "maintenance",
      };
      const created = await createReport(database);

      expect(
        await reasonOf(
          changeReportStatus(
            database,
            { reportId: created.id, status: "resolved", note: null },
            actor,
          ),
        ),
      ).toBe("invalid_transition");

      const change = await changeReportStatus(
        database,
        { reportId: created.id, status: "in_progress", note: "Vamos en camino" },
        actor,
      );
      expect(change).toMatchObject({ from: "open", to: "in_progress", number: created.number });

      const resolved = await resolveReport(
        database,
        { reportId: created.id, note: "Se cambió la llave" },
        actor,
      );
      expect(resolved.to).toBe("resolved");

      const [row] = await database.select().from(report).where(eq(report.id, created.id));
      expect(row?.status).toBe("resolved");
      expect(row?.resolutionNote).toBe("Se cambió la llave");
      expect(row?.resolvedAt).toBeInstanceOf(Date);

      const events = await database
        .select()
        .from(reportStatusEvent)
        .where(eq(reportStatusEvent.reportId, created.id))
        .orderBy(reportStatusEvent.createdAt, reportStatusEvent.id);
      expect(events.map((event) => event.toStatus)).toEqual(["open", "in_progress", "resolved"]);
      expect(events[1]?.note).toBe("Vamos en camino");

      const audits = await database
        .select()
        .from(auditLog)
        .where(eq(auditLog.entityId, created.id));
      expect(audits.map((entry) => entry.action).toSorted()).toEqual([
        "report.change_status",
        "report.resolve",
      ]);

      await changeReportStatus(
        database,
        { reportId: created.id, status: "in_progress", note: null },
        actor,
      );
      const [reopened] = await database.select().from(report).where(eq(report.id, created.id));
      expect(reopened?.resolvedAt).toBeNull();
    });
  });

  test("rejects the resolve and duplicate targets through the generic status change", async () => {
    await withDatabase(async (database) => {
      const actor: TriageActor = {
        id: await insertStaff(database, "admin", "Admin"),
        role: "admin",
      };
      const created = await createReport(database);
      expect(
        await reasonOf(
          changeReportStatus(
            database,
            { reportId: created.id, status: "duplicate", note: null },
            actor,
          ),
        ),
      ).toBe("invalid_transition");
    });
  });

  test("assigns only active maintenance or admin staff and updates priority", async () => {
    await withDatabase(async (database) => {
      const actor: TriageActor = {
        id: await insertStaff(database, "maintenance", "Ana"),
        role: "maintenance",
      };
      const moderator = await insertStaff(database, "moderator", "Mod");
      const banned = await insertStaff(database, "maintenance", "Beto", true);
      const created = await createReport(database);

      expect(
        await reasonOf(
          assignReport(database, { reportId: created.id, assigneeId: moderator }, actor),
        ),
      ).toBe("invalid_assignee");
      expect(
        await reasonOf(assignReport(database, { reportId: created.id, assigneeId: banned }, actor)),
      ).toBe("invalid_assignee");

      await assignReport(database, { reportId: created.id, assigneeId: actor.id }, actor);
      await setReportPriority(database, { reportId: created.id, priority: "urgent" }, actor);

      const mine = await listInboxReports(
        database,
        inboxFiltersSchema.parse({ tab: "mine" }),
        actor.id,
      );
      expect(mine.reports.map((item) => item.id)).toEqual([created.id]);
      expect(mine.reports[0]?.priority).toBe("urgent");
      expect(mine.reports[0]?.assigneeName).toBe("Ana");
    });
  });

  test("marks duplicates and merges confirmations into the target", async () => {
    await withDatabase(async (database) => {
      const actor: TriageActor = {
        id: await insertStaff(database, "maintenance", "Ana"),
        role: "maintenance",
      };
      const target = await createReport(database, "device-target");
      const source = await createReport(database, "device-source");
      await database.insert(reportConfirmation).values([
        { reportId: source.id, deviceHash: "device-x" },
        { reportId: source.id, deviceHash: "device-target" },
        { reportId: target.id, deviceHash: "device-x" },
      ]);

      expect(
        await reasonOf(
          markReportDuplicate(
            database,
            { reportId: source.id, targetNumber: source.number },
            actor,
          ),
        ),
      ).toBe("invalid_duplicate");

      const change = await markReportDuplicate(
        database,
        { reportId: source.id, targetNumber: target.number },
        actor,
      );
      expect(change.targetId).toBe(target.id);

      const [merged] = await database.select().from(report).where(eq(report.id, target.id));
      // device-x, device-target and device-source (the original reporter).
      expect(merged?.confirmationsCount).toBe(3);

      const detail = await findTriageReport(database, source.id);
      expect(detail?.status).toBe("duplicate");
      expect(detail?.duplicateOfNumber).toBe(target.number);

      expect(
        await reasonOf(
          markReportDuplicate(
            database,
            { reportId: target.id, targetNumber: source.number },
            actor,
          ),
        ),
      ).toBe("invalid_duplicate");
    });
  });

  test("stores internal comments with their author", async () => {
    await withDatabase(async (database) => {
      const actor: TriageActor = {
        id: await insertStaff(database, "maintenance", "Ana"),
        role: "maintenance",
      };
      const created = await createReport(database);
      await addReportComment(database, { reportId: created.id, body: "Pedir refacción" }, actor);
      const detail = await findTriageReport(database, created.id);
      expect(detail?.comments).toMatchObject([{ body: "Pedir refacción", authorName: "Ana" }]);
    });
  });

  test("paginates the inbox newest first with a cursor and filters by tab", async () => {
    await withDatabase(async (database) => {
      const actor = await insertStaff(database, "maintenance", "Ana");
      type Created = Awaited<ReturnType<typeof createReport>>;
      const created = await Array.from({ length: 27 }).reduce<Promise<Created[]>>(
        async (previous) => [...(await previous), await createReport(database)],
        Promise.resolve([]),
      );

      const first = await listInboxReports(database, inboxFiltersSchema.parse({}), actor);
      expect(first.reports).toHaveLength(25);
      expect(first.reports[0]?.id).toBe(created.at(-1)?.id);
      const second = await listInboxReports(
        database,
        inboxFiltersSchema.parse({ cursor: first.nextCursor }),
        actor,
      );
      expect(second.reports).toHaveLength(2);
      expect(second.nextCursor).toBeUndefined();

      const closed = await listInboxReports(
        database,
        inboxFiltersSchema.parse({ tab: "closed" }),
        actor,
      );
      expect(closed.reports).toHaveLength(0);
      expect(inboxFiltersSchema.parse({ tab: "nope", priority: "x", category: "y" })).toEqual({
        tab: "new",
        category: undefined,
        building: undefined,
        priority: undefined,
        cursor: undefined,
      });
    });
  });
});

describe("report metrics", () => {
  test("computes the median and the start of the campus day", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    // 2026-11-20T05:30Z is 23:30 on Nov 19 in Matamoros (UTC-6).
    expect(startOfMatamorosDay(new Date("2026-11-20T05:30:00Z")).toISOString()).toBe(
      "2026-11-19T06:00:00.000Z",
    );
  });

  test("matches fixture data", async () => {
    await withDatabase(async (database) => {
      const actor: TriageActor = {
        id: await insertStaff(database, "maintenance", "Ana"),
        role: "maintenance",
      };
      const first = await createReport(database);
      const second = await createReport(database);
      await createReport(database);

      const hour = 3_600_000;
      async function resolveAfter(created: { id: string; createdAt: Date }, hours: number) {
        await changeReportStatus(
          database,
          { reportId: created.id, status: "in_progress", note: null },
          actor,
        );
        await resolveReport(database, { reportId: created.id, note: "Listo" }, actor);
        await database
          .update(report)
          .set({ resolvedAt: new Date(created.createdAt.getTime() + hours * hour) })
          .where(eq(report.id, created.id));
      }
      await resolveAfter(first, 2);
      await resolveAfter(second, 6);

      const metrics = await loadReportMetrics(database);
      expect(metrics.openBacklog).toBe(1);
      expect(metrics.resolvedLast30Days).toBe(2);
      expect(metrics.averageResolutionMs).toBe(4 * hour);
      expect(metrics.medianResolutionMs).toBe(4 * hour);
      const totals = metrics.byCategory.reduce((sum, row) => sum + row.total, 0);
      expect(totals).toBe(3);
      expect(metrics.byCategory[0]).toMatchObject({ total: 3, open: 1 });
      expect(metrics.byBuilding[0]).toMatchObject({ total: 3, open: 1 });
    });
  });
});

describe("csv export", () => {
  test("escapes values and neutralizes formulas", () => {
    expect(csvCell('Dice "hola", adiós')).toBe('"Dice ""hola"", adiós"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(-3)).toBe("-3");
    expect(csvCell(null)).toBe("");
    expect(toCsv(["A", "B"], [[1, "x\ny"]])).toBe('﻿A,B\r\n1,"x\ny"\r\n');
  });
});

describe("similar reports and confirmations", () => {
  test("list open reports in the same place with minimal fields and count one confirmation per device", async () => {
    await withDatabase(async (database) => {
      const actor: TriageActor = {
        id: await insertStaff(database, "maintenance", "Ana"),
        role: "maintenance",
      };
      const original = await createReport(database, "device-original");
      const closed = await createReport(database, "device-closed");
      await changeReportStatus(
        database,
        { reportId: closed.id, status: "dismissed", note: null },
        actor,
      );
      const [row] = await database.select().from(report).where(eq(report.id, original.id));
      if (!row) throw new Error("Expected report.");

      const similar = await listSimilarOpenReports(database, {
        categoryId: row.categoryId,
        buildingId: row.buildingId,
        deviceHash: "device-visitor",
      });
      expect(similar.map((item) => item.id)).toEqual([original.id]);
      expect(Object.keys(similar[0] ?? {}).toSorted()).toEqual([
        "alreadyConfirmed",
        "buildingShortName",
        "categoryName",
        "confirmationsCount",
        "createdAt",
        "id",
        "isOwn",
        "locationReference",
        "status",
      ]);
      expect(similar[0]).toMatchObject({ isOwn: false, alreadyConfirmed: false });

      expect(
        await confirmReportRecord(database, {
          reportId: original.id,
          deviceHash: "device-visitor",
        }),
      ).toEqual({ result: "confirmed", confirmationsCount: 1 });
      expect(
        await confirmReportRecord(database, {
          reportId: original.id,
          deviceHash: "device-visitor",
        }),
      ).toEqual({ result: "already_confirmed", confirmationsCount: 1 });
      expect(
        await confirmReportRecord(database, {
          reportId: original.id,
          deviceHash: "device-original",
        }),
      ).toEqual({ result: "own_report", confirmationsCount: 1 });
      expect(
        (await confirmReportRecord(database, { reportId: closed.id, deviceHash: "device-visitor" }))
          .result,
      ).toBe("not_found");

      const [visitorView] = await listSimilarOpenReports(database, {
        categoryId: row.categoryId,
        buildingId: row.buildingId,
        deviceHash: "device-visitor",
      });
      expect(visitorView).toMatchObject({ alreadyConfirmed: true, confirmationsCount: 1 });
      const [ownerView] = await listSimilarOpenReports(database, {
        categoryId: row.categoryId,
        buildingId: row.buildingId,
        deviceHash: "device-original",
      });
      expect(ownerView?.isOwn).toBe(true);
    });
  });
});
