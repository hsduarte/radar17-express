const { prisma } = require('../services/prismaService');
const stateService = require('../services/stateService');

async function processVote(socket, data) {
  const currentState = stateService.getCurrentState();
  
  if (!currentState.isVotingActive || !currentState.activeQuestion) {
    socket.emit('error', { message: 'Votação não está ativa no momento' });
    return;
  }
  
  try {
    // Get the question ID (ensuring compatibility with both _id and id formats)
    const questionId = currentState.activeQuestion._id || currentState.activeQuestion.id;
    const clientId = data.clientId || socket.id;
    
    // Verificar se já votou nesta questão usando Prisma
    const existingVote = await prisma.vote.findUnique({
      where: {
        questionId_clientId: {
          questionId: questionId,
          clientId: clientId
        }
      }
    });
    
    if (existingVote) {
      socket.emit('error', { message: 'Você já votou nesta questão' });
      return;
    }
    
    // Registrar voto no banco de dados usando Prisma
    const vote = await prisma.vote.create({
      data: {
        questionId: questionId,
        teamVoted: data.teamVoted, // 'A' ou 'B'
        clientId: clientId
      }
    });
    
    // Confirmar para o cliente que seu voto foi registrado
    socket.emit('voteConfirmed', { 
      questionId: questionId,
      teamVoted: data.teamVoted 
    });
    
    // Update vote counts in real-time
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
    
    // Broadcast vote update to all clients if you have access to io
    if (socket.broadcast) {
      socket.broadcast.emit('voteUpdate', {
        questionId: questionId,
        teamA: teamAVotes,
        teamB: teamBVotes
      });
    }
    
  } catch (error) {
    console.error('Erro ao processar voto:', error);
    
    // Check if error is due to unique constraint
    if (error.code === 'P2002') {
      socket.emit('error', { message: 'Você já votou nesta questão' });
    } else {
      socket.emit('error', { message: 'Erro ao processar seu voto' });
    }
  }
}

// Function to check current voting state
function checkVotingState(socket) {
  const currentState = stateService.getCurrentState();
  
  // Send the current state to the client
  socket.emit('votingState', {
    isVotingActive: currentState.isVotingActive,
    activeQuestion: currentState.activeQuestion,
    waitingForQuestion: !currentState.activeQuestion
  });
}

module.exports = {
  processVote,
  checkVotingState
};