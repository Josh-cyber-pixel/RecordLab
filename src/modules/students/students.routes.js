// src/modules/students/students.routes.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl   = require('./students.controller');
const { authenticate, protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const READ = ['ADMIN', 'ACCOUNTANT', 'TEACHER', 'VIEWER'];
const ADMINS = ['ADMIN'];

router.use(authenticate);

// ── Search (must be before /:id) ─────────────────────────────────────────────
router.get('/search', protect(...READ), ctrl.searchPeople);

// ── Subjects ─────────────────────────────────────────────────────────────────
router.get('/subjects', protect(...READ), ctrl.listSubjects);
router.post('/subjects', protect(...ADMINS),
  body('name').notEmpty().withMessage('Subject name is required'),
  body('code').notEmpty().withMessage('Subject code is required'),
  validate, ctrl.createSubject);
router.patch('/subjects/:id', protect(...ADMINS), validate, ctrl.updateSubject);
router.delete('/subjects/:id', protect(...ADMINS), ctrl.deleteSubject);

// ── Class-subjects & teacher assignment ──────────────────────────────────────
router.get('/class-subjects', protect(...READ), ctrl.listClassSubjects);
router.get('/teachers/:id/assignments', protect(...READ), ctrl.getTeacherAssignments);
router.patch('/teachers/:id/assignments', protect(...ADMINS),
  body('assignments').isArray().withMessage('assignments must be an array'),
  validate, ctrl.assignTeacherClasses);
router.patch('/classes/:classId/subjects', protect(...ADMINS), ctrl.assignSubjectsToClass);

// ── Teachers (before student /:id so static path wins) ───────────────────────
router.get('/teachers',           protect(...READ), ctrl.listTeachers);
router.get('/teachers/:id',       protect(...READ), ctrl.getTeacher);
router.post('/teachers', protect(...ADMINS),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  validate, ctrl.createTeacher);
router.patch('/teachers/:id', protect(...ADMINS),
  body('email').optional().isEmail(),
  validate, ctrl.updateTeacher);
router.delete('/teachers/:id',    protect(...ADMINS), ctrl.deleteTeacher);

// ── Students ─────────────────────────────────────────────────────────────────
router.get('/',                   protect(...READ), ctrl.listStudents);
router.post('/', protect(...ADMINS),
  body('classId').notEmpty().withMessage('Class is required'),
  validate, ctrl.createStudent);

// Student detail + PDF export (before generic /:id)
router.get('/:id/export-pdf',     protect(...READ), ctrl.exportStudentPdf);
router.get('/:id/detail',         protect(...READ), ctrl.getStudentDetail);

router.get('/:id',                protect(...READ), ctrl.getStudent);
router.patch('/:id', protect(...ADMINS), validate, ctrl.updateStudent);
router.delete('/:id',             protect(...ADMINS), ctrl.deleteStudent);

module.exports = router;
