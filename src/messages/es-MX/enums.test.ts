import { expect, test } from "bun:test";

import {
  ageGroups,
  campusRelationships,
  healthStates,
  housingTypes,
  petStatuses,
  requestStatuses,
  sexes,
  sizes,
  species,
  temperaments,
} from "@/features/adoption/enums";
import { reportPriorities, reportStatuses } from "@/features/reports/enums";
import { staffRoles } from "@/features/staff/enums";

import {
  ageGroupLabels,
  campusRelationshipLabels,
  healthStateLabels,
  housingTypeLabels,
  petStatusLabels,
  reportPriorityLabels,
  reportStatusLabels,
  requestStatusLabels,
  sexLabels,
  sizeLabels,
  speciesLabels,
  staffRoleLabels,
  temperamentLabels,
} from "./enums";

test.each([
  [reportStatuses, reportStatusLabels],
  [reportPriorities, reportPriorityLabels],
  [petStatuses, petStatusLabels],
  [species, speciesLabels],
  [sexes, sexLabels],
  [ageGroups, ageGroupLabels],
  [sizes, sizeLabels],
  [healthStates, healthStateLabels],
  [requestStatuses, requestStatusLabels],
  [campusRelationships, campusRelationshipLabels],
  [housingTypes, housingTypeLabels],
  [temperaments, temperamentLabels],
  [staffRoles, staffRoleLabels],
] as const)("provides a Spanish label for each value in %j", (values, labels) => {
  expect(Object.keys(labels).toSorted()).toEqual([...values].toSorted());
  expect(Object.values(labels).every((label) => label.trim().length > 0)).toBe(true);
});
