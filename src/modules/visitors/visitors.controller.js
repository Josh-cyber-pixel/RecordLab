// src/modules/visitors/visitors.controller.js
const svc = require('./visitors.service');
const { success, created } = require('../../utils/response');

exports.listVisitors = async (req, res, next) => { try { success(res, await svc.listVisitors(req.schoolId, req.query)); } catch (e) { next(e); } };
exports.getVisitor = async (req, res, next) => { try { success(res, await svc.getVisitor(req.params.id, req.schoolId)); } catch (e) { next(e); } };
exports.createVisitor = async (req, res, next) => { try { created(res, await svc.createVisitor(req.body, req.schoolId), 'Visitor logged'); } catch (e) { next(e); } };
exports.updateVisitor = async (req, res, next) => { try { success(res, await svc.updateVisitor(req.params.id, req.body, req.schoolId), 'Visitor updated'); } catch (e) { next(e); } };
exports.deleteVisitor = async (req, res, next) => { try { success(res, await svc.deleteVisitor(req.params.id, req.schoolId), 'Visitor removed'); } catch (e) { next(e); } };
