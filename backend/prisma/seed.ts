import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { seedSystem } from './seeds/system.seed';
import { seedDemo } from './seeds/demo.seed';

import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  await seedSystem(prisma);
  await seedDemo(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);

    await prisma.$disconnect();
    process.exit(1);
  });