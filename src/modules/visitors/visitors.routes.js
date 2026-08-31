// src/modules/visitors/visitors.routes.js
const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const ctrl    = require('./visitors.controller');
const { authenticate, protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const READ_ROLES  = ['ADMIN', 'ACCOUNTANT', 'TEACHER', 'VIEWER'];
const WRITE_ROLES = ['ADMIN', 'ACCOUNTANT', 'TEACHER'];

router.use(authenticate);

router.get('/',    protect(...READ_ROLES), ctrl.listVisitors);
router.get('/:id', protect(...READ_ROLES), ctrl.getVisitor);

router.post('/', protect(...WRITE_ROLES),
  body('date').isISO8601().withMessage('Valid date required'),
  body('visitorName').notEmpty().withMessage('Visitor name is required'),
  validate, ctrl.createVisitor);

router.patch('/:id', protect(...WRITE_ROLES), validate, ctrl.updateVisitor);
router.delete('/:id', protect(...WRITE_ROLES), ctrl.deleteVisitor);

module.exports = router;
