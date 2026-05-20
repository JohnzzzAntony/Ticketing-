import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tickets = await prisma.ticket.findMany({
    select: {
      id: true,
      createdAt: true,
      categoryId: true,
      departmentId: true,
      status: true,
    }
  });

  console.log('Total tickets:', tickets.length);
  console.log('Tickets by status:', tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as any));

  console.log('Recent tickets (last 10):');
  tickets.slice(-10).forEach(t => {
    console.log(`ID: ${t.id}, Created: ${t.createdAt}, Category: ${t.categoryId}, Dept: ${t.departmentId}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
