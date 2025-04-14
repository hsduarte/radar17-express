const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { prisma } = require('../services/prismaService');
const socketService = require('../services/socketService');
const stateService = require('../services/stateService');
const { handleApiError } = require('../utilities/errorHandler');

// Activate question
router.post('/activate-question', async (req, res) => {
  try {
    const { questionId } = req.body;
    
    // Make sure questionId is provided
    if (!questionId) {
      return res.status(400).json({ error: 'ID da questão é obrigatório' });
    }
    
    const question = await adminController.activateQuestion(questionId);
    res.status(200).json({ 
      success: true,
      question
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start voting
router.post('/start-voting', async (req, res) => {
  try {
    const { questionId } = req.body;
    
    // Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Update state
    stateService.setVotingActive(true);
    stateService.setActiveQuestion(question);
    
    // Notify clients
    const io = socketService.getIO();
    io.emit('questionActivated', {
      question,
      isVotingActive: true
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    handleApiError(res, error, 'Error starting voting');
  }
});

// End voting
router.post('/end-voting', async (req, res) => {
  try {
    const { questionId } = req.body;
    
    // Verify question exists and is active
    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });
    
    if (!question) {
      return res.status(400).json({ error: 'Questão não encontrada' });
    }
    
    // Get vote counts
    const teamAVotes = await prisma.vote.count({
      where: {
        questionId: questionId,
        teamVoted: 'A'
      }
    });
    
    const teamBVotes = await prisma.vote.count({
      where: {
        questionId: questionId,
        teamVoted: 'B'
      }
    });
    
    // Update question with vote counts
    await prisma.question.update({
      where: { id: questionId },
      data: {
        teamAVotes,
        teamBVotes,
        isFinalized: true
      }
    });
    
    // Update state
    stateService.setVotingActive(false);
    
    // Notify clients
    const io = socketService.getIO();
    io.emit('votingEnded', { 
      questionId,
      results: {
        teamA: teamAVotes,
        teamB: teamBVotes
      }
    });
    
    res.status(200).json({ 
      success: true,
      results: {
        teamA: teamAVotes,
        teamB: teamBVotes
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Reset scores
router.post('/reset-scores', async (req, res) => {
  try {
    // Reset all questions' vote counts
    await prisma.question.updateMany({
      data: {
        teamAVotes: 0,
        teamBVotes: 0
      }
    });
    
    // Reset state
    stateService.resetState();
    
    // Notify clients
    const io = socketService.getIO();
    io.emit('dataCleared');
    io.emit('scoresReset', { teamA: 0, teamB: 0 });
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Reset database
router.post('/reset-database', async (req, res) => {
  try {
    // Delete all votes first (due to foreign key constraints)
    await prisma.vote.deleteMany({});
    
    // Delete all questions
    await prisma.question.deleteMany({});
    
    // Reset state
    stateService.resetState();
    
    // Notify clients
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

// Delete a question
router.delete('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the question exists first
    const questionExists = await prisma.question.findUnique({
      where: { id }
    });
    
    if (!questionExists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Question not found' 
      });
    }
    
    // First delete any votes associated with this question (due to foreign key constraints)
    await prisma.vote.deleteMany({
      where: { questionId: id }
    });
    
    // Then delete the question
    const deletedQuestion = await prisma.question.delete({
      where: { id }
    });
    
    // Notify clients about the deletion
    const io = socketService.getIO();
    io.emit('questionDeleted', { id });
    
    res.status(200).json({ success: true, question: deletedQuestion });
  } catch (error) {
    console.error('Error deleting question:', error);
    
    // Handle Prisma's P2025 error (record not found)
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        success: false, 
        error: 'Question not found or already deleted' 
      });
    }
    
    res.status(400).json({ error: error.message });
  }
});

// Bulk upload questions
router.post('/bulk', async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Nenhuma questão fornecida' });
    }
    
    // Get the highest existing order
    const highestOrderQuestion = await prisma.question.findFirst({
      orderBy: { order: 'desc' }
    });
    
    let startOrder = highestOrderQuestion ? highestOrderQuestion.order + 1 : 1;
    
    // Assign sequential order numbers
    const questionsWithOrder = questions.map((q, index) => ({
      text: q.text,
      order: startOrder + index,
      isActive: false,
      isFinalized: false,
      teamAVotes: 0,
      teamBVotes: 0,
      isArchived: false
    }));
    
    // Create all questions
    const result = await prisma.question.createMany({
      data: questionsWithOrder
    });
    
    res.status(201).json({ 
      success: true,
      count: result.count
    });
  } catch (error) {
    console.error('Error creating bulk questions:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;