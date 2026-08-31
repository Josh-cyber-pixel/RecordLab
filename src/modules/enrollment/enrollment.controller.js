// src/modules/enrollment/enrollment.controller.js
const svc = require('./enrollment.service');
const { success, created } = require('../../utils/response');

exports.listStudentsByClass = async (req, res, next) => { try { success(res, await svc.listStudentsByClass(req.schoolId)); } catch (e) { next(e); } };
exports.getStudent = async (req, res, next) => { try { success(res, await svc.getStudent(req.params.id, req.schoolId)); } catch (e) { next(e); } };
exports.createStudent = async (req, res, next) => { try { created(res, await svc.createStudent(req.body, req.schoolId), 'Student enrolled'); } catch (e) { next(e); } };
exports.updateStudent = async (req, res, next) => { try { success(res, await svc.updateStudent(req.params.id, req.body, req.schoolId), 'Student updated'); } catch (e) { next(e); } };
exports.deleteStudent = async (req, res, next) => { try { success(res, await svc.deleteStudent(req.params.id, req.schoolId), 'Student removed from enrolment'); } catch (e) { next(e); } };
exports.listTeachers = async (req, res, next) => { try { success(res, await svc.listTeachers(req.schoolId)); } catch (e) { next(e); } };
