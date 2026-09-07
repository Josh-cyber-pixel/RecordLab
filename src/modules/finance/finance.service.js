// src/modules/finance/finance.service.js
const prisma = require('../../config/prisma');

// Finance summary — aggregates Income (any source), Expenses, invoice/fee
// collection, and teacher count into one view.
async function getFinanceSummary(schoolId) {
  const [incomes, expenses, teacherCount, payments, invoices] = await Promise.all([
    prisma.income.findMany({ where: { schoolId } }),
    prisma.expense.findMany({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId, role: 'TEACHER' } }),
    prisma.payment.findMany({ where: { schoolId }, include: { invoice: { include: { items: true } } } }),
    prisma.invoice.findMany({ where: { schoolId } }),
  ]);

  const byIncomeSource = {};
  let incomeTotal = 0;
  for (const i of incomes) {
    byIncomeSource[i.source] = (byIncomeSource[i.source] || 0) + i.amount;
    incomeTotal += i.amount;
  }

  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const byExpenseSource = {};
  for (const e of expenses) {
    byExpenseSource[e.sourceOfIncome] = (byExpenseSource[e.sourceOfIncome] || 0) + e.amount;
  }

  // Invoice-based fee collection
  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalCollectedOnInvoices = payments.reduce((s, p) => s + p.amount, 0);
  const byFeeLabel = {};
  for (const p of payments) {
    const label = p.invoice?.items?.[0]?.label || 'Other';
    byFeeLabel[label] = (byFeeLabel[label] || 0) + p.amount;
  }
  const feeCount = Object.keys(byFeeLabel).length;

  return {
    income: {
      bySource: byIncomeSource,
      incomeCount: incomes.length,
      incomeTotal,
    },
    expenses: {
      count: expenses.length,
      total: expenseTotal,
      bySource: byExpenseSource,
    },
    invoices: {
      invoiceCount: invoices.length,
      totalInvoiced,
      collected: totalCollectedOnInvoices,
      balance: totalInvoiced - totalCollectedOnInvoices,
      byFeeLabel,
      feeCount,
    },
    teachers: teacherCount,
    netPosition: incomeTotal + totalCollectedOnInvoices - expenseTotal,
    grandTotalCollected: incomeTotal + totalCollectedOnInvoices,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getFinanceSummary };
