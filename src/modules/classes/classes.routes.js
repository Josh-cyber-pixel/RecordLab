// src/modules/classes/classes.routes.js
const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const ctrl    = require('./classes.controller');
const { authenticate, protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const READ_ROLES  = ['ADMIN', 'ACCOUNTANT', 'TEACHER', 'VIEWER'];
const WRITE_ROLES = ['ADMIN'];

router.use(authenticate);

router.get('/',    protect(...READ_ROLES), ctrl.listClasses);
router.get('/:id', protect(...READ_ROLES), ctrl.getClass);

router.post('/', protect(...WRITE_ROLES),
  body('name').notEmpty().withMessage('Class name is required'),
  body('order').optional().isInt({ min: 1 }),
  validate, ctrl.createClass);

router.patch('/:id', protect(...WRITE_ROLES), body('order').optional().isInt({ min: 1 }), validate, ctrl.updateClass);
router.delete('/:id', protect(...WRITE_ROLES), ctrl.deleteClass);

module.exports = router;
