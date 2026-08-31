// src/modules/auth/auth.controller.js
const svc = require('./auth.service');
const { success } = require('../../utils/response');

exports.login = async (req, res, next) => {
  try { success(res, await svc.login(req.body), 'Login successful'); } catch (e) { next(e); }
};

exports.me = async (req, res, next) => {
  try { success(res, await svc.me(req.user.id)); } catch (e) { next(e); }
};
