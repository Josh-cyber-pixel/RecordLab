// src/modules/students/students.service.js
const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { notFoundError, badRequestError, conflictError } = require('../../utils/errors');

// ─── Student code generation ────────────────────────────────────────────────
// Format: STU-0001-2026  (STU + 4-digit sequence + year enrolled)
function nextStudentCode(students) {
  let maxSeq = 0;
  for (const s of students) {
    const m = /^STU-(\d+)-(\d{4})$/.exec(s.studentCode || '');
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  const seq = String(maxSeq + 1).padStart(4, '0');
  const year = new Date().getFullYear();
  return `STU-${seq}-${year}`;
}

// ─── Teacher no generation (T-001) ───────────────────────────────────────────
function nextTeacherNo(teachers) {
  let maxSeq = 0;
  for (const t of teachers) {
    const m = /^T-(\d+)$/.exec(t.teacherNo || '');
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  return `T-${String(maxSeq + 1).padStart(3, '0')}`;
}

// ─── Student roster ──────────────────────────────────────────────────────────

// Group by class with a per-class running S/N
async function listStudentsByClass(schoolId) {
  const students = await prisma.student.findMany({
    where: { schoolId },
    include: {
      class: { select: { id: true, name: true, order: true } },
      enrollmentTerm: { select: { id: true, name: true, academicYear: { select: { name: true } } } },
    },
    orderBy: [{ class: { order: 'asc' } }, { name: 'asc' }],
  });

  const byClass = {};
  for (const s of students) {
    if (!s.class) continue;
    const key = s.class.name;
    if (!byClass[key]) byClass[key] = { classId: s.class.id, className: key, rows: [] };
    byClass[key].rows.push({
      serial: byClass[key].rows.length + 1,
      id: s.id,
      name: s.name,
      studentCode: s.studentCode,
    });
  }
  const classes = Object.values(byClass);
  classes.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
  return { classCount: classes.length, studentCount: students.length, classes };
}

async function getStudent(id, schoolId) {
  const student = await prisma.student.findFirst({
    where: { id, schoolId },
    include: {
      class: { select: { id: true, name: true } },
      enrollmentTerm: { select: { id: true, name: true, academicYear: { select: { name: true } } } },
    },
  });
  if (!student) throw notFoundError('Student not found.');
  return student;
}

// Detail view: basic profile + what they owe (fees + books)
async function getStudentDetail(id, schoolId) {
  const student = await getStudent(id, schoolId);

  const [invoices, loans] = await Promise.all([
    prisma.invoice.findMany({
      where: { schoolId, studentId: id, status: { in: ['UNPAID', 'PARTIAL'] } },
      include: { term: { select: { id: true, name: true, academicYear: { select: { name: true } } } } },
    }),
    prisma.libraryLoan.findMany({
      where: { schoolId, borrowerType: 'STUDENT', borrowerCode: student.studentCode, dateReturned: null },
    }),
  ]);

  const feesOutstanding = invoices.reduce((s, i) => s + (i.balance || 0), 0);

  return {
    ...student,
    debts: {
      fees: invoices.map((i) => ({ id: i.id, invoiceNo: i.invoiceNo, term: i.term, amount: i.totalAmount, paid: i.paidAmount, balance: i.balance, status: i.status })),
      feesOutstanding,
      books: loans.map((l) => ({ id: l.id, bookTitle: l.bookTitle, dateReceived: l.dateReceived })),
      booksOutstanding: loans.length,
    },
  };
}

function hasProfileFields(d) {
  return !!(d.firstName || d.lastName || d.gender || d.dateOfBirth || d.address ||
    d.guardianName || d.guardianPhone || d.bloodGroup || d.medicalNotes || d.studentCode || d.enrollmentTermId);
}

function displayName(d, existing) {
  if (d.firstName || d.lastName) {
    return `${d.firstName || ''} ${d.lastName || ''}`.trim();
  }
  return (existing && existing.name) || d.name || '';
}

async function createStudent(data, schoolId) {
  const cls = await prisma.class.findFirst({ where: { id: data.classId, schoolId } });
  if (!cls) throw notFoundError('Class not found.');

  const name = displayName(data, null);
  if (!name) throw badRequestError('Student name is required.');

  const existing = await prisma.student.findFirst({ where: { schoolId, classId: data.classId, name } });
  if (existing) throw conflictError('A student with this name already exists in this class.');

  // Validate enrollment term belongs to this school
  if (data.enrollmentTermId) {
    const term = await prisma.term.findFirst({ where: { id: data.enrollmentTermId, schoolId } });
    if (!term) throw badRequestError('Invalid enrollment term.');
  }

  const students = await prisma.student.findMany({ where: { schoolId }, select: { studentCode: true } });
  const studentCode = data.studentCode || nextStudentCode(students);

  return prisma.student.create({
    data: {
      schoolId,
      classId: data.classId,
      name,
      studentCode,
      firstName: data.firstName ?? undefined,
      lastName: data.lastName ?? undefined,
      gender: data.gender ?? undefined,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      address: data.address ?? undefined,
      bloodGroup: data.bloodGroup ?? undefined,
      medicalNotes: data.medicalNotes ?? undefined,
      guardianName: data.guardianName ?? undefined,
      guardianPhone: data.guardianPhone ?? undefined,
      guardianRelation: data.guardianRelation ?? undefined,
      residentialStatus: data.residentialStatus || 'DAY',
      enrollmentTermId: data.enrollmentTermId ?? undefined,
    },
  });
}

async function updateStudent(id, data, schoolId) {
  const student = await getStudent(id, schoolId);

  if (data.classId) {
    const cls = await prisma.class.findFirst({ where: { id: data.classId, schoolId } });
    if (!cls) throw notFoundError('Class not found.');
  }
  if (data.enrollmentTermId) {
    const term = await prisma.term.findFirst({ where: { id: data.enrollmentTermId, schoolId } });
    if (!term) throw badRequestError('Invalid enrollment term.');
  }

  const name = displayName(data, student);

  return prisma.student.update({
    where: { id },
    data: {
      classId: data.classId ?? undefined,
      name,
      firstName: data.firstName ?? undefined,
      lastName: data.lastName ?? undefined,
      gender: data.gender ?? undefined,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : data.dateOfBirth === null ? null : undefined,
      address: data.address ?? undefined,
      bloodGroup: data.bloodGroup ?? undefined,
      medicalNotes: data.medicalNotes ?? undefined,
      guardianName: data.guardianName ?? undefined,
      guardianPhone: data.guardianPhone ?? undefined,
      guardianRelation: data.guardianRelation ?? undefined,
      residentialStatus: data.residentialStatus ?? undefined,
      enrollmentTermId: data.enrollmentTermId ?? undefined,
    },
    include: {
      class: { select: { id: true, name: true } },
      enrollmentTerm: { select: { id: true, name: true, academicYear: { select: { name: true } } } },
    },
  });
}

async function deleteStudent(id, schoolId) {
  await getStudent(id, schoolId);
  return prisma.student.delete({ where: { id } });
}

// ─── Student search (by code or name) ────────────────────────────────────────

async function searchStudents(schoolId, query) {
  const q = (query || '').trim();
  if (!q) return [];
  const where = {
    schoolId,
    OR: [
      { studentCode: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
    ],
  };
  return prisma.student.findMany({
    where,
    take: 20,
    include: { class: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
}

// ─── Subjects ────────────────────────────────────────────────────────────────

async function listSubjects(schoolId) {
  return prisma.subject.findMany({ where: { schoolId }, orderBy: { name: 'asc' } });
}

async function getSubject(id, schoolId) {
  const subject = await prisma.subject.findFirst({ where: { id, schoolId } });
  if (!subject) throw notFoundError('Subject not found.');
  return subject;
}

async function createSubject(data, schoolId) {
  if (!data.name || !data.code) throw badRequestError('Subject name and code are required.');
  const existing = await prisma.subject.findFirst({ where: { schoolId, code: data.code } });
  if (existing) throw conflictError(`A subject with code "${data.code}" already exists.`);
  return prisma.subject.create({
    data: { schoolId, name: data.name, code: data.code, description: data.description ?? undefined },
  });
}

async function updateSubject(id, data, schoolId) {
  await getSubject(id, schoolId);
  return prisma.subject.update({
    where: { id },
    data: { name: data.name, code: data.code, description: data.description },
  });
}

async function deleteSubject(id, schoolId) {
  await getSubject(id, schoolId);
  const used = await prisma.classSubject.count({ where: { subjectId: id } });
  if (used > 0) throw conflictError('Cannot delete a subject that is assigned to a class.');
  return prisma.subject.delete({ where: { id } });
}

// ─── Teacher assignment (school-ms ClassSubject pattern) ─────────────────────

// All class+subject pairings for a school, with assigned teacher
async function listClassSubjects(schoolId) {
  return prisma.classSubject.findMany({
    where: { class: { schoolId } },
    include: { class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } },
    orderBy: [{ class: { name: 'asc' } }, { subject: { name: 'asc' } }],
  });
}

async function getTeacherAssignments(teacherId, schoolId) {
  return prisma.classSubject.findMany({
    where: { teacherId, class: { schoolId } },
    include: { class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } },
    orderBy: [{ class: { name: 'asc' } }, { subject: { name: 'asc' } }],
  });
}

// assignments: [{ classId, subjectId }] — replaces all current assignments (school-ms behavior)
async function assignTeacherClasses(teacherId, assignments, schoolId) {
  const teacher = await getTeacher(teacherId, schoolId);

  // Clear existing assignments for this teacher
  await prisma.classSubject.updateMany({
    where: { teacherId: teacher.id, class: { schoolId } },
    data: { teacherId: null },
  });

  const pairs = Array.isArray(assignments) ? assignments : [];
  const seen = new Set();
  for (const a of pairs) {
    if (!a.classId || !a.subjectId) continue;
    const key = `${a.classId}::${a.subjectId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Validate class + subject belong to school
    const [cls, subject] = await Promise.all([
      prisma.class.findFirst({ where: { id: a.classId, schoolId } }),
      prisma.subject.findFirst({ where: { id: a.subjectId, schoolId } }),
    ]);
    if (!cls || !subject) throw badRequestError('Invalid class or subject assignment.');

    // Ensure the class+subject row exists, then take it over (clears any previous teacher)
    await prisma.classSubject.upsert({
      where: { classId_subjectId: { classId: a.classId, subjectId: a.subjectId } },
      update: { teacherId: teacher.id },
      create: { classId: a.classId, subjectId: a.subjectId, teacherId: teacher.id },
    });
  }

  return getTeacherAssignments(teacher.id, schoolId);
}

async function assignSubjectsToClass(classId, data, schoolId) {
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
  if (!cls) throw notFoundError('Class not found.');
  const subjectIds = data.subjectIds || [];
  await prisma.classSubject.deleteMany({ where: { classId, class: { schoolId } } });
  if (subjectIds.length > 0) {
    await prisma.classSubject.createMany({
      data: subjectIds.map((subjectId) => ({ classId, subjectId })),
      skipDuplicates: true,
    });
  }
  return listClassSubjects(schoolId);
}

// ─── Teachers ────────────────────────────────────────────────────────────────

async function listTeachers(schoolId) {
  const teachers = await prisma.user.findMany({
    where: { schoolId, role: 'TEACHER' },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true, teacherNo: true, status: true,
      classSubjects: { include: { class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } } },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
  return teachers.map((t) => ({
    id: t.id, firstName: t.firstName, lastName: t.lastName,
    name: `${t.firstName} ${t.lastName}`,
    email: t.email, phone: t.phone, teacherNo: t.teacherNo, status: t.status,
    assignments: t.classSubjects.map((cs) => ({ classId: cs.class?.id, className: cs.class?.name, subjectId: cs.subject?.id, subjectName: cs.subject?.name })),
  }));
}

async function getTeacher(id, schoolId) {
  const teacher = await prisma.user.findFirst({ where: { id, schoolId, role: 'TEACHER' } });
  if (!teacher) throw notFoundError('Teacher not found.');
  return teacher;
}

async function getTeacherDetail(id, schoolId) {
  const teacher = await getTeacher(id, schoolId);
  const [assignments, loans] = await Promise.all([
    prisma.classSubject.findMany({
      where: { teacherId: id, class: { schoolId } },
      include: { class: { select: { name: true } }, subject: { select: { name: true } } },
    }),
    prisma.libraryLoan.findMany({
      where: { schoolId, borrowerType: 'TEACHER', borrowerCode: teacher.teacherNo, dateReturned: null },
    }),
  ]);

  return {
    ...teacher,
    passwordHash: undefined,
    assignments: assignments.map((a) => ({ className: a.class?.name, subjectName: a.subject?.name })),
    debts: {
      fees: [],
      feesOutstanding: 0,
      books: loans.map((l) => ({ id: l.id, bookTitle: l.bookTitle, dateReceived: l.dateReceived })),
      booksOutstanding: loans.length,
    },
  };
}

async function createTeacher(data, schoolId) {
  const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
  if (data.email && existingEmail) throw conflictError('A user with this email already exists.');

  // No password field — default password Teacher@1234
  const password = 'Teacher@1234';
  const passwordHash = await bcrypt.hash(password, 12);

  const teachers = await prisma.user.findMany({
    where: { schoolId, role: 'TEACHER' },
    select: { teacherNo: true },
    orderBy: { createdAt: 'asc' },
  });
  const teacherNo = data.teacherNo || nextTeacherNo(teachers);

  const teacher = await prisma.user.create({
    data: {
      schoolId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? `${firstNameToEmail(data.firstName, data.lastName, schoolId)}`,
      phone: data.phone ?? null,
      teacherNo,
      passwordHash,
      role: 'TEACHER',
      status: data.status || 'ACTIVE',
    },
  });
  return { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName, email: teacher.email, phone: teacher.phone, teacherNo: teacher.teacherNo, status: teacher.status };
}

function firstNameToEmail(first, last, schoolId) {
  const base = `${first || 'teacher'}.${last || 'school'}`.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return `${base}${schoolId.slice(0, 4)}@school.local`;
}

async function updateTeacher(id, data, schoolId) {
  await getTeacher(id, schoolId);
  if (data.email) {
    const existing = await prisma.user.findFirst({ where: { email: data.email, id: { not: id } } });
    if (existing) throw conflictError('A user with this email already exists.');
  }
  return prisma.user.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone ?? undefined,
      teacherNo: data.teacherNo,
      status: data.status,
    },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, teacherNo: true, status: true },
  });
}

async function deleteTeacher(id, schoolId) {
  await getTeacher(id, schoolId);
  return prisma.user.delete({ where: { id } });
}

// ─── Search: people (students + teachers) by ID or name ──────────────────────

async function searchPeople(schoolId, query) {
  const q = (query || '').trim();
  if (!q) return { students: [], teachers: [] };

  const [students, teachers] = await Promise.all([
    prisma.student.findMany({
      where: {
        schoolId,
        OR: [
          { studentCode: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 15,
      include: { class: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: {
        schoolId,
        role: 'TEACHER',
        OR: [
          { teacherNo: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 15,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
  ]);

  return {
    students: students.map((s) => ({ id: s.id, type: 'STUDENT', code: s.studentCode, name: s.name, className: s.class?.name })),
    teachers: teachers.map((t) => ({ id: t.id, type: 'TEACHER', code: t.teacherNo, name: `${t.firstName} ${t.lastName}`, className: null })),
  };
}

module.exports = {
  listStudentsByClass, getStudent, getStudentDetail, createStudent, updateStudent, deleteStudent,
  searchStudents, searchPeople,
  listSubjects, getSubject, createSubject, updateSubject, deleteSubject,
  listClassSubjects, getTeacherAssignments, assignTeacherClasses, assignSubjectsToClass,
  listTeachers, getTeacher, getTeacherDetail, createTeacher, updateTeacher, deleteTeacher,
};
