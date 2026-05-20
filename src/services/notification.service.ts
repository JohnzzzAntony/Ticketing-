import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";

export class NotificationService {
  static async notify(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    ticketId?: string;
  }) {
    // 1. Create in-app notification
    const notification = await db.notification.create({
      data,
    });

    // 2. Send email (placeholder)
    console.log(`[Email Notification] To: ${data.userId}, Subject: ${data.title}, Message: ${data.message}`);
    
    // In production, integrate with SendGrid, Resend, or Amazon SES here
    
    return notification;
  }

  static async markAsRead(id: string) {
    return db.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  static async getUnreadCount(userId: string) {
    return db.notification.count({
      where: { userId, isRead: false },
    });
  }
}
