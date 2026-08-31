// src/modules/classes/classes.controller.js
const svc = require('./classes.service');
const { success, created } = require('../../utils/response');

exports.listClasses = async (req, res, next) => { try { success(res, await svc.listClasses(req.schoolId)); } catch (e) { next(e); } };
exports.getClass = async (req, res, next) => { try { success(res, await svc.getClass(req.params.id, req.schoolId)); } catch (e) { next(e); } };
exports.createClass = async (req, res, next) => { try { created(res, await svc.createClass(req.body, req.schoolId), 'Class created'); } catch (e) { next(e); } };
exports.updateClass = async (req, res, next) => { try { success(res, await svc.updateClass(req.params.id, req.body, req.schoolId), 'Class updated'); } catch (e) { next(e); } };
exports.deleteClass = async (req, res, next) => { try { success(res, await svc.deleteClass(req.params.id, req.schoolId), 'Class deleted'); } catch (e) { next(e); } };
