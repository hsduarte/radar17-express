let currentState = {
    activeQuestion: null,
    teamAScore: 0,
    teamBScore: 0,
    questionScores: {},
    isVotingActive: false,
    teamAName: "Equipa A",
    teamBName: "Equipa B"
  };
  
  function getCurrentState() {
    return currentState;
  }
  
  function updateState(newState) {
    currentState = { ...currentState, ...newState };
    return currentState;
  }
  
  function resetState() {
    currentState = {
      activeQuestion: null,
      teamAScore: 0,
      teamBScore: 0,
      questionScores: {},
      isVotingActive: false,
      teamAName: "Equipa A",
      teamBName: "Equipa B"
    };
    return currentState;
  }
  
  module.exports = {
    getCurrentState,
    updateState,
    resetState
  };