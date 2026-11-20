"use client";

import { CheckCircle2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { StatusChip } from "@/components/ui/status-chip";
import { navBack } from "@/lib/navigation";
import { reports } from "@/messages/es-MX/reports";

import { confirmReport, findSimilarReports } from "../actions";

import type { SimilarReport } from "../repository";

const copy = reports.similar;

type Lookup = { key: string; reports: SimilarReport[] };

export function SimilarReports({
  categoryId,
  buildingId,
}: {
  categoryId: string;
  buildingId: string;
}) {
  const key = categoryId && buildingId ? `${categoryId}:${buildingId}` : "";
  const [lookup, setLookup] = useState<Lookup>();
  const [dismissed, setDismissed] = useState<string>();
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [loading, startLoading] = useTransition();
  const [confirming, startConfirming] = useTransition();
  const [now] = useState(() => new Date());

  useEffect(() => {
    let active = Boolean(key);
    if (!active) return undefined;
    startLoading(async () => {
      const result = await findSimilarReports({ categoryId, buildingId });
      if (active) setLookup({ key, reports: result.status === "ready" ? result.reports : [] });
    });
    return () => {
      active = false;
    };
  }, [key, categoryId, buildingId]);

  if (!key || dismissed === key) return null;
  if (loading && lookup?.key !== key) {
    return (
      <output aria-live="polite" className="text-sm text-muted">
        {copy.loading}
      </output>
    );
  }
  const items = lookup?.key === key ? lookup.reports : [];
  if (items.length === 0) return null;

  function confirm(reportId: string) {
    startConfirming(async () => {
      const outcome = await confirmReport(reportId);
      setMessages((current) => ({ ...current, [reportId]: outcome.message }));
      if (outcome.result === "confirmed" || outcome.result === "already_confirmed") {
        setConfirmedIds((current) => [...current, reportId]);
      }
    });
  }

  function dismiss() {
    setDismissed(key);
  }

  const anyConfirmed = items.some((item) => confirmedIds.includes(item.id));

  return (
    <section
      aria-labelledby="similar-reports-heading"
      className="grid gap-3 rounded-card border border-line bg-background p-4"
    >
      <div className="grid gap-1">
        <h2 id="similar-reports-heading" className="flex items-center gap-2 font-semibold">
          <Users aria-hidden="true" size={18} />
          {copy.title}
        </h2>
        <p className="text-sm text-muted">{copy.description}</p>
      </div>
      <ul className="grid gap-2">
        {items.map((item) => {
          const confirmed = item.alreadyConfirmed || confirmedIds.includes(item.id);
          return (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-3"
              key={item.id}
            >
              <div className="grid gap-1">
                <p className="font-medium">{item.locationReference}</p>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <StatusChip domain="report" status={item.status} />
                  <span>{copy.age(item.createdAt, now)}</span>
                  <span>{copy.confirmations(item.confirmationsCount)}</span>
                </p>
                <output aria-live="polite" className="text-sm text-muted">
                  {messages[item.id]}
                </output>
              </div>
              {item.isOwn ? (
                <span className="text-sm text-muted">{copy.own}</span>
              ) : (
                <button
                  aria-label={copy.confirmLabel(item.locationReference)}
                  className="button button--secondary button--sm"
                  disabled={confirming || confirmed}
                  onClick={() => confirm(item.id)}
                  type="button"
                >
                  {confirmed && <CheckCircle2 aria-hidden="true" size={15} />}
                  {confirmed ? copy.confirmed : copy.confirm}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {anyConfirmed && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">{copy.done}</p>
          <Link className="button button--primary button--sm" href="/" transitionTypes={navBack}>
            {copy.backHome}
          </Link>
        </div>
      )}
      <button className="button button--ghost justify-self-start" onClick={dismiss} type="button">
        {copy.continue}
      </button>
    </section>
  );
}
