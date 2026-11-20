"use client";

import { useActionState, useMemo, useState } from "react";

import { PhotoPicker } from "@/features/media/components/photo-picker";
import { mediaLimits } from "@/features/media/keys";
import { dashboard } from "@/messages/es-MX/dashboard";
import { reportPriorityLabels, reportStatusLabels } from "@/messages/es-MX/enums";

import { reportPriorities } from "../../enums";
import { TRIAGE_COMMENT_MAX_LENGTH, TRIAGE_NOTE_MAX_LENGTH } from "../../schema";
import {
  addComment,
  assign,
  deleteReport,
  markDuplicate,
  resolve,
  setPriority,
  updateReportStatus,
} from "../../staff-actions";

import type { ReportPriority, ReportStatus } from "../../enums";
import type { TriageActionState } from "../../staff-actions";

const copy = dashboard.reports.detail;

function Feedback({ state, pending }: { state: TriageActionState; pending: boolean }) {
  let message: string | undefined;
  if (pending) message = copy.pending;
  else if (state.error) message = state.error;
  else if (state.ok) message = copy.saved;
  return (
    <output
      aria-live="polite"
      className={state.error ? "report-error text-sm" : "text-sm text-muted"}
    >
      {message}
    </output>
  );
}

function ReportIdField({ reportId }: { reportId: string }) {
  return <input type="hidden" name="reportId" value={reportId} />;
}

export function StatusForm({
  reportId,
  transitions,
}: {
  reportId: string;
  transitions: ReportStatus[];
}) {
  const [state, action, pending] = useActionState(updateReportStatus, {});
  const options = transitions.filter((status) => status !== "resolved" && status !== "duplicate");
  if (options.length === 0) return <p className="text-sm text-muted">{copy.noTransitions}</p>;

  return (
    <form action={action} className="grid gap-3">
      <ReportIdField reportId={reportId} />
      <label className="staff-field">
        {copy.statusTarget}
        <select className="staff-input" name="status" defaultValue={options[0]}>
          {options.map((status) => (
            <option key={status} value={status}>
              {reportStatusLabels[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="staff-field">
        {copy.statusNote}
        <textarea
          className="staff-input"
          name="note"
          rows={2}
          maxLength={TRIAGE_NOTE_MAX_LENGTH}
          aria-describedby="status-note-hint"
        />
      </label>
      <p id="status-note-hint" className="text-sm text-muted">
        {copy.statusNoteHint}
      </p>
      <Feedback state={state} pending={pending} />
      <button
        className="button button--primary justify-self-start"
        disabled={pending}
        type="submit"
      >
        {copy.applyStatus}
      </button>
    </form>
  );
}

export function PriorityForm({
  reportId,
  priority,
}: {
  reportId: string;
  priority: ReportPriority;
}) {
  const [state, action, pending] = useActionState(setPriority, {});
  return (
    <form action={action} className="grid gap-3">
      <ReportIdField reportId={reportId} />
      <label className="staff-field">
        {copy.priority}
        <select className="staff-input" name="priority" defaultValue={priority}>
          {reportPriorities.map((value) => (
            <option key={value} value={value}>
              {reportPriorityLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <Feedback state={state} pending={pending} />
      <button
        className="button button--secondary justify-self-start"
        disabled={pending}
        type="submit"
      >
        {copy.savePriority}
      </button>
    </form>
  );
}

export function AssignForm({
  reportId,
  assigneeId,
  staff,
}: {
  reportId: string;
  assigneeId: string | null;
  staff: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(assign, {});
  return (
    <form action={action} className="grid gap-3">
      <ReportIdField reportId={reportId} />
      <label className="staff-field">
        {copy.assignee}
        <select className="staff-input" name="assigneeId" defaultValue={assigneeId ?? ""}>
          <option value="">{dashboard.reports.unassigned}</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>
      <Feedback state={state} pending={pending} />
      <button
        className="button button--secondary justify-self-start"
        disabled={pending}
        type="submit"
      >
        {copy.saveAssignee}
      </button>
    </form>
  );
}

export function DuplicateForm({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState(markDuplicate, {});
  return (
    <form action={action} className="grid gap-3">
      <ReportIdField reportId={reportId} />
      <label className="staff-field">
        {copy.duplicateNumber}
        <input
          className="staff-input font-mono"
          name="targetNumber"
          inputMode="numeric"
          pattern="[0-9]+"
          required
          aria-describedby="duplicate-hint"
        />
      </label>
      <p id="duplicate-hint" className="text-sm text-muted">
        {copy.duplicateHint}
      </p>
      <Feedback state={state} pending={pending} />
      <button
        className="button button--secondary justify-self-start"
        disabled={pending}
        type="submit"
      >
        {copy.applyDuplicate}
      </button>
    </form>
  );
}

export function ResolveForm({
  reportId,
  uploadsEnabled,
}: {
  reportId: string;
  uploadsEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(resolve, {});
  const [uploading, setUploading] = useState(false);
  const photoTarget = useMemo(() => ({ scope: "report_after" as const, reportId }), [reportId]);
  return (
    <form action={action} className="grid gap-3">
      <ReportIdField reportId={reportId} />
      <label className="staff-field">
        {copy.resolveNote}
        <textarea
          className="staff-input"
          name="note"
          rows={3}
          required
          maxLength={TRIAGE_NOTE_MAX_LENGTH}
          aria-describedby="resolve-hint"
        />
      </label>
      <p id="resolve-hint" className="text-sm text-muted">
        {copy.resolveHint}
      </p>
      {uploadsEnabled && (
        <PhotoPicker
          target={photoTarget}
          max={mediaLimits.report_after}
          name="afterMediaIds"
          onBusyChange={setUploading}
        />
      )}
      <Feedback state={state} pending={pending} />
      <button
        className="button button--primary justify-self-start"
        disabled={pending || uploading}
        type="submit"
      >
        {copy.applyResolve}
      </button>
    </form>
  );
}

export function CommentForm({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState(addComment, {});
  return (
    <form action={action} className="grid gap-3">
      <ReportIdField reportId={reportId} />
      <label className="staff-field">
        {copy.comment}
        <textarea
          className="staff-input"
          name="body"
          rows={2}
          required
          maxLength={TRIAGE_COMMENT_MAX_LENGTH}
        />
      </label>
      <Feedback state={state} pending={pending} />
      <button
        className="button button--secondary justify-self-start"
        disabled={pending}
        type="submit"
      >
        {copy.addComment}
      </button>
    </form>
  );
}

export function DeleteReportForm({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState(deleteReport, {});
  return (
    <form action={action} className="grid gap-3">
      <ReportIdField reportId={reportId} />
      <p className="text-sm text-muted">{copy.deleteHint}</p>
      <label className="inline-flex min-h-8 items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" required />
        {copy.deleteConfirm}
      </label>
      <Feedback state={state} pending={pending} />
      <button className="button button--danger justify-self-start" disabled={pending} type="submit">
        {copy.delete}
      </button>
    </form>
  );
}
