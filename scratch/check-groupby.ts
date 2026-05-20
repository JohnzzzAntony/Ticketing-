import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const statusCountsRaw = await prisma.ticket.groupBy({ 
    by: ['status'], 
    _count: true 
  });

  console.log('statusCountsRaw:', JSON.stringify(statusCountsRaw, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
