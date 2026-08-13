import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ActivationsService } from '../modules/activations/activations.service';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_EMAIL = 'neriakalazan@gmail.com';
const DEMO_PHONE = '0547724987';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });

  try {
    const prisma = app.get(PrismaService);
    const activationsService = app.get(ActivationsService);

    const demoUser = await prisma.user.findFirst({
      where: {
        email: DEMO_EMAIL,
        phone: DEMO_PHONE,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!demoUser) {
      throw new Error('Demo commander was not found. Ensure demo seed has been applied.');
    }

    const activation = await activationsService.createActivation(demoUser.id, demoUser.id);

    console.log('Demo activation created.');
    console.log('');
    console.log(`User: ${demoUser.firstName} ${demoUser.lastName}`);
    console.log(`Email: ${demoUser.email ?? 'N/A'}`);
    console.log(`Phone: ${demoUser.phone}`);
    console.log(`Company: ${demoUser.company.name}`);
    console.log('');
    console.log('Activation URL:');
    console.log(activation.activationUrl);
    console.log('');
    console.log(`Expires: ${activation.expiresAt.toISOString()}`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to create demo activation: ${message}`);
  process.exit(1);
});