// src/utils/response.js
const success = (res, data = {}, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ status: 'success', message, data });

const created = (res, data = {}, message = 'Created successfully') =>
  success(res, data, message, 201);

const paginated = (res, data, meta) =>
  res.status(200).json({ status: 'success', data, meta });

module.exports = { success, created, paginated };
