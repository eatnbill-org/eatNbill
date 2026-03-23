/**
 * Browser Push Notifications — uses Notification API + service worker
 * No VAPID/Push API needed: calls serviceWorker.showNotification for background tabs
 */

const STORAGE_KEY = "eatnbill:notifications-enabled";

export function getNotificationsEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === "true"; }
  catch { return false; }
}

export function setNotificationsEnabled(enabled: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false"); }
  catch {}
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  const result = await Notification.requestPermission();
  if (result === "granted") setNotificationsEnabled(true);
  return result;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

interface NotificationPayload {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
}

/**
 * Show a browser notification.
 * Uses service worker's showNotification when available (works in background tabs).
 * Falls back to Notification constructor.
 */
export async function showPushNotification({ title, body, icon, tag }: NotificationPayload): Promise<void> {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!getNotificationsEnabled()) return;

  const opts: NotificationOptions = {
    body,
    icon: icon ?? "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: tag ?? "eatnbill",
    silent: false,
  };

  try {
    // Prefer service worker notification (visible in background)
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) { reg.showNotification(title, opts); return; }
    }
    // Fallback
    new Notification(title, opts);
  } catch {
    try { new Notification(title, opts); } catch { /* ignore */ }
  }
}

export async function showNewOrderNotification(payload: {
  orderNumber: string;
  customerName?: string | null;
  tableNumber?: string | null;
  totalAmount?: number;
}): Promise<void> {
  const location = payload.tableNumber ? `Table ${payload.tableNumber}` : "Takeaway";
  await showPushNotification({
    title: `New Order #${payload.orderNumber}`,
    body: `${payload.customerName || "Guest"} · ${location}`,
    tag: `order-${payload.orderNumber}`,
  });
}
