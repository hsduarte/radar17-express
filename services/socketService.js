const socketIo = require('socket.io');
const stateService = require('./stateService');

let io;

function init(server) {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id);
    
    // Enviar estado atual para o cliente
    const currentState = stateService.getCurrentState();
    socket.emit('currentState', currentState);
    
    // Enviar também os nomes das equipes atuais
    socket.emit('teamNamesUpdated', {
      teamAName: currentState.teamAName,
      teamBName: currentState.teamBName
    });
    
    // Listener para atualização direta dos nomes
    socket.on('updateTeamNames', (data) => {
      console.log('Recebendo atualização de nomes:', data);
      
      stateService.updateState({
        teamAName: data.teamAName || "Equipa A",
        teamBName: data.teamBName || "Equipa B"
      });
      
      const updatedState = stateService.getCurrentState();
      
      // Notificar todos os clientes
      io.emit('teamNamesUpdated', {
        teamAName: updatedState.teamAName,
        teamBName: updatedState.teamBName
      });
      
      console.log('Nomes atualizados e propagados para todos os clientes');
    });
    
    // Ouvir por votos dos clientes
    socket.on('submitVote', async (data) => {
      const Vote = require('../models/Vote');
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
          teamVoted: data.teamVoted,
          clientId: data.clientId || socket.id
        });
        
        await vote.save();
        
        socket.emit('voteConfirmed', { questionId: currentState.activeQuestion._id });
        
      } catch (error) {
        console.error('Erro ao processar voto:', error);
        socket.emit('error', { message: 'Erro ao processar seu voto' });
      }
    });
    
    // Desconexão
    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io não foi inicializado!');
  }
  return io;
}

module.exports = {
  init,
  getIO
};