import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ticketsCount = await prisma.ticket.count();
  console.log(`Total tickets: ${ticketsCount}`);
  
  const tickets = await prisma.ticket.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log("Latest tickets:", JSON.stringify(tickets, null, 2));

  const departments = await prisma.department.findMany();
  console.log("Departments:", JSON.stringify(departments, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
