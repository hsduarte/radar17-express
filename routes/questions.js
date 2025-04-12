const express = require('express');
const router = express.Router();
const Question = require('../models/Question');

// Obter todas as questões
router.get('/', async (req, res) => {
  try {
    const questions = await Question.find().sort({ order: 1 });
    res.json(questions);
  } catch (error) {
    console.error('Erro ao buscar questões:', error);
    res.status(500).json({ error: 'Erro ao buscar questões' });
  }
});

// Obter uma questão específica
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Questão não encontrada' });
    }
    res.json(question);
  } catch (error) {
    console.error('Erro ao buscar questão:', error);
    res.status(500).json({ error: 'Erro ao buscar questão' });
  }
});

// Criar nova questão (rota admin)
router.post('/', async (req, res) => {
  try {
    const { text, order } = req.body;
    
    // Verificar se ordem já existe
    const existingWithOrder = await Question.findOne({ order });
    if (existingWithOrder) {
      return res.status(400).json({ error: 'Já existe uma questão com esta ordem' });
    }
    
    const newQuestion = new Question({
      text,
      order
    });
    
    const savedQuestion = await newQuestion.save();
    res.status(201).json(savedQuestion);
  } catch (error) {
    console.error('Erro ao criar questão:', error);
    res.status(500).json({ error: 'Erro ao criar questão' });
  }
});

// Atualizar questão (rota admin)
router.put('/:id', async (req, res) => {
  try {
    const { text, order } = req.body;
    
    // Verificar se ordem já existe em outra questão
    if (order) {
      const existingWithOrder = await Question.findOne({ 
        order, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingWithOrder) {
        return res.status(400).json({ error: 'Já existe outra questão com esta ordem' });
      }
    }
    
    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    if (!updatedQuestion) {
      return res.status(404).json({ error: 'Questão não encontrada' });
    }
    
    res.json(updatedQuestion);
  } catch (error) {
    console.error('Erro ao atualizar questão:', error);
    res.status(500).json({ error: 'Erro ao atualizar questão' });
  }
});

// Excluir questão (rota admin)
router.delete('/:id', async (req, res) => {
  try {
    const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
    
    if (!deletedQuestion) {
      return res.status(404).json({ error: 'Questão não encontrada' });
    }
    
    res.json({ message: 'Questão excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir questão:', error);
    res.status(500).json({ error: 'Erro ao excluir questão' });
  }
});

// Carregar múltiplas questões de uma vez (rota admin)
router.post('/bulk', async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'É necessário fornecer um array de questões' });
    }
    
    // Verificar se todas as questões têm ordem única
    const orders = questions.map(q => q.order);
    const uniqueOrders = new Set(orders);
    
    if (uniqueOrders.size !== questions.length) {
      return res.status(400).json({ error: 'Todas as questões devem ter ordens únicas' });
    }
    
    // Inserir questões
    const insertedQuestions = await Question.insertMany(questions);
    
    res.status(201).json(insertedQuestions);
  } catch (error) {
    console.error('Erro ao criar questões em massa:', error);
    res.status(500).json({ error: 'Erro ao criar questões em massa' });
  }
});

module.exports = router;