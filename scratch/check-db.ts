import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const depts = await prisma.department.count();
  const tickets = await prisma.ticket.count();
  console.log({ users, depts, tickets });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
