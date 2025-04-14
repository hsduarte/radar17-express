const { Server } = require('socket.io');
const prisma = require('./prismaService');
const stateService = require('./stateService');

let io;

function init(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    
    // Send current state to new client
    socket.emit('currentState', stateService.getCurrentState());
    
    // Handle vote submission
    socket.on('submitVote', async (data) => {
      try {
        const { questionId, teamVoted, clientId } = data;
        
        if (!questionId || !teamVoted || !clientId) {
          socket.emit('voteError', { error: 'Dados incompletos' });
          return;
        }
        
        // Check if voting is active
        if (!stateService.getCurrentState().isVotingActive) {
          socket.emit('voteError', { error: 'Votação não está ativa' });
          return;
        }
        
        // Check if question is active
        const question = await prisma.question.findUnique({
          where: { id: questionId }
        });
        
        if (!question || !question.isActive) {
          socket.emit('voteError', { error: 'Questão não está ativa' });
          return;
        }
        
        // Try to create vote (will fail if client already voted due to unique constraint)
        try {
          await prisma.vote.create({
            data: {
              questionId,
              teamVoted,
              clientId
            }
          });
          
          // Confirm vote to client
          socket.emit('voteConfirmed', { questionId, teamVoted });
          
          // Update vote counts in real-time
          const teamAVotes = await prisma.vote.count({
            where: {
              questionId,
              teamVoted: 'A'
            }
          });
          
          const teamBVotes = await prisma.vote.count({
            where: {
              questionId,
              teamVoted: 'B'
            }
          });
          
          // Broadcast vote update to all clients
          io.emit('voteUpdate', {
            questionId,
            teamA: teamAVotes,
            teamB: teamBVotes
          });
        } catch (error) {
          // Check if error is due to unique constraint
          if (error.code === 'P2002') {
            socket.emit('voteError', { error: 'Você já votou nesta questão' });
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error('Erro ao processar voto:', error);
        socket.emit('voteError', { error: 'Erro ao processar voto' });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io não foi inicializado');
  }
  return io;
}

module.exports = {
  init,
  getIO
};