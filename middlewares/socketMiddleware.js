const socketService = require('../services/socketService');

// Middleware para disponibilizar o io nas rotas
module.exports = (req, res, next) => {
  req.io = socketService.getIO();
  next();
};