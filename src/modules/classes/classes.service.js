// src/modules/classes/classes.service.js
const prisma = require('../../config/prisma');
const { notFoundError, conflictError } = require('../../utils/errors');

async function listClasses(schoolId) {
  const classes = await prisma.class.findMany({ where: { schoolId }, orderBy: { order: 'asc' } });
  const counts = await prisma.student.groupBy({ by: ['classId'], where: { schoolId }, _count: { _all: true } });
  const countMap = Object.fromEntries(counts.map(c => [c.classId, c._count._all]));
  return classes.map(c => ({ ...c, studentCount: countMap[c.id] || 0 }));
}

async function getClass(id, schoolId) {
  const cls = await prisma.class.findFirst({ where: { id, schoolId } });
  if (!cls) throw notFoundError('Class not found.');
  return cls;
}

async function createClass(data, schoolId) {
  const existing = await prisma.class.findFirst({ where: { schoolId, name: data.name } });
  if (existing) throw conflictError(`Class "${data.name}" already exists.`);

  if (!data.order) {
    const last = await prisma.class.findFirst({ where: { schoolId }, orderBy: { order: 'desc' } });
    data.order = last ? last.order + 1 : 1;
  }
  return prisma.class.create({ data: { schoolId, name: data.name, order: data.order } });
}

async function updateClass(id, data, schoolId) {
  await getClass(id, schoolId);
  return prisma.class.update({ where: { id }, data: { name: data.name, order: data.order } });
}

async function deleteClass(id, schoolId) {
  const cls = await getClass(id, schoolId);
  const students = await prisma.student.count({ where: { classId: id } });
  if (students > 0) throw conflictError('Cannot delete a class that still has students enrolled.');
  return prisma.class.delete({ where: { id } });
}

module.exports = { listClasses, getClass, createClass, updateClass, deleteClass };
