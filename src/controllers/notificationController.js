import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (notifications.length === 0) {
      await prisma.notification.createMany({
        data: [
          {
            userId,
            title: "Persetujuan Kampanye",
            message: "Kampanye 'Perbaikan Jalan Desa' butuh persetujuan RAB Anda.",
            type: "INFO"
          },
          {
            userId,
            title: "Milestone Flagged",
            message: "Peringatan: Milestone pencairan dana terdeteksi anomali (AI Score 72%).",
            type: "WARNING"
          },
          {
            userId,
            title: "Yayasan Baru",
            message: "Yayasan Peduli telah mendaftar dan menunggu verifikasi.",
            type: "USER"
          }
        ]
      });

      notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    }

    return res.json({ notifications });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.body;

    if (!id) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return res.json({ success: true, message: "All notifications marked as read" });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: "Notification not found" });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
