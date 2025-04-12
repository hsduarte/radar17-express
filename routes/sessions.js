const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

// Obter todas as sessões
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    console.error('Erro ao buscar sessões:', error);
    res.status(500).json({ error: 'Erro ao buscar sessões' });
  }
});

// Adicione outras rotas conforme necessário

module.exports = router;