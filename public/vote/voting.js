document.addEventListener('DOMContentLoaded', () => {
    // Configuration constants
    const CONFIG = {
        ANIMATION_DURATION: 500,
        LOCAL_STORAGE_KEY: 'votes'
    };
    
    // DOM Elements
    const elements = {
        debateTitleEl: document.getElementById('debate-title'),
        debateSubtitleEl: document.getElementById('debate-subtitle'),
        questionTextEl: document.getElementById('question-text'),
        voteTeamA: document.getElementById('vote-team-a'),
        voteTeamB: document.getElementById('vote-team-b'),
        teamATextEl: document.getElementById('team-a-text'),
        teamBTextEl: document.getElementById('team-b-text'),
        statusIconEl: document.getElementById('status-icon'),
        statusTextEl: document.getElementById('status-text'),
        activeContainerEl: document.getElementById('active-container'),
        waitingContainerEl: document.getElementById('waiting-container')
    };
    
    // Application state
    const state = {
        clientId: generateClientId(),
        currentQuestion: null,
        isVotingActive: false,
        hasVoted: false,
        teamAName: 'Equipa A',
        teamBName: 'Equipa B',
        votedQuestions: loadVotedQuestions()
    };
    
    // Socket connection
    const socket = io();
    
    // Initialize the application
    function init() {
        setupSocketListeners();
        setupEventListeners();
    }
    
    // Set up socket event listeners
    function setupSocketListeners() {
        socket.on('connect', handleSocketConnect);
        socket.on('questionActivated', handleQuestionActivated);
        socket.on('votingStarted', handleVotingStarted);
        socket.on('questionFinalized', handleQuestionFinalized);
        socket.on('teamNamesUpdated', handleTeamNamesUpdated);
        socket.on('connect_error', handleConnectionError);
        socket.on('disconnect', handleDisconnect);
        
        // Add listener for votingState response
        socket.on('votingState', handleVotingState);
        socket.on('voteConfirmed', handleVoteConfirmed);
        socket.on('error', handleError);
    }
    
    // Set up UI event listeners
    function setupEventListeners() {
        elements.voteTeamA.addEventListener('click', () => handleVote('teamA'));
        elements.voteTeamB.addEventListener('click', () => handleVote('teamB'));
    }
    
    // Socket event handlers
    function handleSocketConnect() {
        console.log('Connected to server with client ID:', state.clientId);
        updateStatus('success', 'Conectado ao servidor');
        
        // Send client ID to server
        socket.emit('clientConnected', { clientId: state.clientId });
        
        // Request current voting state when connecting
        socket.emit('checkVotingState');
    }
    
    function handleQuestionActivated(data) {
        console.log('Question activated:', data);
        state.currentQuestion = data.question;
        state.isVotingActive = data.isVotingActive;
        state.hasVoted = hasVotedForQuestion(state.currentQuestion.id);
        
        updateUI();
    }
    
    function handleVotingStarted(data) {
        console.log('Voting started:', data);
        state.isVotingActive = true;
        updateUI();
    }
    
    function handleQuestionFinalized(data) {
        console.log('Question finalized:', data);
        state.isVotingActive = false;
        updateUI();
    }
    
    function handleTeamNamesUpdated(data) {
        console.log('Team names updated:', data);
        if (data.teamAName) state.teamAName = data.teamAName;
        if (data.teamBName) state.teamBName = data.teamBName;
        
        elements.teamATextEl.textContent = state.teamAName;
        elements.teamBTextEl.textContent = state.teamBName;
    }
    
    function handleConnectionError(error) {
        console.error('Connection error:', error);
        updateStatus('danger', 'Erro de conexão. Tentando reconectar...');
    }
    
    function handleDisconnect(reason) {
        console.log('Disconnected:', reason);
        updateStatus('warning', 'Desconectado. Tentando reconectar...');
    }
    
    // Add handler for votingState response
    function handleVotingState(data) {
        state.isVotingActive = data.isVotingActive;
        
        // Make sure we set currentQuestion to null if there's no active question
        state.currentQuestion = data.activeQuestion || null;
        
        if (state.currentQuestion) {
            state.hasVoted = hasVotedForQuestion(state.currentQuestion.id || state.currentQuestion._id);
        }
        
        updateUI();
    }
    
    // Add handler for vote confirmation
    function handleVoteConfirmed(data) {
        console.log('Vote confirmed:', data);
        if (data.questionId) {
            saveVotedQuestion(data.questionId);
            state.hasVoted = true;
            updateStatus('success', 'Voto registrado com sucesso!');
            updateUI();
        }
    }
    
    // Add handler for errors
    function handleError(data) {
        console.error('Error from server:', data);
        updateStatus('danger', data.message || 'Erro ao processar operação');
    }
    
    // UI event handlers
    function handleVote(team) {
        if (!state.isVotingActive || state.hasVoted || !state.currentQuestion) return;
        
        // Animate button
        const buttonElement = team === 'teamA' ? elements.voteTeamA : elements.voteTeamB;
        animateButton(buttonElement);
        
        // Get question ID (handling both id and _id formats)
        const questionId = state.currentQuestion.id || state.currentQuestion._id;
        
        // Send vote to server - update to match the expected format in controller
        socket.emit('submitVote', {
            clientId: state.clientId,
            questionId: questionId,
            teamVoted: team === 'teamA' ? 'A' : 'B'
        });
        
        // Show pending status
        updateStatus('info', 'Enviando seu voto...');
    }
    
    // Helper functions
    function updateUI() {
        if (state.currentQuestion) {
            // We have an active question, show the active container
            elements.activeContainerEl.classList.remove('hidden');
            elements.waitingContainerEl.classList.add('hidden');
            
            elements.questionTextEl.textContent = state.currentQuestion.text;
            elements.teamATextEl.textContent = state.teamAName;
            elements.teamBTextEl.textContent = state.teamBName;
            
            const buttonsEnabled = state.isVotingActive && !state.hasVoted;
            elements.voteTeamA.disabled = !buttonsEnabled;
            elements.voteTeamB.disabled = !buttonsEnabled;
            
            if (state.hasVoted) {
                updateStatus('info', 'Você já votou nesta questão');
            } else if (state.isVotingActive) {
                updateStatus('success', 'Votação aberta! Escolha uma opção');
            } else {
                updateStatus('warning', 'Aguardando início da votação');
            }
        } else {
            // No active question, show the waiting container
            elements.activeContainerEl.classList.add('hidden');
            elements.waitingContainerEl.classList.remove('hidden');
        }
    }
    
    function updateStatus(type, message) {
        // Remove all status classes
        elements.statusTextEl.classList.remove('bg-blue-100', 'text-blue-800', 'bg-green-100', 'text-green-700', 'bg-yellow-100', 'text-yellow-700', 'bg-red-100', 'text-red-700');
        
        // Update icon
        let iconClass = '';
        switch (type) {
            case 'success':
                elements.statusTextEl.classList.add('bg-green-100', 'text-green-700');
                iconClass = 'bi-check-circle-fill';
                break;
            case 'warning':
                elements.statusTextEl.classList.add('bg-yellow-100', 'text-yellow-700');
                iconClass = 'bi-exclamation-triangle-fill';
                break;
            case 'danger':
                elements.statusTextEl.classList.add('bg-red-100', 'text-red-700');
                iconClass = 'bi-x-circle-fill';
                break;
            case 'info':
            default:
                elements.statusTextEl.classList.add('bg-blue-100', 'text-blue-800');
                iconClass = 'bi-info-circle-fill';
                break;
        }
        
        elements.statusIconEl.innerHTML = `<i class="bi ${iconClass}"></i>`;
        elements.statusTextEl.textContent = message;
    }
    
    function animateButton(button) {
        button.classList.add('animate-pulse');
        setTimeout(() => {
            button.classList.remove('animate-pulse');
        }, CONFIG.ANIMATION_DURATION);
    }
    
    function generateClientId() {
        // Check if client ID already exists in localStorage
        const existingId = localStorage.getItem('clientId');
        if (existingId) return existingId;
        
        // Generate a new client ID
        const newId = 'client_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('clientId', newId);
        return newId;
    }
    
    function loadVotedQuestions() {
        const votedString = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
        return votedString ? JSON.parse(votedString) : [];
    }
    
    function saveVotedQuestion(questionId) {
        const voted = loadVotedQuestions();
        if (!voted.includes(questionId)) {
            voted.push(questionId);
            localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(voted));
            state.votedQuestions = voted;
        }
    }
    
    function hasVotedForQuestion(questionId) {
        return state.votedQuestions.includes(questionId);
    }
    
    // Initialize the application
    init();
});