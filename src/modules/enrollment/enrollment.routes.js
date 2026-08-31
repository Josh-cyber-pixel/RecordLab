// src/modules/enrollment/enrollment.routes.js
const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const ctrl    = require('./enrollment.controller');
const { authenticate, protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const READ_ROLES  = ['ADMIN', 'ACCOUNTANT', 'TEACHER', 'VIEWER'];
const WRITE_ROLES = ['ADMIN'];

router.use(authenticate);

router.get('/students',  protect(...READ_ROLES), ctrl.listStudentsByClass);
router.get('/teachers',  protect(...READ_ROLES), ctrl.listTeachers);
router.get('/students/:id', protect(...READ_ROLES), ctrl.getStudent);

router.post('/students', protect(...WRITE_ROLES),
  body('classId').notEmpty().withMessage('Class is required'),
  body('name').notEmpty().withMessage('Student name is required'),
  validate, ctrl.createStudent);

router.patch('/students/:id', protect(...WRITE_ROLES),
  body('name').optional().notEmpty(),
  validate, ctrl.updateStudent);

router.delete('/students/:id', protect(...WRITE_ROLES), ctrl.deleteStudent);

module.exports = router;
