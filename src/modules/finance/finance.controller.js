// src/modules/finance/finance.controller.js
const svc = require('./finance.service');
const { success } = require('../../utils/response');

exports.getFinanceSummary = async (req, res, next) => {
  try {
    const result = await svc.getFinanceSummary(req.schoolId);
    success(res, result);
  } catch (err) { next(err); }
};
