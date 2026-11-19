"use client";

import { Chip } from "@heroui/react";
import { Archive, Check, Circle, Clock, Copy, Search, X } from "lucide-react";

import { petStatusLabels, reportStatusLabels } from "@/messages/es-MX/enums";

import type { PetStatus } from "@/features/adoption/enums";
import type { ReportStatus } from "@/features/reports/enums";

const reportIcons = {
  open: Circle,
  in_review: Search,
  in_progress: Clock,
  resolved: Check,
  dismissed: X,
  duplicate: Copy,
} as const;

const petIcons = {
  pending_approval: Clock,
  available: Circle,
  in_process: Search,
  adopted: Check,
  archived: Archive,
} as const;

export function StatusChip(
  props: { domain: "report"; status: ReportStatus } | { domain: "pet"; status: PetStatus },
) {
  const Icon = props.domain === "report" ? reportIcons[props.status] : petIcons[props.status];
  const label =
    props.domain === "report" ? reportStatusLabels[props.status] : petStatusLabels[props.status];
  const complete = props.status === "resolved" || props.status === "adopted";

  return (
    <Chip size="sm" variant="soft" color={complete ? "success" : "default"} className="gap-1.5">
      <Icon aria-hidden="true" size={13} />
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}
