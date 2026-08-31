// src/modules/ledger/ledger.controller.js
const svc = require('./ledger.service');
const { success, created } = require('../../utils/response');

exports.listLedger = async (req, res, next) => { try { success(res, await svc.listLedger(req.schoolId, req.query)); } catch (e) { next(e); } };
exports.listLedgerByClass = async (req, res, next) => { try { success(res, await svc.listLedgerByClass(req.schoolId, req.query)); } catch (e) { next(e); } };
exports.getLedgerSummary = async (req, res, next) => { try { success(res, await svc.getLedgerSummary(req.schoolId, req.query)); } catch (e) { next(e); } };
exports.getLedgerEntry = async (req, res, next) => { try { success(res, await svc.getLedgerEntry(req.params.id, req.schoolId)); } catch (e) { next(e); } };
exports.createLedgerEntry = async (req, res, next) => { try { created(res, await svc.createLedgerEntry(req.body, req.schoolId), 'Ledger entry created'); } catch (e) { next(e); } };
exports.updateLedgerEntry = async (req, res, next) => { try { success(res, await svc.updateLedgerEntry(req.params.id, req.body, req.schoolId), 'Ledger entry updated'); } catch (e) { next(e); } };
exports.deleteLedgerEntry = async (req, res, next) => { try { success(res, await svc.deleteLedgerEntry(req.params.id, req.schoolId), 'Ledger entry deleted'); } catch (e) { next(e); } };
exports.bulkUpsertLedger = async (req, res, next) => {
  try {
    const result = await svc.bulkUpsertLedger({
      schoolId: req.schoolId,
      type:     req.body.type,
      classId:  req.body.classId,
      entries:  req.body.entries,
    });
    success(res, result, 'Ledger entries saved');
  } catch (e) { next(e); }
};
