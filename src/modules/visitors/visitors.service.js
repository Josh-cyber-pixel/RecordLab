// src/modules/visitors/visitors.service.js
const prisma = require('../../config/prisma');
const { notFoundError } = require('../../utils/errors');

async function listVisitors(schoolId, { startDate, endDate } = {}) {
  const where = { schoolId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate)   where.date.lte = new Date(endDate);
  }
  return prisma.visitorLog.findMany({ where, orderBy: { date: 'desc' } });
}

async function getVisitor(id, schoolId) {
  const visitor = await prisma.visitorLog.findFirst({ where: { id, schoolId } });
  if (!visitor) throw notFoundError('Visitor record not found.');
  return visitor;
}

async function createVisitor(data, schoolId) {
  return prisma.visitorLog.create({
    data: {
      schoolId,
      date:          new Date(data.date),
      visitorName:   data.visitorName,
      institution:   data.institution ?? null,
      purpose:       data.purpose ?? null,
      arrivalTime:   data.arrivalTime ?? null,
      departureTime: data.departureTime ?? null,
    },
  });
}

async function updateVisitor(id, data, schoolId) {
  await getVisitor(id, schoolId);
  return prisma.visitorLog.update({
    where: { id },
    data: {
      date:          data.date ? new Date(data.date) : undefined,
      visitorName:   data.visitorName,
      institution:   data.institution ?? null,
      purpose:       data.purpose ?? null,
      arrivalTime:   data.arrivalTime ?? null,
      departureTime: data.departureTime ?? null,
    },
  });
}

async function deleteVisitor(id, schoolId) {
  await getVisitor(id, schoolId);
  return prisma.visitorLog.delete({ where: { id } });
}

module.exports = { listVisitors, getVisitor, createVisitor, updateVisitor, deleteVisitor };
