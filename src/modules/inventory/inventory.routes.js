// src/modules/inventory/inventory.routes.js
const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const ctrl    = require('./inventory.controller');
const { authenticate, protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const READ_ROLES  = ['ADMIN', 'ACCOUNTANT', 'TEACHER', 'VIEWER'];
const WRITE_ROLES = ['ADMIN', 'ACCOUNTANT'];

router.use(authenticate);

router.get('/summary', protect(...READ_ROLES), ctrl.getInventorySummary);
router.get('/',         protect(...READ_ROLES), ctrl.listInventory);
router.get('/:id',      protect(...READ_ROLES), ctrl.getInventoryItem);

router.post('/',  protect(...WRITE_ROLES),
  body('name').notEmpty().withMessage('Item name is required'),
  body('category').optional().isIn(['BOOKS', 'STATIONERY', 'EQUIPMENT', 'OTHER']).withMessage('Invalid category'),
  body('quantity').optional().isFloat(),
  body('author').optional().isString(),
  validate, ctrl.createInventoryItem);
router.patch('/:id', protect(...WRITE_ROLES),
  body('category').optional().isIn(['BOOKS', 'STATIONERY', 'EQUIPMENT', 'OTHER']).withMessage('Invalid category'),
  body('quantity').optional().isFloat(),
  body('author').optional().isString(),
  validate, ctrl.updateInventoryItem);
router.delete('/:id', protect(...WRITE_ROLES), ctrl.deleteInventoryItem);

module.exports = router;
