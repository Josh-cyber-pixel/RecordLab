// src/modules/incidents/incidents.controller.js
const svc = require('./incidents.service');
const { success, created } = require('../../utils/response');

exports.listIncidents = async (req, res, next) => { try { success(res, await svc.listIncidents(req.schoolId, req.query)); } catch (e) { next(e); } };
exports.getIncidentSummary = async (req, res, next) => { try { success(res, await svc.getIncidentSummary(req.schoolId)); } catch (e) { next(e); } };
exports.getIncidentById = async (req, res, next) => { try { success(res, await svc.getIncidentById(req.params.id, req.schoolId)); } catch (e) { next(e); } };
exports.createIncident = async (req, res, next) => { try { created(res, await svc.createIncident(req.body, req.schoolId), 'Incident recorded'); } catch (e) { next(e); } };
exports.updateIncident = async (req, res, next) => { try { success(res, await svc.updateIncident(req.params.id, req.body, req.schoolId), 'Incident updated'); } catch (e) { next(e); } };
exports.deleteIncident = async (req, res, next) => { try { success(res, await svc.deleteIncident(req.params.id, req.schoolId), 'Incident deleted'); } catch (e) { next(e); } };
