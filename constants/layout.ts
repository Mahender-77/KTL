// constants/layout.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for screen layout spacing.
// Import from here in every component so widths never go out of sync.
// ─────────────────────────────────────────────────────────────────────────────

import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/** Horizontal padding applied to every full-width screen section */
export const SCREEN_PADDING = 16;

/** Gap between the two product cards in a row */
export const CARD_GAP = 10;

/** Width of each product card — fits 2 per row with SCREEN_PADDING on both sides */
export const CARD_WIDTH =
  (SCREEN_WIDTH - SCREEN_PADDING * 2 - CARD_GAP) / 2;