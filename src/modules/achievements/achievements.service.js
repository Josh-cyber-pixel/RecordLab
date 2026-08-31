// src/modules/achievements/achievements.service.js
const prisma = require('../../config/prisma');

// General achievements — aggregates PTA collections and IGF income into one view.
async function getAchievements(schoolId) {
  const [ptaEntries, igfIncome, igfProjects, studentCount, teacherCount] = await Promise.all([
    prisma.classLedger.findMany({ where: { schoolId, type: 'PTA' } }),
    prisma.igfIncome.findMany({ where: { schoolId } }),
    prisma.schoolProject.findMany({ where: { schoolId } }),
    prisma.student.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId, role: 'TEACHER' } }),
  ]);

  const paid = ptaEntries.reduce((s, e) => s + (e.term1Amount || 0) + (e.term2Amount || 0) + (e.term3Amount || 0), 0);
  const expected = ptaEntries.reduce((s, e) => s + (e.expectedAmount || 0), 0);

  const igfBySource = { WORSHIP: 0, CANTEEN: 0 };
  let igfTotal = 0;
  for (const i of igfIncome) { igfBySource[i.source] = (igfBySource[i.source] || 0) + i.amount; igfTotal += i.amount; }
  const projectBenefits = igfProjects.reduce((s, p) => s + p.benefits, 0);

  return {
    enrolment: { students: studentCount, teachers: teacherCount },
    pta: {
      rows: ptaEntries.length,
      expected,
      collected: paid,
      owing: expected - paid,
    },
    igf: {
      bySource: igfBySource,
      worship: igfBySource.WORSHIP,
      canteen: igfBySource.CANTEEN,
      incomeTotal: igfTotal,
      projects: { count: igfProjects.length, benefits: projectBenefits },
    },
    grandTotal: paid + igfTotal + projectBenefits,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getAchievements };
