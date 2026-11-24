import { CircleQuestionMark } from "lucide-react";

import { categoryIcons, isCategoryIconKey } from "./icons";

export function CategoryIcon({
  iconKey,
  size = 18,
  strokeWidth = 1.8,
}: {
  iconKey: string;
  size?: number;
  strokeWidth?: number;
}) {
  const Icon = isCategoryIconKey(iconKey) ? categoryIcons[iconKey] : CircleQuestionMark;
  return <Icon aria-hidden="true" size={size} strokeWidth={strokeWidth} />;
}
