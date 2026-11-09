module.exports = async (req, res) => {
  const handler = (await import('../frontend/api/index.js')).default;
  return handler(req, res);
};
