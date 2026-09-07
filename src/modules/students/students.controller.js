// src/modules/students/students.controller.js
const svc = require('./students.service');
const { success, created } = require('../../utils/response');
const { buildStudentPdf } = require('./students.pdf');
const { notFoundError } = require('../../utils/errors');

// ─── Students ────────────────────────────────────────────────────────────────
exports.listStudents = async (req, res, next) => {
  try { success(res, await svc.listStudentsByClass(req.schoolId)); } catch (e) { next(e); }
};
exports.getStudent = async (req, res, next) => {
  try { success(res, await svc.getStudent(req.params.id, req.schoolId)); } catch (e) { next(e); }
};
exports.getStudentDetail = async (req, res, next) => {
  try { success(res, await svc.getStudentDetail(req.params.id, req.schoolId)); } catch (e) { next(e); }
};
exports.createStudent = async (req, res, next) => {
  try { created(res, await svc.createStudent(req.body, req.schoolId), 'Student enrolled'); } catch (e) { next(e); }
};
exports.updateStudent = async (req, res, next) => {
  try { success(res, await svc.updateStudent(req.params.id, req.body, req.schoolId), 'Student updated'); } catch (e) { next(e); }
};
exports.deleteStudent = async (req, res, next) => {
  try { success(res, await svc.deleteStudent(req.params.id, req.schoolId), 'Student removed'); } catch (e) { next(e); }
};
exports.exportStudentPdf = async (req, res, next) => {
  try {
    const student = await svc.getStudentDetail(req.params.id, req.schoolId);
    const school = await require('../../config/prisma').school.findFirst({ where: { id: req.schoolId } });
    const pdf = await buildStudentPdf(student, school);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${student.studentCode || student.id}.pdf"`);
    res.send(pdf);
  } catch (e) { next(e); }
};

// ─── Teachers ────────────────────────────────────────────────────────────────
exports.listTeachers = async (req, res, next) => {
  try { success(res, await svc.listTeachers(req.schoolId)); } catch (e) { next(e); }
};
exports.getTeacher = async (req, res, next) => {
  try { success(res, await svc.getTeacherDetail(req.params.id, req.schoolId)); } catch (e) { next(e); }
};
exports.createTeacher = async (req, res, next) => {
  try { created(res, await svc.createTeacher(req.body, req.schoolId), 'Teacher created'); } catch (e) { next(e); }
};
exports.updateTeacher = async (req, res, next) => {
  try { success(res, await svc.updateTeacher(req.params.id, req.body, req.schoolId), 'Teacher updated'); } catch (e) { next(e); }
};
exports.deleteTeacher = async (req, res, next) => {
  try { success(res, await svc.deleteTeacher(req.params.id, req.schoolId), 'Teacher removed'); } catch (e) { next(e); }
};

// ─── Subjects ────────────────────────────────────────────────────────────────
exports.listSubjects = async (req, res, next) => {
  try { success(res, await svc.listSubjects(req.schoolId)); } catch (e) { next(e); }
};
exports.createSubject = async (req, res, next) => {
  try { created(res, await svc.createSubject(req.body, req.schoolId), 'Subject added'); } catch (e) { next(e); }
};
exports.updateSubject = async (req, res, next) => {
  try { success(res, await svc.updateSubject(req.params.id, req.body, req.schoolId), 'Subject updated'); } catch (e) { next(e); }
};
exports.deleteSubject = async (req, res, next) => {
  try { success(res, await svc.deleteSubject(req.params.id, req.schoolId), 'Subject removed'); } catch (e) { next(e); }
};

// ─── Teacher assignment ──────────────────────────────────────────────────────
exports.listClassSubjects = async (req, res, next) => {
  try { success(res, await svc.listClassSubjects(req.schoolId)); } catch (e) { next(e); }
};
exports.getTeacherAssignments = async (req, res, next) => {
  try { success(res, await svc.getTeacherAssignments(req.params.id, req.schoolId)); } catch (e) { next(e); }
};
exports.assignTeacherClasses = async (req, res, next) => {
  try {
    const data = await svc.assignTeacherClasses(req.params.id, req.body.assignments || [], req.schoolId);
    success(res, data, 'Teacher assignments updated');
  } catch (e) { next(e); }
};
exports.assignSubjectsToClass = async (req, res, next) => {
  try { success(res, await svc.assignSubjectsToClass(req.params.classId, req.body, req.schoolId), 'Class subjects updated'); } catch (e) { next(e); }
};

// ─── Search ──────────────────────────────────────────────────────────────────
exports.searchPeople = async (req, res, next) => {
  try { success(res, await svc.searchPeople(req.schoolId, req.query.q)); } catch (e) { next(e); }
};
