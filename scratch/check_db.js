const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const departments = await prisma.department.findMany({ include: { _count: { select: { tickets: true } } } });
  const tickets = await prisma.ticket.findMany({ select: { ticketId: true, departmentId: true }, orderBy: { createdAt: 'asc' } });

  console.log('Departments with ticket counts:', departments.map(d => ({ name: d.name, code: d.code, count: d._count.tickets })));
  console.log('Tickets:', tickets);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
