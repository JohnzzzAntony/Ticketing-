import { db } from "@/lib/db";
import { Priority } from "@prisma/client";

export class SLAService {
  static async calculateSLA(ticketId: string, categoryId: string, priority: Priority) {
    // 1. Find SLA config for the category
    let config = await db.sLAConfig.findUnique({
      where: { categoryId },
    });

    // 2. Fallback to department default if not found
    if (!config) {
      const category = await db.category.findUnique({
        where: { id: categoryId },
        include: { department: { include: { slaConfig: true } } },
      });

      if (category?.department.slaConfig) {
        config = {
          id: "temp",
          categoryId: categoryId,
          responseTimeHours: category.department.slaConfig.defaultResponseTimeHours,
          resolutionTimeHours: category.department.slaConfig.defaultResolutionTimeHours,
          priority: "MEDIUM",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    // 3. Fallback to global defaults if still not found
    if (!config) {
      config = {
        id: "default",
        categoryId: categoryId,
        responseTimeHours: 8,
        resolutionTimeHours: 48,
        priority: "MEDIUM",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // 4. Adjust based on priority
    let responseMultiplier = 1;
    let resolutionMultiplier = 1;

    switch (priority) {
      case "URGENT":
        responseMultiplier = 0.25;
        resolutionMultiplier = 0.25;
        break;
      case "HIGH":
        responseMultiplier = 0.5;
        resolutionMultiplier = 0.5;
        break;
      case "LOW":
        responseMultiplier = 2;
        resolutionMultiplier = 2;
        break;
    }

    const now = new Date();
    const responseDeadline = new Date(now.getTime() + config.responseTimeHours * responseMultiplier * 60 * 60 * 1000);
    const resolutionDeadline = new Date(now.getTime() + config.resolutionTimeHours * resolutionMultiplier * 60 * 60 * 1000);

    return db.sLARecord.create({
      data: {
        ticketId,
        responseDeadline,
        resolutionDeadline,
      },
    });
  }

  static async markFirstResponse(ticketId: string) {
    const record = await db.sLARecord.findUnique({
      where: { ticketId },
    });

    if (record && !record.firstResponseAt) {
      const firstResponseAt = new Date();
      const isBreached = firstResponseAt > record.responseDeadline;

      return db.sLARecord.update({
        where: { ticketId },
        data: {
          firstResponseAt,
          isBreached: isBreached || record.isBreached,
        },
      });
    }
  }

  static async markResolved(ticketId: string) {
    const record = await db.sLARecord.findUnique({
      where: { ticketId },
    });

    if (record && !record.resolvedAt) {
      const resolvedAt = new Date();
      const isBreached = resolvedAt > record.resolutionDeadline;

      return db.sLARecord.update({
        where: { ticketId },
        data: {
          resolvedAt,
          isBreached: isBreached || record.isBreached,
        },
      });
    }
  }

  static async checkBreaches() {
    const now = new Date();
    
    const records = await db.sLARecord.findMany({
      where: {
        isBreached: false,
        OR: [
          {
            firstResponseAt: null,
            responseDeadline: { lt: now },
          },
          {
            resolvedAt: null,
            resolutionDeadline: { lt: now },
          },
        ],
      },
    });

    for (const record of records) {
      await db.sLARecord.update({
        where: { id: record.id },
        data: { isBreached: true },
      });
    }

    return records.length;
  }
}
