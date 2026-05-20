/*
  Warnings:

  - You are about to drop the column `category` on the `sla_configs` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `tickets` table. All the data in the column will be lost.
  - Added the required column `code` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `sla_configs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departmentId` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "categories" ADD COLUMN "resolutionTimeHours" INTEGER;
ALTER TABLE "categories" ADD COLUMN "responseTimeHours" INTEGER;

-- CreateTable
CREATE TABLE "department_custom_fields" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,
    "departmentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "department_custom_fields_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "stepName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "approval_requests_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "approval_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "department_sla_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "defaultResponseTimeHours" INTEGER NOT NULL DEFAULT 8,
    "defaultResolutionTimeHours" INTEGER NOT NULL DEFAULT 48,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "department_sla_configs_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_DepartmentManagers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DepartmentManagers_A_fkey" FOREIGN KEY ("A") REFERENCES "departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DepartmentManagers_B_fkey" FOREIGN KEY ("B") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_DepartmentAgents" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DepartmentAgents_A_fkey" FOREIGN KEY ("A") REFERENCES "departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DepartmentAgents_B_fkey" FOREIGN KEY ("B") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "routingRules" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_departments" ("createdAt", "description", "id", "name", "updatedAt") SELECT "createdAt", "description", "id", "name", "updatedAt" FROM "departments";
DROP TABLE "departments";
ALTER TABLE "new_departments" RENAME TO "departments";
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");
CREATE TABLE "new_sla_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "responseTimeHours" INTEGER NOT NULL DEFAULT 4,
    "resolutionTimeHours" INTEGER NOT NULL DEFAULT 24,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sla_configs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sla_configs" ("createdAt", "id", "priority", "resolutionTimeHours", "responseTimeHours", "updatedAt") SELECT "createdAt", "id", "priority", "resolutionTimeHours", "responseTimeHours", "updatedAt" FROM "sla_configs";
DROP TABLE "sla_configs";
ALTER TABLE "new_sla_configs" RENAME TO "sla_configs";
CREATE UNIQUE INDEX "sla_configs_categoryId_key" ON "sla_configs"("categoryId");
CREATE TABLE "new_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "tags" TEXT NOT NULL DEFAULT '',
    "customData" TEXT DEFAULT '{}',
    "approvalStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "creatorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tickets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tickets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tickets_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tickets_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tickets" ("assigneeId", "createdAt", "creatorId", "description", "id", "priority", "status", "tags", "ticketId", "title", "updatedAt") SELECT "assigneeId", "createdAt", "creatorId", "description", "id", "priority", "status", "tags", "ticketId", "title", "updatedAt" FROM "tickets";
DROP TABLE "tickets";
ALTER TABLE "new_tickets" RENAME TO "tickets";
CREATE UNIQUE INDEX "tickets_ticketId_key" ON "tickets"("ticketId");
CREATE INDEX "tickets_status_idx" ON "tickets"("status");
CREATE INDEX "tickets_priority_idx" ON "tickets"("priority");
CREATE INDEX "tickets_ticketId_idx" ON "tickets"("ticketId");
CREATE INDEX "tickets_departmentId_idx" ON "tickets"("departmentId");
CREATE INDEX "tickets_categoryId_idx" ON "tickets"("categoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "department_sla_configs_departmentId_key" ON "department_sla_configs"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "_DepartmentManagers_AB_unique" ON "_DepartmentManagers"("A", "B");

-- CreateIndex
CREATE INDEX "_DepartmentManagers_B_index" ON "_DepartmentManagers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DepartmentAgents_AB_unique" ON "_DepartmentAgents"("A", "B");

-- CreateIndex
CREATE INDEX "_DepartmentAgents_B_index" ON "_DepartmentAgents"("B");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "sla_records_isBreached_idx" ON "sla_records"("isBreached");
