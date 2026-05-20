import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function ensureAdminUser() {
  const userCount = await db.user.count();
  if (userCount > 0) return;

  const passwordHash = await bcrypt.hash("123ewqasd", 10);

  await db.user.create({
    data: {
      email: "johns@admin.com",
      name: "Johns Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  // console.log("Created default admin: johns@admin.com / 123ewqasd");
}
