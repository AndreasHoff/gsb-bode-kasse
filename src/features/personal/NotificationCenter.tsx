// F032: Payment Notification Center
// Displays in-app notifications for payment approvals/denials

import { useEffect, useState } from "react";
import type { Notification } from "../../types/domain";
import {
  getAllNotifications,
  markNotificationAsRead,
} from "../../lib/firestore/notifications";
import "./notification-center.css";

interface NotificationCenterProps {
  teamId: string;
  userId: string;
}

export default function NotificationCenter({
  teamId,
  userId,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadNotifications(): Promise<void> {
      setLoading(true);
      try {
        const all = await getAllNotifications(teamId, userId);
        if (isActive) {
          // Filter for unread notifications in memory (avoids composite index requirement)
          const unread = all.filter((n) => !n.read);
          setNotifications(unread);
        }
      } catch (err) {
        console.error("[notification-center] failed to load notifications", err);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      isActive = false;
    };
  }, [teamId, userId]);

  async function handleDismiss(notificationId: string): Promise<void> {
    try {
      await markNotificationAsRead(teamId, userId, notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("[notification-center] failed to mark as read", err);
    }
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-center">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification-banner notification-banner--${notification.type}`}
          role="alert"
          aria-live="polite"
        >
          <div className="notification-banner__content">
            <span className="notification-banner__icon">
              {notification.type === "payment.approved" ? "✓" : "⚠️"}
            </span>
            <p className="notification-banner__message">{notification.message}</p>
          </div>
          <button
            type="button"
            className="notification-banner__close"
            onClick={() => void handleDismiss(notification.id)}
            aria-label="Luk besked"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
