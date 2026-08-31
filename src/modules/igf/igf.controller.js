// src/modules/igf/igf.controller.js
const svc = require('./igf.service');
const { success, created } = require('../../utils/response');

exports.listIncome = async (req, res, next) => { try { success(res, await svc.listIncome(req.schoolId, req.query)); } catch (e) { next(e); } };
exports.getIncomeSummary = async (req, res, next) => { try { success(res, await svc.getIncomeSummary(req.schoolId, req.query)); } catch (e) { next(e); } };
exports.createIncome = async (req, res, next) => { try { created(res, await svc.createIncome(req.body, req.schoolId), 'Income recorded'); } catch (e) { next(e); } };
exports.updateIncome = async (req, res, next) => { try { success(res, await svc.updateIncome(req.params.id, req.body, req.schoolId), 'Income updated'); } catch (e) { next(e); } };
exports.deleteIncome = async (req, res, next) => { try { success(res, await svc.deleteIncome(req.params.id, req.schoolId), 'Income deleted'); } catch (e) { next(e); } };

exports.listProjects = async (req, res, next) => { try { success(res, await svc.listProjects(req.schoolId, req.query)); } catch (e) { next(e); } };
exports.getProjectsSummary = async (req, res, next) => { try { success(res, await svc.getProjectsSummary(req.schoolId)); } catch (e) { next(e); } };
exports.createProject = async (req, res, next) => { try { created(res, await svc.createProject(req.body, req.schoolId), 'Project recorded'); } catch (e) { next(e); } };
exports.updateProject = async (req, res, next) => { try { success(res, await svc.updateProject(req.params.id, req.body, req.schoolId), 'Project updated'); } catch (e) { next(e); } };
exports.deleteProject = async (req, res, next) => { try { success(res, await svc.deleteProject(req.params.id, req.schoolId), 'Project deleted'); } catch (e) { next(e); } };
