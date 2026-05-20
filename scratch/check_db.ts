import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ticketCount = await prisma.ticket.count();
  console.log(`Total tickets: ${ticketCount}`);
  
  const tickets = await prisma.ticket.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Last 5 tickets:', JSON.stringify(tickets, null, 2));

  const departments = await prisma.department.count();
  console.log(`Total departments: ${departments}`);

  const categories = await prisma.category.count();
  console.log(`Total categories: ${categories}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
