const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const department = await prisma.department.findFirst({ where: { code: 'PUR' } });
  const category = await prisma.category.findFirst({ where: { departmentId: department.id } });
  const creator = await prisma.user.findFirst();

  try {
    const ticket = await prisma.ticket.create({
      data: {
        ticketId: 'PUR-0003', // This should fail if it exists
        title: 'Test Collision',
        description: 'Testing if PUR-0003 collisions happen',
        departmentId: department.id,
        categoryId: category.id,
        creatorId: creator.id,
        priority: 'LOW',
        status: 'OPEN',
      }
    });
    console.log('Created:', ticket.ticketId);
  } catch (error) {
    console.error('Error creating ticket:', error.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
