// constants/layout.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for screen layout spacing.
// Use useLayout() in components for values that must adapt to screen size/orientation.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Dimensions, useWindowDimensions } from "react-native";

const { width: INITIAL_WIDTH } = Dimensions.get("window");

/** Horizontal padding applied to every full-width screen section */
export const SCREEN_PADDING = 16;

/** Gap between the two product cards in a row */
export const CARD_GAP = 10;

/** Width of each product card — fits 2 per row (initial value; use useLayout() for reactive) */
export const CARD_WIDTH =
  (INITIAL_WIDTH - SCREEN_PADDING * 2 - CARD_GAP) / 2;

/** Base height for product cards; use useLayout() for responsive cardHeight */
export const CARD_HEIGHT = 220;

/** Minimum card height so content doesn't get squashed on small screens */
export const CARD_HEIGHT_MIN = 180;

/**
 * Hook for responsive layout values. Use in screens/components so layout
 * adapts to different screen sizes and orientation changes.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return useMemo(() => {
    const cardWidth = (width - SCREEN_PADDING * 2 - CARD_GAP) / 2;
    const cardHeight = Math.max(
      CARD_HEIGHT_MIN,
      Math.min(CARD_HEIGHT, cardWidth * 1.15)
    );
    return {
      width,
      height,
      cardWidth,
      cardHeight,
      screenPadding: SCREEN_PADDING,
      cardGap: CARD_GAP,
    };
  }, [width, height]);
}