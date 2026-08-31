// prisma/seed.js
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@1234', 12);

  const school = await prisma.school.upsert({
    where: { code: 'DEMO' },
    update: {},
    create: {
      name: 'Demo School',
      code: 'DEMO',
      address: '123 Main Street',
      phone: '+233 000 000 000',
      email: 'demo@school.com',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: {
      schoolId: school.id,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@school.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const classNames = ['KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'];
  for (const name of classNames) {
    const order = classNames.indexOf(name) + 1;
    await prisma.class.upsert({
      where: { schoolId_name: { schoolId: school.id, name } },
      update: {},
      create: { schoolId: school.id, name, order },
    });
  }

  console.log('Seed complete. Admin login: admin@school.com / Admin@1234');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
