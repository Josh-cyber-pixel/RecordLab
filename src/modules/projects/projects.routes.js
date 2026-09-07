// src/modules/projects/projects.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('./projects.controller');
const { authenticate, protect } = require('../../middleware/auth');

const FINANCE = ['ADMIN', 'ACCOUNTANT'];

router.use(authenticate);

router.get('/',      protect(...FINANCE), ctrl.listProjects);
router.get('/:id',   protect(...FINANCE), ctrl.getProject);
router.post('/',     protect(...FINANCE), ctrl.createProject);
router.patch('/:id', protect(...FINANCE), ctrl.updateProject);
router.delete('/:id', protect(...FINANCE), ctrl.deleteProject);

module.exports = router;
