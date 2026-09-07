// src/modules/achievements/achievements.service.js
const prisma = require('../../config/prisma');

// General achievements — aggregates fee collection, income and expenses.
async function getAchievements(schoolId) {
  const [incomes, expenses, studentCount, teacherCount, payments] = await Promise.all([
    prisma.income.findMany({ where: { schoolId } }),
    prisma.expense.findMany({ where: { schoolId } }),
    prisma.student.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId, role: 'TEACHER' } }),
    prisma.payment.findMany({ where: { schoolId } }),
  ]);

  const byIncomeSource = {};
  let incomeTotal = 0;
  for (const i of incomes) { byIncomeSource[i.source] = (byIncomeSource[i.source] || 0) + i.amount; incomeTotal += i.amount; }

  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const paymentsTotal = payments.reduce((s, p) => s + p.amount, 0);

  return {
    enrolment: { students: studentCount, teachers: teacherCount },
    income: {
      bySource: byIncomeSource,
      incomeCount: incomes.length,
      incomeTotal,
    },
    expenses: {
      count: expenses.length,
      total: expenseTotal,
    },
    netPosition: incomeTotal + paymentsTotal - expenseTotal,
    grandTotal: incomeTotal + paymentsTotal,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getAchievements };
