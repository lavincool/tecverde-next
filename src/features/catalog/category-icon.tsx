import {
  Armchair,
  CircleQuestionMark,
  DropletOff,
  Droplets,
  LightbulbOff,
  Scroll,
  Trash2,
  TreeDeciduous,
} from "lucide-react";

export function CategoryIcon({
  iconKey,
  size = 18,
  strokeWidth = 1.8,
}: {
  iconKey: string;
  size?: number;
  strokeWidth?: number;
}) {
  switch (iconKey) {
    case "toilet-paper":
      return <Scroll aria-hidden="true" size={size} strokeWidth={strokeWidth} />;
    case "droplet-off":
      return <DropletOff aria-hidden="true" size={size} strokeWidth={strokeWidth} />;
    case "droplets":
      return <Droplets aria-hidden="true" size={size} strokeWidth={strokeWidth} />;
    case "tree":
      return <TreeDeciduous aria-hidden="true" size={size} strokeWidth={strokeWidth} />;
    case "trash":
      return <Trash2 aria-hidden="true" size={size} strokeWidth={strokeWidth} />;
    case "lightbulb-off":
      return <LightbulbOff aria-hidden="true" size={size} strokeWidth={strokeWidth} />;
    case "armchair":
      return <Armchair aria-hidden="true" size={size} strokeWidth={strokeWidth} />;
    default:
      return <CircleQuestionMark aria-hidden="true" size={size} strokeWidth={strokeWidth} />;
  }
}
