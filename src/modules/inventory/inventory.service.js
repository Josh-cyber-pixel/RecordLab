// src/modules/inventory/inventory.service.js
const prisma = require('../../config/prisma');
const { notFoundError } = require('../../utils/errors');

async function listInventory(schoolId) {
  const items = await prisma.inventoryItem.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' },
  });
  return items.map((it, i) => ({ serial: i + 1, ...it }));
}

async function getInventoryItem(id, schoolId) {
  const item = await prisma.inventoryItem.findFirst({ where: { id, schoolId } });
  if (!item) throw notFoundError('Inventory item not found.');
  return item;
}

async function createInventoryItem(data, schoolId) {
  return prisma.inventoryItem.create({
    data: {
      schoolId,
      name:     data.name,
      quantity: data.quantity != null ? parseFloat(data.quantity) : 0,
      source:   data.source ?? null,
    },
  });
}

async function updateInventoryItem(id, data, schoolId) {
  await getInventoryItem(id, schoolId);
  return prisma.inventoryItem.update({
    where: { id },
    data: {
      name:     data.name,
      quantity: data.quantity != null ? parseFloat(data.quantity) : undefined,
      source:   data.source ?? undefined,
    },
  });
}

async function deleteInventoryItem(id, schoolId) {
  await getInventoryItem(id, schoolId);
  return prisma.inventoryItem.delete({ where: { id } });
}

async function getInventorySummary(schoolId) {
  const items = await listInventory(schoolId);
  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
  const lowStock = items.filter(i => i.quantity <= 0);
  return { totalItems: items.length, totalQuantity, lowStockCount: lowStock.length };
}

module.exports = {
  listInventory, getInventoryItem, createInventoryItem,
  updateInventoryItem, deleteInventoryItem, getInventorySummary,
};
