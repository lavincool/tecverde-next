import { and, eq, isNull } from "drizzle-orm";

import { report } from "@/server/db/schema/reports";

import { consumeActionToken } from "./action-tokens";

import type { ActionTokenPurpose } from "./action-tokens";
import type { connectDatabase } from "@/server/db/connection";

type Database = ReturnType<typeof connectDatabase>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type VerificationOutcome = { purpose: ActionTokenPurpose; subjectId: string };

type VerificationHandler = (
  tx: Transaction,
  subjectId: string,
  now: Date,
) => Promise<boolean | void>;

const handlers: Partial<Record<ActionTokenPurpose, VerificationHandler>> = {
  async verify_report_email(tx, subjectId, now) {
    const updated = await tx
      .update(report)
      .set({ reporterEmailVerifiedAt: now })
      .where(and(eq(report.id, subjectId), isNull(report.deletedAt)))
      .returning({ id: report.id });
    return updated.length > 0;
  },
};

/** Lets other features handle their own double opt-in purposes. */
export function registerVerificationHandler(
  purpose: ActionTokenPurpose,
  handler: VerificationHandler,
) {
  handlers[purpose] = handler;
}

/** Consumes a double opt-in token and applies its effect in one transaction. */
export async function applyEmailVerification(
  database: Database,
  token: string,
  secret: string,
  now = new Date(),
): Promise<VerificationOutcome | null> {
  return database.transaction(
    async (tx) => {
      const consumed = await consumeActionToken(tx, token, secret, now);
      if (!consumed) return null;
      const handler = handlers[consumed.purpose];
      if (!handler) return null;
      const applied = await handler(tx, consumed.subjectId, now);
      if (applied === false) return null;
      return consumed;
    },
    { behavior: "immediate" },
  );
}
