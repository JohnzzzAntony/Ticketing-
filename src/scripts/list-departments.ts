import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const departments = await prisma.department.findMany({
    include: { categories: true }
  });
  console.log(JSON.stringify(departments, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
