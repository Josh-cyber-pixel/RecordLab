// src/modules/enrollment/enrollment.service.js
const prisma = require('../../config/prisma');
const { notFoundError } = require('../../utils/errors');

// ── Students roster ──────────────────────────────────────────────────────────

// Group by class with a per-class running S/N
async function listStudentsByClass(schoolId) {
  const students = await prisma.student.findMany({
    where: { schoolId },
    include: { class: { select: { id: true, name: true, order: true } } },
    orderBy: [{ class: { order: 'asc' } }, { name: 'asc' }],
  });

  const byClass = {};
  for (const s of students) {
    if (!s.class) continue;
    const key = s.class.name;
    if (!byClass[key]) byClass[key] = { classId: s.class.id, className: key, rows: [] };
    byClass[key].rows.push({ serial: byClass[key].rows.length + 1, id: s.id, name: s.name });
  }
  const classes = Object.values(byClass);
  classes.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
  return { classCount: classes.length, studentCount: students.length, classes };
}

async function getStudent(id, schoolId) {
  const student = await prisma.student.findFirst({ where: { id, schoolId } });
  if (!student) throw notFoundError('Student not found.');
  return student;
}

async function createStudent(data, schoolId) {
  await prisma.class.findFirst({ where: { id: data.classId, schoolId } })
    .then(c => { if (!c) throw notFoundError('Class not found.'); });
  return prisma.student.create({
    data: { schoolId, classId: data.classId, name: data.name },
  });
}

async function updateStudent(id, data, schoolId) {
  await getStudent(id, schoolId);
  return prisma.student.update({
    where: { id },
    data: { classId: data.classId, name: data.name },
  });
}

async function deleteStudent(id, schoolId) {
  await getStudent(id, schoolId);
  return prisma.student.delete({ where: { id } });
}

// ── Teachers roster (User records with role TEACHER) ─────────────────────────

async function listTeachers(schoolId) {
  const teachers = await prisma.user.findMany({
    where: { schoolId, role: 'TEACHER' },
    select: { id: true, firstName: true, lastName: true, email: true, status: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
  return teachers;
}

module.exports = {
  listStudentsByClass,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  listTeachers,
};
