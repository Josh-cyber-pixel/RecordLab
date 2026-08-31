// src/modules/incidents/incidents.service.js
const prisma = require('../../config/prisma');
const { notFoundError } = require('../../utils/errors');

async function listIncidents(schoolId, { personType, startDate, endDate } = {}) {
  const where = { schoolId };
  if (personType) where.personType = personType;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate)   where.date.lte = new Date(endDate);
  }
  return prisma.incident.findMany({ where, orderBy: { date: 'desc' } });
}

async function getIncidentById(id, schoolId) {
  const incident = await prisma.incident.findFirst({ where: { id, schoolId } });
  if (!incident) throw notFoundError('Incident record not found.');
  return incident;
}

async function createIncident(data, schoolId) {
  return prisma.incident.create({
    data: {
      schoolId,
      personType:  data.personType,
      name:        data.name,
      date:        new Date(data.date),
      incident:    data.incident,
      actionTaken: data.actionTaken ?? null,
      remarks:     data.remarks ?? null,
    },
  });
}

async function updateIncident(id, data, schoolId) {
  await getIncidentById(id, schoolId);
  return prisma.incident.update({
    where: { id },
    data: {
      personType:  data.personType,
      name:        data.name,
      date:        data.date ? new Date(data.date) : undefined,
      incident:    data.incident,
      actionTaken: data.actionTaken ?? null,
      remarks:     data.remarks ?? null,
    },
  });
}

async function deleteIncident(id, schoolId) {
  await getIncidentById(id, schoolId);
  return prisma.incident.delete({ where: { id } });
}

async function getIncidentSummary(schoolId) {
  const incidents = await listIncidents(schoolId);
  const byType = {};
  for (const i of incidents) byType[i.personType] = (byType[i.personType] || 0) + 1;
  return { count: incidents.length, byType };
}

module.exports = { listIncidents, getIncidentById, createIncident, updateIncident, deleteIncident, getIncidentSummary };
