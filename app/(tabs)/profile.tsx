// app/(tabs)/profile.tsx
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import { useAuth } from "@/context/AuthContext";

// ── Menu Row ──────────────────────────────────────────────────────────────────

function MenuRow({
  icon,
  label,
  sublabel,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.menuRowIcon, danger && styles.menuRowIconDanger]}>
        <Ionicons
          name={icon as never}
          size={18}
          color={danger ? colors.error : colors.primary}
        />
      </View>
      <View style={styles.menuRowContent}>
        <Text style={[styles.menuRowLabel, danger && styles.menuRowLabelDanger]}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={styles.menuRowSub}>{sublabel}</Text>
        ) : null}
      </View>
      {onPress && !danger ? (
        <Ionicons name="chevron-forward" size={16} color="#C8CDD6" />
      ) : null}
    </TouchableOpacity>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1923" translucent={false} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerLabel}>Profile</Text>

        {/* Avatar + name */}
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.name ?? "Guest"}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email ?? "Not signed in"}
            </Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Quick stats ── */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/orders" as never)}
            activeOpacity={0.8}
          >
            <View style={styles.statIconWrap}>
              <Ionicons name="receipt" size={18} color={colors.primary} />
            </View>
            <Text style={styles.statLabel}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/(tabs)/wishlist" as never)}
            activeOpacity={0.8}
          >
            <View style={styles.statIconWrap}>
              <Ionicons name="heart" size={18} color="#EF4444" />
            </View>
            <Text style={styles.statLabel}>Wishlist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/(tabs)/cart" as never)}
            activeOpacity={0.8}
          >
            <View style={styles.statIconWrap}>
              <Ionicons name="cart" size={18} color={colors.primary} />
            </View>
            <Text style={styles.statLabel}>Cart</Text>
          </TouchableOpacity>
        </View>

        {/* ── Shop ── */}
        <Section>
          <Text style={styles.sectionTitle}>Shop</Text>
          <MenuRow
            icon="receipt-outline"
            label="My Orders"
            sublabel="Track and view past orders"
            onPress={() => router.push("/orders" as never)}
          />
          <MenuRow
            icon="heart-outline"
            label="Wishlist"
            sublabel="Items you've saved"
            onPress={() => router.push("/(tabs)/wishlist" as never)}
          />
          <MenuRow
            icon="grid-outline"
            label="All Products"
            sublabel="Browse the full catalogue"
            onPress={() => router.push("/(tabs)/products" as never)}
          />
        </Section>

        {/* ── Account ── */}
        <Section>
          <Text style={styles.sectionTitle}>Account</Text>
          <MenuRow
            icon="person-outline"
            label="Edit Profile"
            sublabel="Update your name and details"
            onPress={() => {}}
          />
          <MenuRow
            icon="location-outline"
            label="Saved Addresses"
            sublabel="Manage delivery addresses"
            onPress={() => {}}
          />
          <MenuRow
            icon="notifications-outline"
            label="Notifications"
            sublabel="Manage your alerts"
            onPress={() => {}}
          />
        </Section>

        {/* ── Logout ── */}
        <Section>
          <MenuRow
            icon="log-out-outline"
            label="Logout"
            danger
            onPress={async () => {
              try {
                await logout();
                setTimeout(() => router.replace("/(auth)/login" as never), 50);
              } catch {
                router.replace("/(auth)/login" as never);
              }
            }}
          />
        </Section>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <Ionicons name="leaf" size={13} color={colors.primary} />
            <Text style={styles.footerBrandText}>KTL Fresh</Text>
          </View>
          <Text style={styles.footerVersion}>v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4F6F9",
  },

  // ── Header ──
  header: {
    backgroundColor: "#0F1923",
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 20,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.5,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  profileEmail: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "500",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.success,
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 40,
    gap: 10,
  },

  // ── Stats row ──
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EAEDF2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  // ── Section ──
  section: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#EAEDF2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingTop: 14,
    paddingBottom: 8,
  },

  // ── Menu row ──
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: "#F4F6F9",
  },
  menuRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  menuRowIconDanger: {
    backgroundColor: "#FEF2F2",
  },
  menuRowContent: {
    flex: 1,
  },
  menuRowLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 1,
  },
  menuRowLabelDanger: {
    color: colors.error,
  },
  menuRowSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },

  // ── Footer ──
  footer: {
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    paddingBottom: 10,
  },
  footerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  footerBrandText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  footerVersion: {
    fontSize: 11,
    color: "#C8CDD6",
    fontWeight: "500",
  },
});