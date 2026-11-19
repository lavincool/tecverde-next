import type {
  AgeGroup,
  CampusRelationship,
  HealthState,
  HousingType,
  PetStatus,
  RequestStatus,
  Sex,
  Size,
  Species,
  Temperament,
} from "@/features/adoption/enums";
import type { ReportPriority, ReportStatus } from "@/features/reports/enums";
import type { StaffRole } from "@/features/staff/enums";

export const reportStatusLabels = {
  open: "Abierto",
  in_review: "En revisión",
  in_progress: "En proceso",
  resolved: "Resuelto",
  dismissed: "Descartado",
  duplicate: "Duplicado",
} as const satisfies Record<ReportStatus, string>;

export const reportPriorityLabels = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
} as const satisfies Record<ReportPriority, string>;

export const petStatusLabels = {
  pending_approval: "Pendiente de aprobación",
  available: "Disponible",
  in_process: "En proceso",
  adopted: "Adoptado",
  archived: "Archivado",
} as const satisfies Record<PetStatus, string>;

export const speciesLabels = { dog: "Perro", cat: "Gato", other: "Otro" } as const satisfies Record<
  Species,
  string
>;
export const sexLabels = {
  male: "Macho",
  female: "Hembra",
  unknown: "Sin identificar",
} as const satisfies Record<Sex, string>;
export const ageGroupLabels = {
  puppy: "Cachorro",
  young: "Joven",
  adult: "Adulto",
  senior: "Mayor",
} as const satisfies Record<AgeGroup, string>;
export const sizeLabels = {
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
} as const satisfies Record<Size, string>;
export const healthStateLabels = {
  yes: "Sí",
  no: "No",
  unknown: "Sin confirmar",
} as const satisfies Record<HealthState, string>;
export const requestStatusLabels = {
  pending: "Pendiente",
  in_review: "En revisión",
  accepted: "Aceptada",
  declined: "Rechazada",
  withdrawn: "Retirada",
} as const satisfies Record<RequestStatus, string>;
export const campusRelationshipLabels = {
  student: "Estudiante",
  teacher: "Docente",
  staff: "Personal",
  external: "Comunidad externa",
} as const satisfies Record<CampusRelationship, string>;
export const housingTypeLabels = {
  house: "Casa",
  apartment: "Departamento",
  other: "Otro",
} as const satisfies Record<HousingType, string>;
export const temperamentLabels = {
  calm: "Tranquilo",
  playful: "Juguetón",
  shy: "Tímido",
  sociable: "Sociable",
  active: "Activo",
} as const satisfies Record<Temperament, string>;
export const staffRoleLabels = {
  admin: "Administración",
  maintenance: "Mantenimiento",
  moderator: "Moderación",
} as const satisfies Record<StaffRole, string>;
