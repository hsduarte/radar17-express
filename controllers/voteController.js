const Vote = require('../models/Vote');
const stateService = require('../services/stateService');

async function processVote(socket, data) {
  const currentState = stateService.getCurrentState();
  
  if (!currentState.isVotingActive || !currentState.activeQuestion) {
    socket.emit('error', { message: 'Votação não está ativa no momento' });
    return;
  }
  
  try {
    // Verificar se já votou nesta questão
    const existingVote = await Vote.findOne({
      questionId: currentState.activeQuestion._id,
      clientId: data.clientId || socket.id
    });
    
    if (existingVote) {
      socket.emit('error', { message: 'Você já votou nesta questão' });
      return;
    }
    
    // Registrar voto no banco de dados
    const vote = new Vote({
      questionId: currentState.activeQuestion._id,
      teamVoted: data.teamVoted, // 'A' ou 'B'
      clientId: data.clientId || socket.id
    });
    
    await vote.save();
    
    // Confirmar para o cliente que seu voto foi registrado
    socket.emit('voteConfirmed', { questionId: currentState.activeQuestion._id });
    
  } catch (error) {
    console.error('Erro ao processar voto:', error);
    socket.emit('error', { message: 'Erro ao processar seu voto' });
  }
}

module.exports = {
  processVote
};