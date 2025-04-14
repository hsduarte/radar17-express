const express = require('express');
const router = express.Router();
const prisma = require('../services/prismaService');

// Get all questions
router.get('/', async (req, res) => {
  try {
    // Change from prisma.question to prisma.Question to match your schema
    const questions = await prisma.Question.findMany({
      orderBy: {
        order: 'asc'
      }
    });
    
    res.json(questions);
  } catch (error) {
    console.error('Erro ao buscar questões:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific question
router.get('/:id', async (req, res) => {
  try {
    const question = await prisma.question.findUnique({
      where: { id: req.params.id }
    });
    
    if (!question) {
      return res.status(404).json({ error: 'Questão não encontrada' });
    }
    
    res.json(question);
  } catch (error) {
    console.error('Erro ao buscar questão:', error);
    res.status(500).json({ error: 'Erro ao buscar questão' });
  }
});

// Create a new question
router.post('/', async (req, res) => {
  try {
    // Get the highest order value
    const highestOrder = await prisma.Question.findFirst({
      orderBy: {
        order: 'desc'
      }
    });
    
    // Create the new question
    const newQuestion = await prisma.Question.create({
      data: {
        text: req.body.text,
        order: req.body.order || (highestOrder ? highestOrder.order + 1 : 1)
      }
    });
    
    res.status(201).json(newQuestion);
  } catch (error) {
    console.error('Erro ao criar questão:', error);
    
    // Check if it's a unique constraint violation
    if (error.code === 'P2002' && error.meta?.target?.includes('order')) {
      return res.status(400).json({ 
        error: 'Já existe uma questão com esta ordem. Por favor, escolha outro valor.' 
      });
    }
    
    res.status(400).json({ error: error.message });
  }
});

// Create multiple questions
router.post('/bulk', async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Formato inválido. Envie um array de questões.' });
    }
    
    // Get the highest order value
    const highestOrder = await prisma.question.findFirst({
      orderBy: { order: 'desc' }
    });
    
    let nextOrder = highestOrder ? highestOrder.order + 1 : 1;
    
    // Create questions in transaction
    const createdQuestions = await prisma.$transaction(
      questions.map(questionText => {
        return prisma.question.create({
          data: {
            text: questionText,
            order: nextOrder++
          }
        });
      })
    );
    
    res.status(201).json(createdQuestions);
  } catch (error) {
    console.error('Erro ao criar questões em massa:', error);
    res.status(500).json({ error: 'Erro ao criar questões em massa' });
  }
});

// Update a question
router.put('/:id', async (req, res) => {
  try {
    const updatedQuestion = await prisma.question.update({
      where: { id: req.params.id },
      data: req.body
    });
    
    res.json(updatedQuestion);
  } catch (error) {
    console.error('Erro ao atualizar questão:', error);
    res.status(500).json({ error: 'Erro ao atualizar questão' });
  }
});

// Delete a question
router.delete('/:id', async (req, res) => {
  try {
    const questionId = req.params.id;
    
    // Delete related votes first
    await prisma.Vote.deleteMany({
      where: { questionId: questionId }
    });
    
    // Then delete the question
    await prisma.Question.delete({
      where: { id: questionId }
    });
    
    res.json({ message: 'Questão excluída com sucesso' });
  } catch (error) {
    // Handle the case where the record doesn't exist
    if (error.code === 'P2025') {
      // Record doesn't exist, but we can still return success
      return res.status(200).json({ message: 'Question already deleted or not found' });
    }
    
    // Handle other errors
    console.error('Error deleting question:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;