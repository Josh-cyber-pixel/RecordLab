// src/modules/incidents/incidents.routes.js
const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const ctrl    = require('./incidents.controller');
const { authenticate, protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const READ_ROLES  = ['ADMIN', 'ACCOUNTANT', 'TEACHER', 'VIEWER'];
const WRITE_ROLES = ['ADMIN', 'ACCOUNTANT', 'TEACHER'];
const PERSON_TYPES = ['STUDENT', 'TEACHER'];

router.use(authenticate);

router.get('/summary', protect(...READ_ROLES), ctrl.getIncidentSummary);
router.get('/',        protect(...READ_ROLES), ctrl.listIncidents);
router.get('/:id',     protect(...READ_ROLES), ctrl.getIncidentById);

router.post('/', protect(...WRITE_ROLES),
  body('personType').isIn(PERSON_TYPES).withMessage('Person type must be STUDENT or TEACHER'),
  body('name').notEmpty().withMessage('Name is required'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('incident').notEmpty().withMessage('Incident description is required'),
  validate, ctrl.createIncident);

router.patch('/:id', protect(...WRITE_ROLES), validate, ctrl.updateIncident);
router.delete('/:id', protect(...WRITE_ROLES), ctrl.deleteIncident);

module.exports = router;
