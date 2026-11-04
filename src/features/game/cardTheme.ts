/**
 * Visual theme for the card faces: shape classes, palette values, and the
 * locale keys for accessible names. Shared by the board and by static card
 * examples (e.g. the Rules screen). Values are indices into the three
 * attribute domains — see `src/domain/cards.ts`.
 */
import type { AttributeKey, Card } from "../../domain/cards";
import type { CatalogKey } from "../../i18n/index";

export const SHAPE_CLASSES = ["circle", "triangle", "square"] as const;
export const SHAPE_KEYS: readonly CatalogKey[] = ["shapeCircle", "shapeTriangle", "shapeSquare"];
export const SHAPE_COLORS = ["#F07872", "#62A9E8", "#F0C75E"] as const;
export const SHAPE_COLOR_KEYS: readonly CatalogKey[] = ["colorCoral", "colorBlue", "colorYellow"];
export const BACKGROUNDS = ["#F5F7FB", "#A8B4C5", "#343C4B"] as const;
export const BACKGROUND_KEYS: readonly CatalogKey[] = [
  "backgroundLight",
  "backgroundSlate",
  "backgroundDark",
];

export const ATTRIBUTE_NAME_KEYS: Record<AttributeKey, CatalogKey> = {
  s: "attributeShape",
  c: "attributeShapeColor",
  b: "attributeBackground",
};

export interface CardVisualStyle {
  "--card-background": string;
  "--shape-color": string;
}

export function cardVisualStyle(card: Card): CardVisualStyle {
  return {
    "--card-background": BACKGROUNDS[card.b]!,
    "--shape-color": SHAPE_COLORS[card.c]!,
  };
}
