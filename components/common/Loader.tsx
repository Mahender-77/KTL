// components/common/Loader.tsx
import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { colors } from "@/constants/colors";

type Props = {
  variant?: "fullscreen" | "inline";
  message?: string;
};

export default function Loader({ variant = "fullscreen", message = "Loading..." }: Props) {

  const spinAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const dot1      = useRef(new Animated.Value(0)).current;
  const dot2      = useRef(new Animated.Value(0)).current;
  const dot3      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Arc spin
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue:         1,
        duration:        1400,
        easing:          Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Leaf breathe
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.12, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1,    duration: 800, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
      ])
    ).start();

    // Staggered dots
    const bounce = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -6, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0,  duration: 300, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
          Animated.delay(700),
        ])
      );

    bounce(dot1, 0).start();
    bounce(dot2, 140).start();
    bounce(dot3, 280).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const content = (
    <View style={styles.inner}>

      {/* ── Spinner + Leaf ── */}
      <View style={styles.spinnerWrap}>

        {/* Static grey track */}
        <View style={styles.track} />

        {/* Spinning green arc */}
        <Animated.View style={[styles.arc, { transform: [{ rotate: spin }] }]} />

        {/* Center leaf circle */}
        <Animated.View style={[styles.leafCircle, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.leaf}>
            <View style={styles.vein} />
          </View>
        </Animated.View>

      </View>

      {/* ── KTL label ── */}
      <Text style={styles.brand}>KTL</Text>

      {/* ── Bouncing dots ── */}
      <View style={styles.dotsRow}>
        {[dot1, dot2, dot3].map((d, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              i === 1 && styles.dotCenter,
              { transform: [{ translateY: d }] },
            ]}
          />
        ))}
      </View>

      {/* ── Message ── */}
      {message ? <Text style={styles.message}>{message}</Text> : null}

    </View>
  );

  if (variant === "inline") {
    return <View style={styles.inline}>{content}</View>;
  }

  return <View style={styles.fullscreen}>{content}</View>;
}

// ─── Sizes ────────────────────────────────────────────────────────────────────

const CIRCLE = 64;
const RING   = 92;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Containers ──
  fullscreen: {
    position:        "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex:          9999,
    backgroundColor: "rgba(255,255,255,0.97)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  inline: {
    paddingVertical: 48,
    alignItems:      "center",
    justifyContent:  "center",
  },
  inner: {
    alignItems: "center",
  },

  // ── Spinner ──
  spinnerWrap: {
    width:          RING,
    height:         RING,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   12,
  },
  track: {
    position:     "absolute",
    width:        RING,
    height:       RING,
    borderRadius: RING / 2,
    borderWidth:  3,
    borderColor:  "#E6EFE6",
  },
  arc: {
    position:          "absolute",
    width:             RING,
    height:            RING,
    borderRadius:      RING / 2,
    borderWidth:       3,
    borderColor:       "transparent",
    borderTopColor:    colors.primary,
    borderRightColor:  colors.primary,
    borderBottomColor: colors.primaryLight,
  },

  // ── Center leaf ──
  leafCircle: {
    width:           CIRCLE,
    height:          CIRCLE,
    borderRadius:    CIRCLE / 2,
    backgroundColor: colors.primary,
    alignItems:      "center",
    justifyContent:  "center",
    shadowColor:     colors.primaryDark,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.22,
    shadowRadius:    8,
    elevation:       6,
  },
  leaf: {
    width:                   26,
    height:                  30,
    borderTopRightRadius:    26,
    borderBottomLeftRadius:  26,
    borderTopLeftRadius:     4,
    borderBottomRightRadius: 4,
    backgroundColor:         "rgba(255,255,255,0.88)",
    alignItems:              "center",
    justifyContent:          "center",
    transform:               [{ rotate: "15deg" }],
    overflow:                "hidden",
  },
  vein: {
    width:           1.5,
    height:          20,
    backgroundColor: colors.primary,
    borderRadius:    2,
    opacity:         0.55,
  },

  // ── Brand ──
  brand: {
    fontSize:      18,
    fontWeight:    "900",
    color:         colors.primaryDark,
    letterSpacing: 5,
    marginBottom:  10,
  },

  // ── Dots ──
  dotsRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           7,
    marginBottom:  8,
  },
  dot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: colors.primaryLight,
  },
  dotCenter: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: colors.primary,
  },

  // ── Message ──
  message: {
    fontSize:      12,
    fontWeight:    "600",
    color:         colors.primary,
    letterSpacing: 0.3,
    opacity:       0.75,
  },
});