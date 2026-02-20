// app/(auth)/login.tsx
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";


export default function Login() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }
    try {
      setLoading(true);
      await login(email, password);
      
      // Check user role and route accordingly
      const userRes = await axiosInstance.get("/api/auth/me");
      const role = userRes.data.role || "user";
      
      if (role === "delivery") {
        router.replace("/(delivery)/dashboard");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      alert("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Top green wave area ── */}
        <View style={styles.topSection}>
          <View style={styles.blob1} />
          <View style={styles.blob2} />

          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="leaf" size={36} color={colors.card} />
            </View>
            <Text style={styles.logoText}>KTL</Text>
            <Text style={styles.logoSub}>Fresh · Natural · Delivered</Text>
          </View>
        </View>

        {/* ── Form card ── */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue shopping</Text>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputRow, focusedField === "email" && styles.inputFocused]}>
              <Ionicons name="mail-outline" size={18} color={focusedField === "email" ? colors.primary : colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.disabled}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputRow, focusedField === "password" && styles.inputFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={focusedField === "password" ? colors.primary : colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.disabled}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <>
                <Text style={styles.btnText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.card} />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register link */}
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => router.push("/register")}
            activeOpacity={0.85}
          >
            <Text style={styles.outlineBtnText}>Create an Account</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom note */}
        <Text style={styles.bottomNote}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },

  // Top green section
  topSection: {
    backgroundColor: colors.primaryDark,
    height: 260,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
    overflow: "hidden",
    position: "relative",
  },
  blob1: {
    position: "absolute", width: 200, height: 200,
    borderRadius: 100, backgroundColor: colors.primary,
    opacity: 0.4, top: -60, right: -40,
  },
  blob2: {
    position: "absolute", width: 140, height: 140,
    borderRadius: 70, backgroundColor: colors.primaryLight,
    opacity: 0.2, bottom: -30, left: -20,
  },
  logoWrap: { alignItems: "center", gap: 8 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
  },
  logoText: {
    fontSize: 32, fontWeight: "900", color: "#fff", letterSpacing: 4,
  },
  logoSub: {
    fontSize: 11, color: "rgba(255,255,255,0.65)",
    letterSpacing: 1.5, fontWeight: "500",
  },

  // Form card
  card: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    flex: 1,
  },
  title: {
    fontSize: 26, fontWeight: "800",
    color: colors.textPrimary, letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13, color: colors.textMuted,
    marginTop: 4, marginBottom: 28, fontWeight: "400",
  },

  // Fields
  fieldWrap: { marginBottom: 16 },
  label: {
    fontSize: 12, fontWeight: "700",
    color: colors.textSecondary, marginBottom: 6, letterSpacing: 0.4,
  },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, backgroundColor: colors.surface,
    paddingHorizontal: 12, height: 50,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1, fontSize: 14,
    color: colors.textPrimary, fontWeight: "400",
  },
  eyeBtn: { padding: 4 },

  // Buttons
  btn: {
    backgroundColor: colors.primary,
    height: 52, borderRadius: 14,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: colors.card, fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },

  dividerRow: {
    flexDirection: "row", alignItems: "center",
    gap: 10, marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerText: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },

  outlineBtn: {
    height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  outlineBtnText: { color: colors.primary, fontSize: 15, fontWeight: "700" },

  bottomNote: {
    textAlign: "center", fontSize: 10,
    color: colors.textMuted, paddingVertical: 16,
    paddingHorizontal: 24, backgroundColor: colors.card,
  },
});