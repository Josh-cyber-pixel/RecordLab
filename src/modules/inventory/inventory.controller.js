// src/modules/inventory/inventory.controller.js
const svc = require('./inventory.service');
const { success, created } = require('../../utils/response');

exports.listInventory = async (req, res, next) => {
  try { success(res, await svc.listInventory(req.schoolId)); } catch (e) { next(e); }
};
exports.getInventorySummary = async (req, res, next) => {
  try { success(res, await svc.getInventorySummary(req.schoolId)); } catch (e) { next(e); }
};
exports.getInventoryItem = async (req, res, next) => {
  try { success(res, await svc.getInventoryItem(req.params.id, req.schoolId)); } catch (e) { next(e); }
};
exports.createInventoryItem = async (req, res, next) => {
  try { created(res, await svc.createInventoryItem(req.body, req.schoolId), 'Inventory item added'); } catch (e) { next(e); }
};
exports.updateInventoryItem = async (req, res, next) => {
  try { success(res, await svc.updateInventoryItem(req.params.id, req.body, req.schoolId), 'Inventory item updated'); } catch (e) { next(e); }
};
exports.deleteInventoryItem = async (req, res, next) => {
  try { success(res, await svc.deleteInventoryItem(req.params.id, req.schoolId), 'Inventory item deleted'); } catch (e) { next(e); }
};
