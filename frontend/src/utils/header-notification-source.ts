import type { AppNotification } from '@/services/notifications.service';

export function headerNotificationSnapshot(
  authenticated: boolean,
  serverItems: AppNotification[],
  serverUnread: number,
  localItems: AppNotification[],
) {
  // Signed-in read state belongs to the account; local broadcasts are for guests.
  // Mixing both makes one live session appear twice and leaks read state across accounts.
  return authenticated
    ? { items: serverItems, unreadCount: serverUnread }
    : { items: localItems, unreadCount: localItems.filter(item => !item.isRead).length };
}
