import type { ReportPriority } from "@/features/reports/enums";

export const initialCategories = [
  {
    slug: "restroom-paper",
    name: "Baño sin papel",
    iconKey: "toilet-paper",
    defaultPriority: "normal",
  },
  {
    slug: "restroom-water",
    name: "Baño sin agua",
    iconKey: "droplet-off",
    defaultPriority: "high",
  },
  { slug: "water-leak", name: "Fuga de agua", iconKey: "droplets", defaultPriority: "high" },
  { slug: "drying-tree", name: "Árbol secándose", iconKey: "tree", defaultPriority: "normal" },
  {
    slug: "full-bins",
    name: "Botes de basura llenos",
    iconKey: "trash",
    defaultPriority: "normal",
  },
  {
    slug: "broken-light",
    name: "Luminaria fundida",
    iconKey: "lightbulb-off",
    defaultPriority: "normal",
  },
  {
    slug: "damaged-furniture",
    name: "Mobiliario dañado",
    iconKey: "armchair",
    defaultPriority: "normal",
  },
  { slug: "other", name: "Otro", iconKey: "circle-help", defaultPriority: "normal" },
] as const satisfies readonly {
  slug: string;
  name: string;
  iconKey: string;
  defaultPriority: ReportPriority;
}[];

export const initialBuildings = [
  { slug: "building-a", name: "Edificio A", shortName: "Edificio A" },
  { slug: "library", name: "Biblioteca", shortName: "Biblioteca" },
  { slug: "cafeteria", name: "Cafetería", shortName: "Cafetería" },
  { slug: "courts", name: "Canchas", shortName: "Canchas" },
  { slug: "parking", name: "Estacionamiento", shortName: "Estacionamiento" },
] as const;
