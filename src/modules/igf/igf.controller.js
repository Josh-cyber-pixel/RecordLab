// src/modules/igf/igf.controller.js
const svc = require('./igf.service');
const { success, created } = require('../../utils/response');

exports.listIncome = async (req, res, next) => { try { success(res, await svc.listIncome(req.schoolId, req.query)); } catch (e) { next(e); } };
exports.getIncomeSummary = async (req, res, next) => { try { success(res, await svc.getIncomeSummary(req.schoolId, req.query)); } catch (e) { next(e); } };
exports.getIncomeSources = async (req, res, next) => { try { success(res, await svc.getIncomeSources(req.schoolId)); } catch (e) { next(e); } };
exports.createIncome = async (req, res, next) => { try { created(res, await svc.createIncome(req.body, req.schoolId), 'Income recorded'); } catch (e) { next(e); } };
exports.updateIncome = async (req, res, next) => { try { success(res, await svc.updateIncome(req.params.id, req.body, req.schoolId), 'Income updated'); } catch (e) { next(e); } };
exports.deleteIncome = async (req, res, next) => { try { success(res, await svc.deleteIncome(req.params.id, req.schoolId), 'Income deleted'); } catch (e) { next(e); } };
