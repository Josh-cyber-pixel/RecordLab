// src/modules/projects/projects.controller.js
const svc = require('./projects.service');
const { success, created } = require('../../utils/response');

exports.listProjects = async (req, res, next) => {
  try { success(res, await svc.listProjects(req.schoolId)); }
  catch (e) { next(e); }
};

exports.getProject = async (req, res, next) => {
  try { success(res, await svc.getProject(req.params.id, req.schoolId)); }
  catch (e) { next(e); }
};

exports.createProject = async (req, res, next) => {
  try { created(res, await svc.createProject(req.body, req.schoolId, req.user.id), 'Project created.'); }
  catch (e) { next(e); }
};

exports.updateProject = async (req, res, next) => {
  try { success(res, await svc.updateProject(req.params.id, req.body, req.schoolId), 'Project updated.'); }
  catch (e) { next(e); }
};

exports.deleteProject = async (req, res, next) => {
  try { success(res, await svc.deleteProject(req.params.id, req.schoolId), 'Project deleted.'); }
  catch (e) { next(e); }
};
