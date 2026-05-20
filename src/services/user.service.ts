import { db } from "@/lib/db";
import { Role } from "@prisma/client";

export class UserService {
  static async getUsers(filters: { role?: Role; departmentId?: string } = {}) {
    return db.user.findMany({
      where: filters,
      include: {
        department: true,
      },
      orderBy: { name: "asc" },
    });
  }

  static async getUserById(id: string) {
    return db.user.findUnique({
      where: { id },
      include: {
        department: true,
      },
    });
  }

  static async getAgents() {
    return this.getUsers({ role: "AGENT" });
  }

  static async getDepartments() {
    return db.department.findMany({
      include: {
        categories: true,
      },
      orderBy: { name: "asc" },
    });
  }
}
