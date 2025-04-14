const prisma = require('../services/prismaService');
const socketService = require('../services/socketService');
const stateService = require('../services/stateService');

// Activate question
async function activateQuestion(questionId) {
  try {
    // Validate questionId
    if (!questionId) {
      throw new Error('ID da questão é obrigatório');
    }

    // First, deactivate any currently active question
    await prisma.question.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Set the new active question
    const question = await prisma.question.update({
      where: { id: questionId },
      data: { isActive: true }
    });

    // Notify clients via socket
    const io = socketService.getIO();
    io.emit('questionActivated', { 
      question,
      isVotingActive: false
    });

    // Update state
    stateService.updateState({
      activeQuestion: question,
      isVotingActive: false
    });

    return question;
  } catch (error) {
    console.error('Error activating question:', error);
    throw error;
  }
}

// Update team names
async function updateTeamNames(teamAName, teamBName) {
  // Find active session or create one
  let session = await prisma.session.findFirst({
    where: { isActive: true }
  });
  
  if (!session) {
    session = await prisma.session.create({
      data: {
        name: 'Default Session',
        isActive: true,
        teamAName: teamAName || 'Equipa A',
        teamBName: teamBName || 'Equipa B'
      }
    });
  } else {
    session = await prisma.session.update({
      where: { id: session.id },
      data: {
        teamAName: teamAName || session.teamAName,
        teamBName: teamBName || session.teamBName
      }
    });
  }
  
  // Notify clients
  const io = socketService.getIO();
  io.emit('teamNamesUpdated', {
    teamAName: session.teamAName,
    teamBName: session.teamBName
  });
  
  return {
    success: true,
    teamAName: session.teamAName,
    teamBName: session.teamBName
  };
}

module.exports = {
  activateQuestion,
  updateTeamNames
};