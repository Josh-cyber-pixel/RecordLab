// src/modules/achievements/achievements.controller.js
const svc = require('./achievements.service');
const { success } = require('../../utils/response');

exports.getAchievements = async (req, res, next) => {
  try { success(res, await svc.getAchievements(req.schoolId)); } catch (e) { next(e); }
};
