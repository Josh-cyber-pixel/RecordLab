// src/modules/academic/academic.controller.js
const svc = require('./academic.service');
const { success, created } = require('../../utils/response');

// ─── AcademicYears ───────────────────────────────────────────────────────────
exports.listYears = async (req, res, next) => {
  try { success(res, await svc.listYears(req.schoolId)); } catch (e) { next(e); }
};
exports.getYear = async (req, res, next) => {
  try { success(res, await svc.getYear(req.params.id, req.schoolId)); } catch (e) { next(e); }
};
exports.createYear = async (req, res, next) => {
  try { created(res, await svc.createYear(req.body, req.schoolId), 'Academic year created'); } catch (e) { next(e); }
};
exports.updateYear = async (req, res, next) => {
  try { success(res, await svc.updateYear(req.params.id, req.body, req.schoolId), 'Academic year updated'); } catch (e) { next(e); }
};
exports.deleteYear = async (req, res, next) => {
  try { success(res, await svc.deleteYear(req.params.id, req.schoolId), 'Academic year deleted'); } catch (e) { next(e); }
};

// ─── Terms ───────────────────────────────────────────────────────────────────
exports.listTerms = async (req, res, next) => {
  try { success(res, await svc.listTerms(req.params.yearId, req.schoolId)); } catch (e) { next(e); }
};
exports.getTerm = async (req, res, next) => {
  try { success(res, await svc.getTerm(req.params.id, req.schoolId)); } catch (e) { next(e); }
};
exports.createTerm = async (req, res, next) => {
  try { created(res, await svc.createTerm(req.params.yearId, req.body, req.schoolId), 'Term created'); } catch (e) { next(e); }
};
exports.updateTerm = async (req, res, next) => {
  try { success(res, await svc.updateTerm(req.params.id, req.body, req.schoolId), 'Term updated'); } catch (e) { next(e); }
};
exports.deleteTerm = async (req, res, next) => {
  try { success(res, await svc.deleteTerm(req.params.id, req.schoolId), 'Term deleted'); } catch (e) { next(e); }
};
exports.getCurrentTerm = async (req, res, next) => {
  try { success(res, await svc.getCurrentTerm(req.schoolId)); } catch (e) { next(e); }
};
