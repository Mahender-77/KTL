// app/(auth)/register.tsx
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";

export default function Register() {
  const { register, logout } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("All fields are required");
      return;
    }
    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      await register(name, email, password);
      // Logout to clear auto-login, then redirect to login page
      await logout();
      router.replace("/(auth)/login");
    } catch (error: any) {
      alert(error.response?.data?.message || "Registration failed");
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
        {/* ── Top green section ── */}
        <View style={styles.topSection}>
          <View style={styles.blob1} />
          <View style={styles.blob2} />

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="person-add" size={32} color={colors.card} />
            </View>
            <Text style={styles.topTitle}>Create Account</Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={styles.topSub}>
                Already have an account?{" "}
                <Text style={{ color: "#fff", fontWeight: "700" }}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Form card ── */}
        <View style={styles.card}>

          {/* Full Name */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputRow, focusedField === "name" && styles.inputFocused]}>
              <Ionicons name="person-outline" size={18}
                color={focusedField === "name" ? colors.primary : colors.textMuted}
                style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor={colors.disabled}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputRow, focusedField === "email" && styles.inputFocused]}>
              <Ionicons name="mail-outline" size={18}
                color={focusedField === "email" ? colors.primary : colors.textMuted}
                style={styles.inputIcon} />
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
              <Ionicons name="lock-closed-outline" size={18}
                color={focusedField === "password" ? colors.primary : colors.textMuted}
                style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Min. 6 characters"
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

            {/* Password strength */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                {[1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          password.length >= i * 4
                            ? i === 1 ? colors.warning
                            : i === 2 ? colors.primaryLight
                            : colors.success
                            : colors.border,
                      },
                    ]}
                  />
                ))}
                <Text style={styles.strengthText}>
                  {password.length < 4 ? "Weak" : password.length < 8 ? "Good" : "Strong"}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[
              styles.inputRow,
              focusedField === "confirm" && styles.inputFocused,
              passwordsMatch && styles.inputSuccess,
              passwordsMismatch && styles.inputError,
            ]}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={
                  passwordsMatch ? colors.success
                  : passwordsMismatch ? colors.error
                  : focusedField === "confirm" ? colors.primary
                  : colors.textMuted
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.disabled}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocusedField("confirm")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Match feedback */}
            {passwordsMatch && (
              <View style={styles.matchRow}>
                <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                <Text style={[styles.matchText, { color: colors.success }]}>Passwords match</Text>
              </View>
            )}
            {passwordsMismatch && (
              <View style={styles.matchRow}>
                <Ionicons name="close-circle" size={13} color={colors.error} />
                <Text style={[styles.matchText, { color: colors.error }]}>Passwords do not match</Text>
              </View>
            )}
          </View>

          {/* Register button */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <>
                <Text style={styles.btnText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.card} />
              </>
            )}
          </TouchableOpacity>

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.bottomNote}>
          By registering, you agree to our Terms & Privacy Policy
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  topSection: {
    backgroundColor: colors.primaryDark,
    height: 240, justifyContent: "flex-end",
    alignItems: "center", paddingBottom: 40,
    overflow: "hidden", position: "relative",
  },
  blob1: {
    position: "absolute", width: 180, height: 180,
    borderRadius: 90, backgroundColor: colors.primary,
    opacity: 0.4, top: -50, right: -30,
  },
  blob2: {
    position: "absolute", width: 120, height: 120,
    borderRadius: 60, backgroundColor: colors.primaryLight,
    opacity: 0.2, bottom: -20, left: -10,
  },
  backBtn: {
    position: "absolute", top: 50, left: 20,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  logoWrap: { alignItems: "center", gap: 8 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
  },
  topTitle: { fontSize: 26, fontWeight: "900", color: "#fff", letterSpacing: -0.3 },
  topSub: { fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: 0.5 },
  card: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, paddingHorizontal: 24,
    paddingTop: 32, paddingBottom: 24, flex: 1,
  },
  fieldWrap: { marginBottom: 14 },
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
  inputFocused: { borderColor: colors.primary, backgroundColor: colors.card },
  inputSuccess: { borderColor: colors.success, backgroundColor: colors.card },
  inputError:   { borderColor: colors.error,   backgroundColor: colors.card },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: colors.textPrimary },
  eyeBtn: { padding: 4 },
  strengthRow: {
    flexDirection: "row", alignItems: "center",
    gap: 6, marginTop: 8,
  },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthText: { fontSize: 10, color: colors.textMuted, fontWeight: "600", width: 40 },
  matchRow: {
    flexDirection: "row", alignItems: "center",
    gap: 4, marginTop: 6,
  },
  matchText: { fontSize: 11, fontWeight: "600" },
  btn: {
    backgroundColor: colors.primary,
    height: 52, borderRadius: 14,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: colors.card, fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  loginRow: {
    flexDirection: "row", justifyContent: "center",
    alignItems: "center", marginTop: 20,
  },
  loginText: { fontSize: 13, color: colors.textMuted },
  loginLink: { fontSize: 13, fontWeight: "700", color: colors.primary },
  bottomNote: {
    textAlign: "center", fontSize: 10,
    color: colors.textMuted, paddingVertical: 16,
    paddingHorizontal: 24, backgroundColor: colors.card,
  },
});