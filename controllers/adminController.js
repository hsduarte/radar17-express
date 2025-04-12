const Question = require('../models/Question');
const Vote = require('../models/Vote');
const socketService = require('../services/socketService');
const stateService = require('../services/stateService');

// Ativar uma questão
async function activateQuestion(questionId) {
  try {
    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error('Questão não encontrada');
    }
    
    // Finalizar questão anterior se existir
    const currentState = stateService.getCurrentState();
    if (currentState.activeQuestion) {
      await finalizeQuestion();
    }
    
    // Desativar todas as questões antes
    await Question.updateMany({}, { isActive: false });
    
    // Ativar a questão selecionada
    question.isActive = true;
    await question.save();
    
    // Atualizar estado global
    const newState = {
      activeQuestion: question,
      isVotingActive: false
    };
    
    if (!currentState.questionScores[questionId]) {
      newState.questionScores = {
        ...currentState.questionScores,
        [questionId]: { teamA: 0, teamB: 0 }
      };
    }
    
    stateService.updateState(newState);
    
    // Notificar todos os clientes
    socketService.getIO().emit('questionActivated', {
      question: question,
      isVotingActive: false
    });
    
    return question;
  } catch (error) {
    console.error('Erro ao ativar questão:', error);
    throw error;
  }
}

// Iniciar votação
async function startVoting() {
  try {
    const currentState = stateService.getCurrentState();
    
    if (!currentState.activeQuestion) {
      throw new Error('Nenhuma questão ativa para iniciar votação');
    }
    
    // Atualizar estado
    stateService.updateState({ isVotingActive: true });
    
    // Notificar clientes
    socketService.getIO().emit('votingStarted', {
      questionId: currentState.activeQuestion._id,
      isVotingActive: true
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao iniciar votação:', error);
    throw error;
  }
}

// Finalizar questão atual
async function finalizeQuestion() {
  const currentState = stateService.getCurrentState();
  
  if (!currentState.activeQuestion) {
    return;
  }
  
  try {
    const questionId = currentState.activeQuestion._id;
    
    // Contar votos para esta questão
    const votes = await Vote.find({ questionId });
    let teamAVotes = 0;
    let teamBVotes = 0;
    
    votes.forEach(vote => {
      if (vote.teamVoted === 'A') {
        teamAVotes++;
      } else if (vote.teamVoted === 'B') {
        teamBVotes++;
      }
    });
    
    // Atualizar question scores
    const questionScores = {
      ...currentState.questionScores,
      [questionId]: { teamA: teamAVotes, teamB: teamBVotes }
    };
    
    // Atualizar score total
    const teamAScore = currentState.teamAScore + teamAVotes;
    const teamBScore = currentState.teamBScore + teamBVotes;
    
    // Salvar resultados da questão no banco de dados
    await Question.findByIdAndUpdate(questionId, {
      isActive: false,
      isFinalized: true,
      teamAVotes,
      teamBVotes
    });
    
    // Atualizar estado global
    stateService.updateState({
      activeQuestion: null,
      isVotingActive: false,
      teamAScore,
      teamBScore,
      questionScores
    });
    
    // Notificar clientes
    socketService.getIO().emit('questionFinalized', {
      questionId,
      results: {
        teamA: teamAVotes,
        teamB: teamBVotes
      },
      totalScores: {
        teamA: teamAScore,
        teamB: teamBScore
      }
    });
    
    return {
      teamAVotes,
      teamBVotes
    };
  } catch (error) {
    console.error('Erro ao finalizar questão:', error);
    throw error;
  }
}

async function updateTeamNames(teamAName, teamBName) {
  try {
    stateService.updateState({
      teamAName: teamAName || "Equipa A",
      teamBName: teamBName || "Equipa B"
    });
    
    const currentState = stateService.getCurrentState();
    
    // Notificar todos os clientes
    socketService.getIO().emit('teamNamesUpdated', {
      teamAName: currentState.teamAName,
      teamBName: currentState.teamBName
    });
    
    return {
      success: true,
      teamAName: currentState.teamAName,
      teamBName: currentState.teamBName
    };
  } catch (error) {
    console.error('Erro ao atualizar nomes das equipes:', error);
    throw error;
  }
}

// Resetar pontuações
async function resetScores() {
  try {
    // Resetar questões
    await Question.updateMany({}, { 
      isActive: false,
      isFinalized: false,
      teamAVotes: 0,
      teamBVotes: 0
    });
    
    // Apagar votos
    await Vote.deleteMany({});
    
    // Resetar estado global
    stateService.resetState();
    
    // Notificar clientes
    socketService.getIO().emit('scoresReset', {
      teamA: 0,
      teamB: 0
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao resetar pontuações:', error);
    throw error;
  }
}

module.exports = {
  activateQuestion,
  startVoting,
  finalizeQuestion,
  resetScores,
  updateTeamNames
};