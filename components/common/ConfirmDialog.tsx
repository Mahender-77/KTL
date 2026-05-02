import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  type TextStyle,
} from "react-native";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";

const titleStyle: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.textPrimary,
  marginBottom: 8,
};

const bodyStyle: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.textMuted,
  lineHeight: 21,
};

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={titleStyle}>{title}</Text>
          <Text style={bodyStyle}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, destructive && styles.confirmBtnDestructive]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(31, 42, 22, 0.45)",
    justifyContent: "center",
    paddingHorizontal: SCREEN_PADDING,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 22,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  confirmBtn: {
    marginLeft: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.primary,
    minWidth: 96,
    alignItems: "center",
  },
  confirmBtnDestructive: {
    backgroundColor: colors.error,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
