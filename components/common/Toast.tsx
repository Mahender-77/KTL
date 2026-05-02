import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  type TextStyle,
} from "react-native";
import { useCallback, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import type { ToastVariant } from "@/constants/feedback";

const { width } = Dimensions.get("window");

const messageText: TextStyle = {
  flex: 1,
  fontSize: 14,
  fontWeight: "600",
  color: colors.textPrimary,
  lineHeight: 20,
};

const titleText: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
  color: colors.textPrimary,
  marginBottom: 4,
};

const actionLabelText: TextStyle = {
  color: "#fff",
  fontSize: 13,
  fontWeight: "700",
};

const secondaryLabelText: TextStyle = {
  color: colors.textSecondary,
  fontSize: 13,
  fontWeight: "700",
};

function variantIcon(variant: ToastVariant): keyof typeof Ionicons.glyphMap {
  switch (variant) {
    case "success":
      return "checkmark-circle";
    case "error":
      return "close-circle";
    case "warning":
      return "warning";
    case "info":
    default:
      return "information-circle";
  }
}

function variantIconColor(variant: ToastVariant): string {
  switch (variant) {
    case "success":
      return colors.success;
    case "error":
      return colors.error;
    case "warning":
      return colors.warning;
    case "info":
    default:
      return colors.primary;
  }
}

interface ToastProps {
  visible: boolean;
  variant?: ToastVariant;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onDismiss?: () => void;
  duration?: number;
}

export default function Toast({
  visible,
  variant = "success",
  title,
  message,
  actionLabel = "OK",
  onAction,
  secondaryLabel,
  onSecondary,
  onDismiss,
  duration = 5000,
}: ToastProps) {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  }, [onDismiss, opacityAnim, slideAnim]);

  useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const hasActions = Boolean(onAction && actionLabel) || Boolean(secondaryLabel);
    const ms = hasActions ? Math.max(duration, 6000) : duration;
    const timer = setTimeout(() => {
      hideToast();
    }, ms);

    return () => clearTimeout(timer);
  }, [
    visible,
    duration,
    hideToast,
    slideAnim,
    opacityAnim,
    onAction,
    actionLabel,
    secondaryLabel,
  ]);

  const iconName = variantIcon(variant);
  const iconColor = variantIconColor(variant);
  const showPrimary = Boolean(onAction && actionLabel);
  const showSecondary = Boolean(secondaryLabel);
  const actionsRow = showPrimary || showSecondary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={hideToast}
    >
      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.toast,
            {
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={styles.mainRow}>
            <View style={styles.content}>
              <View style={[styles.iconWrap, { borderColor: colors.divider }]}>
                <Ionicons name={iconName} size={22} color={iconColor} />
              </View>
              <View style={styles.textCol}>
                {title ? <Text style={titleText}>{title}</Text> : null}
                <Text style={messageText} numberOfLines={4}>
                  {message}
                </Text>
              </View>
            </View>
            {actionsRow && !showSecondary ? (
              showPrimary ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    onAction?.();
                    hideToast();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={actionLabelText}>{actionLabel}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </TouchableOpacity>
              ) : null
            ) : null}
          </View>
          {actionsRow && showSecondary ? (
            <View style={styles.dualActions}>
              {showSecondary ? (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    onSecondary?.();
                    hideToast();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={secondaryLabelText}>{secondaryLabel}</Text>
                </TouchableOpacity>
              ) : null}
              {showPrimary ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.dualActionFlex]}
                  onPress={() => {
                    onAction?.();
                    hideToast();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={actionLabelText}>{actionLabel}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 20,
    backgroundColor: "transparent",
  },
  toast: {
    width: width - SCREEN_PADDING * 2,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    marginRight: 12,
    minWidth: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    marginRight: 10,
  },
  dualActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  dualActionFlex: {
    flex: 1,
    justifyContent: "center",
  },
});
