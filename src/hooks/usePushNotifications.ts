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

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  // Check if push notifications are supported
  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
    
    setIsLoading(false);
  }, []);

  // Check current subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error("Error checking push subscription:", err);
      }
    };

    checkSubscription();
  }, [isSupported]);

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
    if (!isSupported || !user) return false;

    try {
      // Request permission first
      const granted = await requestPermission();
      if (!granted) return false;

      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe to push notifications
        // Note: In production, you'd get the VAPID public key from your server
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            // This is a placeholder VAPID public key - in production, generate your own
            "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"
          ),
        });
      }

      // Save subscription to database
      const subscriptionData = subscription.toJSON() as PushSubscriptionData;
      
      // Store in localStorage for now (in production, save to database)
      localStorage.setItem("pushSubscription", JSON.stringify({
        userId: user.id,
        subscription: subscriptionData,
        createdAt: new Date().toISOString(),
      }));

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Error subscribing to push notifications:", err);
      return false;
    }
  }, [isSupported, user, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      localStorage.removeItem("pushSubscription");
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error("Error unsubscribing from push notifications:", err);
      return false;
    }
  }, [isSupported]);

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
