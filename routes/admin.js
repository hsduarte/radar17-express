const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const Question = require('../models/Question');
const Vote = require('../models/Vote');
const socketService = require('../services/socketService');
const stateService = require('../services/stateService');

// Ativar questão
router.post('/activate-question', async (req, res) => {
  try {
    const { questionId } = req.body;
    const question = await adminController.activateQuestion(questionId);
    res.status(200).json({ 
      success: true,
      question
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Iniciar votação
router.post('/start-voting', async (req, res) => {
  try {
    await adminController.startVoting();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Finalizar questão
router.post('/finalize-question', async (req, res) => {
  try {
    const result = await adminController.finalizeQuestion();
    res.status(200).json({ 
      success: true,
      result
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Resetar pontuações
router.post('/reset-scores', async (req, res) => {
  try {
    await adminController.resetScores();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Limpar dados
router.post('/clear-data', async (req, res) => {
  try {
    // Apagar votos
    await Vote.deleteMany({});
    
    // Resetar questões mas manter textos e ordens
    await Question.updateMany({}, { 
      isActive: false,
      isFinalized: false,
      teamAVotes: 0,
      teamBVotes: 0
    });
    
    // Resetar estado
    stateService.resetState();
    
    // Notificar clientes
    const io = socketService.getIO();
    io.emit('dataCleared');
    io.emit('scoresReset', { teamA: 0, teamB: 0 });
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Resetar base de dados
router.post('/reset-database', async (req, res) => {
  try {
    // Apagar tudo
    await Vote.deleteMany({});
    await Question.deleteMany({});
    
    // Resetar estado
    stateService.resetState();
    
    // Notificar clientes
    socketService.getIO().emit('databaseReset');
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/update-team-names', async (req, res) => {
    try {
      const { teamAName, teamBName } = req.body;
      const result = await adminController.updateTeamNames(teamAName, teamBName);
      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao atualizar nomes das equipes:', error);
      res.status(400).json({ error: error.message });
    }
  });

module.exports = router;