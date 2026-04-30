import { prisma } from "@/lib/prisma";

const READ_NOTIFICATION_RETENTION_DAYS = 10;

export function getReadNotificationRetentionCutoff(now = new Date()) {
  return new Date(now.getTime() - READ_NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export async function cleanupOldReadNotifications() {
  return prisma.notification.deleteMany({
    where: {
      read: true,
      createdAt: {
        lt: getReadNotificationRetentionCutoff(),
      },
    },
  });
}

export async function getUnreadNotificationCount() {
  return prisma.notification.count({
    where: { read: false },
  });
}
