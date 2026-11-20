"use client";

import { useActionState } from "react";

import { adoption } from "@/messages/es-MX/adoption";
import { petStatusLabels, requestStatusLabels } from "@/messages/es-MX/enums";

import { posterSubmitStory, posterUpdateRequest, posterUpdateStatus } from "../actions";
import { requestStatuses } from "../enums";
import { PET_STORY_MAX_LENGTH } from "../schema";

import type { ManageState } from "../actions";
import type { PetStatus, RequestStatus } from "../enums";

const copy = adoption.manage;

function Feedback({ state, pending }: { state: ManageState; pending: boolean }) {
  let message: string | undefined;
  if (pending) message = adoption.staff.pending;
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

export function PosterStatusForm({
  token,
  transitions,
}: {
  token: string;
  transitions: PetStatus[];
}) {
  const [state, action, pending] = useActionState(posterUpdateStatus.bind(null, token), {});
  if (transitions.length === 0) return <p className="text-sm text-muted">{copy.noTransitions}</p>;
  return (
    <form action={action} className="grid gap-3">
      <label className="report-field">
        {copy.newStatus}
        <select className="report-input" defaultValue={transitions[0]} name="status">
          {transitions.map((status) => (
            <option key={status} value={status}>
              {petStatusLabels[status]}
            </option>
          ))}
        </select>
      </label>
      <Feedback pending={pending} state={state} />
      <button
        className="button button--primary justify-self-start"
        disabled={pending}
        type="submit"
      >
        {copy.save}
      </button>
    </form>
  );
}

export function PosterStoryForm({ token, story }: { token: string; story: string | null }) {
  const [state, action, pending] = useActionState(posterSubmitStory.bind(null, token), {});
  return (
    <form action={action} className="grid gap-3">
      <label className="report-field">
        {copy.successStory}
        <textarea
          className="report-input"
          defaultValue={story ?? ""}
          maxLength={PET_STORY_MAX_LENGTH}
          name="successStory"
          required
          rows={4}
        />
      </label>
      <p className="text-sm text-muted">{copy.successStoryHint}</p>
      <Feedback pending={pending} state={state} />
      <button
        className="button button--secondary justify-self-start"
        disabled={pending}
        type="submit"
      >
        {copy.saveStory}
      </button>
    </form>
  );
}

export function PosterRequestForm({
  token,
  requestId,
  status,
}: {
  token: string;
  requestId: string;
  status: RequestStatus;
}) {
  const [state, action, pending] = useActionState(posterUpdateRequest.bind(null, token), {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input name="requestId" type="hidden" value={requestId} />
      <label className="report-field">
        {copy.requestStatus}
        <select className="report-input" defaultValue={status} name="status">
          {requestStatuses.map((value) => (
            <option key={value} value={value}>
              {requestStatusLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <button className="button button--secondary" disabled={pending} type="submit">
        {copy.updateRequest}
      </button>
      <Feedback pending={pending} state={state} />
    </form>
  );
}
