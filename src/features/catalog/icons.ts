import {
  AirVent,
  Armchair,
  CircleQuestionMark,
  DropletOff,
  Droplets,
  LightbulbOff,
  Scroll,
  Trash2,
  TreeDeciduous,
} from "lucide-react";

import type { initialCategories } from "@/messages/es-MX/catalog";
import type { LucideIcon } from "lucide-react";

export const categoryIcons = {
  "toilet-paper": Scroll,
  "droplet-off": DropletOff,
  droplets: Droplets,
  tree: TreeDeciduous,
  trash: Trash2,
  "lightbulb-off": LightbulbOff,
  armchair: Armchair,
  "air-vent": AirVent,
  "circle-help": CircleQuestionMark,
} as const satisfies Record<(typeof initialCategories)[number]["iconKey"], LucideIcon>;

export type CategoryIconKey = keyof typeof categoryIcons;

export function isCategoryIconKey(value: string): value is CategoryIconKey {
  return Object.hasOwn(categoryIcons, value);
}
