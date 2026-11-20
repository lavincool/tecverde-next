import { adoption } from "@/messages/es-MX/adoption";
import {
  campusRelationshipLabels,
  housingTypeLabels,
  requestStatusLabels,
} from "@/messages/es-MX/enums";

import { PosterRequestForm } from "./manage-forms";
import { StaffRequestForm } from "./staff-forms";

import type { RequestSummary } from "../repository";

const copy = adoption.manage;
const formatDate = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Matamoros",
});

/** Shows requester contact data. Render only on the poster's capability page or to staff. */
export function RequestList({
  requests,
  posterToken,
  staffPetId,
  staffCanUpdate = false,
}: {
  requests: RequestSummary[];
  posterToken?: string;
  staffPetId?: string;
  staffCanUpdate?: boolean;
}) {
  if (requests.length === 0) return <p className="text-muted">{copy.noRequests}</p>;
  return (
    <ul className="grid gap-3">
      {requests.map((request) => (
        <li className="grid gap-3 rounded-2xl border border-line p-4" key={request.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">{request.fullName}</p>
            <p className="text-sm text-muted">{requestStatusLabels[request.status]}</p>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">{copy.contact}</dt>
              <dd className="break-all">
                {request.email && (
                  <a className="underline" href={`mailto:${request.email}`}>
                    {request.email}
                  </a>
                )}
                {request.phone && <span className="block">{request.phone}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{adoption.request.campusRelationship}</dt>
              <dd>{campusRelationshipLabels[request.campusRelationship]}</dd>
            </div>
            <div>
              <dt className="text-muted">{adoption.request.housingType}</dt>
              <dd>{housingTypeLabels[request.housingType]}</dd>
            </div>
            <div>
              <dt className="text-muted">{copy.otherPets}</dt>
              <dd>{request.hasOtherPets ? adoption.request.yes : adoption.request.no}</dd>
            </div>
            <div>
              <dt className="text-muted">{copy.experience}</dt>
              <dd>{request.hasExperience ? adoption.request.yes : adoption.request.no}</dd>
            </div>
            <div>
              <dt className="text-muted">{copy.received}</dt>
              <dd className="font-mono">
                <time dateTime={request.createdAt.toISOString()}>
                  {formatDate.format(request.createdAt)}
                </time>
              </dd>
            </div>
          </dl>
          <div className="grid gap-1 text-sm">
            <p className="text-muted">{copy.motivation}</p>
            <p className="leading-relaxed whitespace-pre-wrap">{request.motivation}</p>
          </div>
          {posterToken && (
            <PosterRequestForm requestId={request.id} status={request.status} token={posterToken} />
          )}
          {staffPetId && staffCanUpdate && request.emailVerifiedAt && (
            <StaffRequestForm
              petId={staffPetId}
              requestId={request.id}
              staffNotes={request.staffNotes}
              status={request.status}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
