// app/(delivery)/login.tsx
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "@/constants/api/axiosInstance";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import { Alert } from "react-native";

export default function DeliveryLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.post("/api/auth/login", {
        email,
        password,
      });

      const token = response.data.accessToken;
      await AsyncStorage.setItem("accessToken", token);
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Verify user is a delivery person
      const userRes = await axiosInstance.get("/api/auth/me");
      if (userRes.data.role !== "delivery") {
        Alert.alert("Error", "This account is not authorized for delivery access");
        await AsyncStorage.removeItem("accessToken");
        return;
      }

      router.replace("/(delivery)/dashboard");
    } catch (error: any) {
      Alert.alert(
        "Login Failed",
        error.response?.data?.message || "Invalid credentials"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
        
        <View style={styles.header}>
          <View style={styles.headerBlob} />
          <Ionicons name="bicycle" size={48} color="#fff" />
          <Text style={styles.headerTitle}>Delivery Login</Text>
          <Text style={styles.headerSubtitle}>Sign in to access your dashboard</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Login</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primaryDark,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: SCREEN_PADDING,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  headerBlob: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary,
    opacity: 0.3,
    top: -50,
    right: -50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    marginTop: 16,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
  },
  form: {
    flex: 1,
    padding: SCREEN_PADDING,
    paddingTop: 40,
    gap: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: colors.textPrimary,
  },
  eyeIcon: {
    padding: 4,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

