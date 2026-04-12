/**
 * Deep links and bookmarks to /(delivery)/login → single shared sign-in (scalable: one AuthContext, one token path).
 */
import { Redirect } from "expo-router";

export default function DeliveryLoginRedirect() {
  return <Redirect href="/(auth)/login" />;
}
