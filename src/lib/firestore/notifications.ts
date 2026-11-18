import { getDocs, getDoc, doc, setDoc, query, where, collection, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import type { Notification } from "../../types/domain";

/**
 * Reference to a team's notifications subcollection for a specific user.
 */
function userNotificationsCol(teamId: string, userId: string) {
  return collection(db, "teams", teamId, "users", userId, "notifications");
}

/**
 * Reference to a specific notification document.
 */
function notificationDoc(teamId: string, userId: string, notificationId: string) {
  return doc(db, "teams", teamId, "users", userId, "notifications", notificationId);
}

/**
 * Gets all unread notifications for a user in a team.
 * Sorted by most recent first.
 */
export async function getUnreadNotifications(
  teamId: string,
  userId: string,
): Promise<Notification[]> {
  const q = query(
    userNotificationsCol(teamId, userId),
    where("read", "==", false),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Notification);
}

/**
 * Gets all notifications for a user in a team (read and unread).
 * Sorted by most recent first.
 */
export async function getAllNotifications(
  teamId: string,
  userId: string,
): Promise<Notification[]> {
  const q = query(
    userNotificationsCol(teamId, userId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Notification);
}

/**
 * Creates a notification for a user when their payment is approved.
 */
export async function createApprovedNotification(
  teamId: string,
  userId: string,
  paymentId: string,
): Promise<Notification> {
  const colRef = userNotificationsCol(teamId, userId);
  const docRef = doc(colRef);
  const notification: Notification = {
    id: docRef.id,
    userId,
    teamId,
    type: "payment.approved",
    paymentId,
    message: "Din betaling er godkendt ✓",
    read: false,
    createdAt: new Date().toISOString(),
  };

  await setDoc(docRef, notification);
  return notification;
}

/**
 * Creates a notification for a user when their payment is denied.
 */
export async function createDeniedNotification(
  teamId: string,
  userId: string,
  paymentId: string,
): Promise<Notification> {
  const colRef = userNotificationsCol(teamId, userId);
  const docRef = doc(colRef);
  const notification: Notification = {
    id: docRef.id,
    userId,
    teamId,
    type: "payment.denied",
    paymentId,
    message: "Din betaling blev afvist. Prøv igen →",
    read: false,
    createdAt: new Date().toISOString(),
  };

  await setDoc(docRef, notification);
  return notification;
}

/**
 * Marks a notification as read.
 */
export async function markNotificationAsRead(
  teamId: string,
  userId: string,
  notificationId: string,
): Promise<Notification> {
  const docRef = notificationDoc(teamId, userId, notificationId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(`Notification ${notificationId} not found`);
  }

  const notification = snap.data() as Notification;
  const updated: Notification = { ...notification, read: true };
  await setDoc(docRef, updated);
  return updated;
}

/**
 * Deletes a notification.
 */
export async function deleteNotification(
  teamId: string,
  userId: string,
  notificationId: string,
): Promise<void> {
  const docRef = notificationDoc(teamId, userId, notificationId);
  await setDoc(docRef, { deletedAt: new Date().toISOString() }, { merge: true });
}
