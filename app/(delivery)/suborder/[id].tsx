import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axiosInstance from "@/constants/api/axiosInstance";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import Loader from "@/components/common/Loader";
import { DeliverySubOrderCard } from "@/components/delivery/DeliverySubOrderCard";
import type { DeliverySubOrder } from "@/types/delivery";
import { getApiErrorMessage } from "@/utils/apiError";
import { coerceNavBooleanOptions } from "@/constants/navigation/coerceNavOptions";

export default function DeliverySubOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [subOrder, setSubOrder] = useState<DeliverySubOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleNavigateToAddress = (so: DeliverySubOrder) => {
    const addr = so.order?.address;
    if (!addr) return;
    const address = `${addr.address}, ${addr.city}, ${addr.pincode}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/delivery/suborders/${id}`);
      const data = res.data?.data as DeliverySubOrder | undefined;
      setSubOrder(data ?? null);
    } catch (e) {
      setSubOrder(null);
      Alert.alert("Error", getApiErrorMessage(e, "Could not load this delivery."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refreshAfterAction = async () => {
    await load();
  };

  const handleAccept = async (subOrderId: string) => {
    try {
      setUpdating(subOrderId);
      await axiosInstance.post(`/api/delivery/suborders/${subOrderId}/accept`);
      await refreshAfterAction();
      Alert.alert("Success", "Sub-order accepted.");
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e, "Failed to accept."));
    } finally {
      setUpdating(null);
    }
  };

  const handleStartDelivery = async (subOrderId: string) => {
    try {
      setUpdating(subOrderId);
      await axiosInstance.post(`/api/delivery/suborders/${subOrderId}/start-delivery`);
      await refreshAfterAction();
      Alert.alert("Success", "Delivery started. Your location is being tracked.");
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e, "Failed to start delivery."));
    } finally {
      setUpdating(null);
    }
  };

  const handleComplete = async (subOrderId: string) => {
    Alert.alert("Complete delivery", "Mark this sub-order as delivered?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          try {
            setUpdating(subOrderId);
            await axiosInstance.post(`/api/delivery/suborders/${subOrderId}/complete`);
            await refreshAfterAction();
            Alert.alert("Success", "Marked as delivered.");
          } catch (e) {
            Alert.alert("Error", getApiErrorMessage(e, "Failed to complete."));
          } finally {
            setUpdating(null);
          }
        },
      },
    ]);
  };

  const variant: "active" | "pool" =
    subOrder && !subOrder.deliveryBoyId ? "pool" : "active";

  if (loading) {
    return <Loader variant="fullscreen" message="Loading delivery..." />;
  }

  if (!subOrder || !subOrder.order) {
    return (
      <>
        <Stack.Screen
          options={coerceNavBooleanOptions({
            headerShown: false,
            animationMatchesGesture: false,
            freezeOnBlur: false,
          })}
        />
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Delivery not found.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={coerceNavBooleanOptions({
          headerShown: false,
          animationMatchesGesture: false,
          freezeOnBlur: false,
        })}
      />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} translucent={false} />
        <View style={styles.header}>
          <View style={styles.headerBlob} />
          <TouchableOpacity
            style={styles.backIconBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery detail</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <DeliverySubOrderCard
            subOrder={subOrder}
            variant={variant}
            updating={updating}
            onNavigateToAddress={handleNavigateToAddress}
            onAccept={variant === "pool" ? handleAccept : undefined}
            onStartDelivery={variant === "active" ? handleStartDelivery : undefined}
            onComplete={variant === "active" ? handleComplete : undefined}
          />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: SCREEN_PADDING,
    paddingBottom: 24,
  },
  header: {
    backgroundColor: colors.primaryDark,
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: SCREEN_PADDING,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  headerBlob: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    opacity: 0.3,
    top: -50,
    right: -20,
  },
  backIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
  headerSpacer: { width: 40 },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SCREEN_PADDING,
    backgroundColor: colors.background,
  },
  fallbackText: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
});
