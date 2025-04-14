const express = require('express');
const router = express.Router();
const prisma = require('../services/prismaService');

// Get all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Erro ao buscar sessões:', error);
    res.status(500).json({ error: 'Erro ao buscar sessões' });
  }
});

// Adicione outras rotas conforme necessário

module.exports = router;