import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Get VAPID public key from environment or use the one from secrets
const getVapidPublicKey = async (): Promise<string | null> => {
  try {
    // Call edge function to get the public key
    const { data, error } = await supabase.functions.invoke('get-vapid-key');
    if (error || !data?.publicKey) {
      console.error('Failed to get VAPID key:', error);
      return null;
    }
    return data.publicKey;
  } catch (err) {
    console.error('Error fetching VAPID key:', err);
    return null;
  }
};

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      // Fetch VAPID key
      getVapidPublicKey().then(setVapidKey);
    }
    
    setIsLoading(false);
  }, []);

  // Check current subscription status from database
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !user) {
        setIsSubscribed(false);
        return;
      }

      try {
        // Check if user has subscription in database
        const { data, error } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (error) {
          console.error("Error checking subscription:", error);
          setIsSubscribed(false);
          return;
        }

        setIsSubscribed(data && data.length > 0);
      } catch (err) {
        console.error("Error checking push subscription:", err);
        setIsSubscribed(false);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user || !vapidKey) {
      console.error('Cannot subscribe: missing requirements', { isSupported, user: !!user, vapidKey: !!vapidKey });
      return false;
    }

    try {
      setIsLoading(true);

      // Request permission first
      const granted = await requestPermission();
      if (!granted) {
        setIsLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed locally
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe to push notifications
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      // Save subscription to database
      const subscriptionData = subscription.toJSON() as PushSubscriptionData;
      
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint,
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth,
        }, {
          onConflict: "user_id,endpoint"
        });

      if (error) {
        console.error("Error saving subscription:", error);
        setIsLoading(false);
        return false;
      }

      // Update profile notification preference
      await supabase
        .from("profiles")
        .update({ notification_enabled: true })
        .eq("id", user.id);

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Error subscribing to push notifications:", err);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, user, requestPermission, vapidKey]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) return false;

    try {
      setIsLoading(true);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from database
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      // Update profile notification preference
      await supabase
        .from("profiles")
        .update({ notification_enabled: false })
        .eq("id", user.id);

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Error unsubscribing from push notifications:", err);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, user]);

  // Show a local notification (for testing/demo)
  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== "granted") return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        ...options,
      });
      return true;
    } catch (err) {
      console.error("Error showing notification:", err);
      return false;
    }
  }, [isSupported, permission]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    vapidKey,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}
