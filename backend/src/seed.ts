import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminFullName = process.env.ADMIN_FULL_NAME;
  const adminPasswordRaw = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminUsername || !adminFullName || !adminPasswordRaw) {
    throw new Error(
      'Missing required admin environment variables. ' +
      'Please ensure ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_FULL_NAME, and ADMIN_PASSWORD are set in your environment or .env file.'
    );
  }

  const adminPassword = await bcrypt.hash(adminPasswordRaw, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      username: adminUsername,
      fullName: adminFullName,
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log(`Admin user seeded. Email: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
