// src/modules/inventory/inventory.service.js
const prisma = require('../../config/prisma');
const { notFoundError } = require('../../utils/errors');

const CATEGORY_BOOKS = 'BOOKS';
const VALID_CATEGORIES = ['BOOKS', 'STATIONERY', 'EQUIPMENT', 'OTHER'];

function normalize(input) {
  const category = input.category && input.category !== ''
    ? String(input.category).toUpperCase()
    : 'OTHER';
  return {
    name:     input.name,
    category: VALID_CATEGORIES.includes(category) ? category : 'OTHER',
    quantity: input.quantity != null ? parseFloat(input.quantity) : 0,
    source:   input.source ?? null,
    author:   input.author ?? null,
  };
}

// Ensure a LibraryBook exists for a BOOKS-category inventory item and keep its
// stock in sync with the inventory quantity. Returns the LibraryBook or null.
async function syncLibraryBook(item, data) {
  if (data.category !== CATEGORY_BOOKS) return null;

  const copies = Math.max(0, Math.floor(data.quantity || 0));
  const existing = item.libraryBookId
    ? await prisma.libraryBook.findUnique({ where: { id: item.libraryBookId } })
    : null;

  if (existing) {
    return prisma.libraryBook.update({
      where: { id: existing.id },
      data:  { title: data.name, author: data.author ?? existing.author, totalCopies: copies },
    });
  }

  return prisma.libraryBook.create({
    data: {
      schoolId:    item.schoolId,
      title:       data.name,
      author:      data.author ?? null,
      totalCopies: copies,
      inventoryItem: { connect: { id: item.id } },
    },
  });
}

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

async function createInventoryItem(input, schoolId) {
  const data = normalize(input);
  const item = await prisma.inventoryItem.create({
    data: {
      schoolId,
      name:     data.name,
      category: data.category,
      quantity: data.quantity,
      source:   data.source,
    },
  });

  const libraryBook = await syncLibraryBook(item, data);
  if (libraryBook) {
    return prisma.inventoryItem.update({
      where: { id: item.id },
      data:  { libraryBookId: libraryBook.id },
    });
  }
  return item;
}

async function updateInventoryItem(id, input, schoolId) {
  await getInventoryItem(id, schoolId);
  const data = normalize(input);

  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name:     data.name,
      category: data.category,
      quantity: data.quantity,
      source:   data.source ?? null,
    },
  });

  if (data.category === CATEGORY_BOOKS) {
    const libraryBook = await syncLibraryBook(updated, data);
    if (libraryBook && !updated.libraryBookId) {
      return prisma.inventoryItem.update({
        where: { id },
        data:  { libraryBookId: libraryBook.id },
      });
    }
  }

  return updated;
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
