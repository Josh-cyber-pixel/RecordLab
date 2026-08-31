// src/modules/library/library.controller.js
const svc = require('./library.service');
const { success, created } = require('../../utils/response');

exports.listLoans = async (req, res, next) => { try { success(res, await svc.listLoans(req.schoolId, req.query)); } catch (e) { next(e); } };
exports.getLibrarySummary = async (req, res, next) => { try { success(res, await svc.getLibrarySummary(req.schoolId)); } catch (e) { next(e); } };
exports.getLoanById = async (req, res, next) => { try { success(res, await svc.getLoanById(req.params.id, req.schoolId)); } catch (e) { next(e); } };
exports.createLoan = async (req, res, next) => { try { created(res, await svc.createLoan(req.body, req.schoolId), 'Loan recorded'); } catch (e) { next(e); } };
exports.updateLoan = async (req, res, next) => { try { success(res, await svc.updateLoan(req.params.id, req.body, req.schoolId), 'Loan updated'); } catch (e) { next(e); } };
exports.deleteLoan = async (req, res, next) => { try { success(res, await svc.deleteLoan(req.params.id, req.schoolId), 'Loan deleted'); } catch (e) { next(e); } };
