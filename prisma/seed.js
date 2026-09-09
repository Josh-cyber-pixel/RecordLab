// prisma/seed.js
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@school.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

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
    where: { email: adminEmail },
    update: {},
    create: {
      schoolId: school.id,
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
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

  // ── Demo academic year + terms ─────────────────────────────────────────────
  const now = new Date();
  const cy  = now.getFullYear();
  const ayName = `${cy}/${cy + 1}`;
  const year = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: ayName } },
    update: { isCurrent: true },
    create: {
      schoolId: school.id,
      name: ayName,
      startDate: new Date(cy, 0, 15),
      endDate:   new Date(cy + 1, 6, 31),
      isCurrent: true,
      status: 'IN_PROGRESS',
    },
  });

  const terms = [
    { name: 'First Term',   isCurrent: true,  sd: new Date(cy, 0, 15),  ed: new Date(cy, 3, 30)  },
    { name: 'Second Term',  isCurrent: false, sd: new Date(cy, 4, 15),  ed: new Date(cy, 7, 30)  },
    { name: 'Third Term',   isCurrent: false, sd: new Date(cy, 8, 15),  ed: new Date(cy + 1, 0, 30) },
  ];
  for (const t of terms) {
    await prisma.term.upsert({
      where: { academicYearId_name: { academicYearId: year.id, name: t.name } },
      update: { isCurrent: t.isCurrent },
      create: {
        schoolId: school.id,
        academicYearId: year.id,
        name: t.name,
        startDate: t.sd,
        endDate: t.ed,
        isCurrent: t.isCurrent,
      },
    });
  }
  const currentTerm = await prisma.term.findFirst({ where: { schoolId: school.id, isCurrent: true } });

  // ── Demo fee structures (PTA, Printing, Mock) for B7 on the current term ──
  const b7 = await prisma.class.findFirst({ where: { schoolId: school.id, name: 'B7' } });
  const demoFees = [
    { label: 'PTA', amount: 50, description: 'Parent-Teacher Association dues' },
    { label: 'Printing', amount: 30, description: 'Examination printing costs' },
    { label: 'Mock', amount: 60, description: 'Mock examination fees' },
  ];
  if (b7 && currentTerm) {
    for (const f of demoFees) {
      const existing = await prisma.feeStructure.findFirst({
        where: { schoolId: school.id, classId: b7.id, termId: currentTerm.id, label: f.label },
      });
      if (!existing) {
        await prisma.feeStructure.create({
          data: { ...f, schoolId: school.id, classId: b7.id, termId: currentTerm.id },
        });
      }
    }
  }

  // ── Demo teacher ───────────────────────────────────────────────────────────
  const teacherHash = await bcrypt.hash('Teacher@1234', 12);
  await prisma.user.upsert({
    where: { email: 'teacher@school.com' },
    update: {},
    create: {
      schoolId: school.id,
      firstName: 'Demo',
      lastName: 'Teacher',
      email: 'teacher@school.com',
      phone: '+233 111 111 111',
      teacherNo: 'T-0001',
      passwordHash: teacherHash,
      role: 'TEACHER',
    },
  });

  console.log(`Seed complete. Admin login: ${adminEmail} / ${process.env.ADMIN_PASSWORD ? '(from ADMIN_PASSWORD env)' : 'Admin@1234'}`);
  console.log('Teacher login: teacher@school.com / Teacher@1234');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
