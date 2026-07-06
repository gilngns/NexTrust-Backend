import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function seed() {
  let dinsos = await prisma.user.findFirst({
    where: { role: "DINSOS" }
  });

  if (!dinsos) {
    console.log("Dinsos user not found, falling back to first user...");
    dinsos = await prisma.user.findFirst();
  }

  if (!dinsos) {
    console.log("No users found at all in the database!");
    return;
  }

  console.log("Seeding notifications for Dinsos user:", dinsos.email);

  await prisma.notification.createMany({
    data: [
      {
        userId: dinsos.id,
        title: "Persetujuan Kampanye",
        message: "Kampanye 'Bantuan Sarana Air Bersih' telah diajukan dan membutuhkan persetujuan Anda.",
        type: "INFO"
      },
      {
        userId: dinsos.id,
        title: "Milestone Flagged",
        message: "Peringatan: Milestone ke-2 kampanye 'Renovasi Sekolah' ditandai karena nilai RAB tidak cocok dengan kwitansi.",
        type: "WARNING"
      },
      {
        userId: dinsos.id,
        title: "Yayasan Baru",
        message: "Yayasan Cita Anak Bangsa telah mendaftar dan menunggu verifikasi Anda.",
        type: "USER"
      }
    ]
  });

  console.log("Notifications seeded!");
}

seed().finally(() => prisma.$disconnect());
