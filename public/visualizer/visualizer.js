document.addEventListener('DOMContentLoaded', () => {
    // Configuration constants
    const CONFIG = {
        ANIMATION_DURATION: 2000,
        RESULT_ANIMATION_DURATION: 1000,
        DEFAULT_TEAM_A_NAME: 'Equipa A',
        DEFAULT_TEAM_B_NAME: 'Equipa B',
        QR_CODE_SIZE: 8,
        QR_CODE_ERROR_LEVEL: 'L'
    };
    
    // DOM Elements
    const elements = {
        debateTitleEl: document.getElementById('debate-title'),
        debateSubtitleEl: document.getElementById('debate-subtitle'),
        questionTextEl: document.getElementById('question-text'),
        votingStatusEl: document.getElementById('voting-status'),
        teamANameEl: document.getElementById('team-a-name'),
        teamBNameEl: document.getElementById('team-b-name'),
        teamAScoreEl: document.getElementById('team-a-score'),
        teamBScoreEl: document.getElementById('team-b-score'),
        questionResultEl: document.getElementById('question-result'),
        teamABarEl: document.getElementById('team-a-bar'),
        teamBBarEl: document.getElementById('team-b-bar'),
        teamAValueEl: document.getElementById('team-a-value'),
        teamBValueEl: document.getElementById('team-b-value'),
        voteCountEl: document.getElementById('vote-count'),
        qrContainerEl: document.getElementById('qr-container'),
        qrImageEl: document.getElementById('qr-image')
    };
    
    // Application state
    const currentState = {
        activeQuestion: null,
        isVotingActive: false,
        teamAScore: 0,
        teamBScore: 0,
        teamAName: CONFIG.DEFAULT_TEAM_A_NAME,
        teamBName: CONFIG.DEFAULT_TEAM_B_NAME,
        questionResults: null
    };
    
    // Socket connection
    const socket = io();
    
    // Initialize the application
    function init() {
        setupSocketListeners();
        generateQRCode();
    }
    
    // Set up socket event listeners
    function setupSocketListeners() {
        socket.on('connect', handleSocketConnect);
        socket.on('questionActivated', handleQuestionActivated);
        socket.on('votingStarted', handleVotingStarted);
        socket.on('questionFinalized', handleQuestionFinalized);
        socket.on('teamNamesUpdated', handleTeamNamesUpdated);
        socket.on('error', handleError);
    }
    
    // Socket event handlers
    function handleSocketConnect() {
        console.log('Connected to server');
    }
    
    function handleQuestionActivated(data) {
        console.log('Questão ativada:', data);
        currentState.activeQuestion = data.question;
        currentState.isVotingActive = data.isVotingActive;
        
        // Hide previous question result
        elements.questionResultEl.classList.add('hidden');
        
        // Restore normal QR code opacity
        elements.qrContainerEl.classList.remove('opacity-70');
        
        // Update display
        updateDisplay();
        
        // Animate question text
        animateElement(elements.questionTextEl, 'animate-pulse-custom', CONFIG.ANIMATION_DURATION);
    }
    
    function handleVotingStarted(data) {
        console.log('Votação iniciada:', data);
        currentState.isVotingActive = true;
        
        updateDisplay();
    }
    
    function handleQuestionFinalized(data) {
        console.log('Questão finalizada:', data);
        currentState.isVotingActive = false;
        currentState.teamAScore = data.totalScores.teamA;
        currentState.teamBScore = data.totalScores.teamB;
        currentState.questionResults = data.results;
        
        // Update display
        updateDisplay();
        
        // Show question result
        showQuestionResult(data.results);
        
        // Animate scores
        animateElement(elements.teamAScoreEl, 'animate-score-change', CONFIG.RESULT_ANIMATION_DURATION);
        animateElement(elements.teamBScoreEl, 'animate-score-change', CONFIG.RESULT_ANIMATION_DURATION);
        
        // Make QR code semi-transparent when results appear
        elements.qrContainerEl.classList.add('opacity-70');
    }
    
    function handleTeamNamesUpdated(data) {
        console.log('Team names updated:', data);
        if (data.teamAName) {
            currentState.teamAName = data.teamAName;
        }
        if (data.teamBName) {
            currentState.teamBName = data.teamBName;
        }
        
        updateTeamNames();
    }
    
    function handleError(data) {
        console.error('Error from server:', data);
    }
    
    // Helper functions
    function updateDisplay() {
        if (currentState.activeQuestion) {
            elements.questionTextEl.textContent = currentState.activeQuestion.text;
            
            if (currentState.isVotingActive) {
                elements.votingStatusEl.innerHTML = '<i class="bi bi-check-circle-fill"></i> Votação em andamento';
            } else if (currentState.questionResults) {
                elements.votingStatusEl.innerHTML = '<i class="bi bi-flag-fill"></i> Votação encerrada';
            } else {
                elements.votingStatusEl.innerHTML = '<i class="bi bi-hourglass-split"></i> Aguardando início da votação';
            }
        } else {
            elements.questionTextEl.textContent = 'Aguardando início do debate...';
            elements.votingStatusEl.innerHTML = '<i class="bi bi-hourglass"></i> Preparando questões';
        }
        
        // Update team names
        updateTeamNames();
        
        // Update scores
        elements.teamAScoreEl.textContent = currentState.teamAScore;
        elements.teamBScoreEl.textContent = currentState.teamBScore;
    }
    
    function updateTeamNames() {
        elements.teamANameEl.textContent = currentState.teamAName;
        elements.teamBNameEl.textContent = currentState.teamBName;
    }
    
    function showQuestionResult(results) {
        if (!results) return;
        
        const totalVotes = results.teamA + results.teamB;
        const teamAPercentage = totalVotes > 0 ? Math.round((results.teamA / totalVotes) * 100) : 50;
        const teamBPercentage = totalVotes > 0 ? Math.round((results.teamB / totalVotes) * 100) : 50;
        
        // Update result bar widths
        elements.teamABarEl.style.width = `${teamAPercentage}%`;
        elements.teamBBarEl.style.width = `${teamBPercentage}%`;
        
        // Update percentage values
        elements.teamAValueEl.textContent = `${teamAPercentage}%`;
        elements.teamBValueEl.textContent = `${teamBPercentage}%`;
        
        // Update vote count
        elements.voteCountEl.textContent = `Total de votos: ${totalVotes}`;
        
        // Show result container
        elements.questionResultEl.classList.remove('hidden');
    }
    
    function generateQRCode() {
        try {
            const qrCode = qrcode(CONFIG.QR_CODE_SIZE, CONFIG.QR_CODE_ERROR_LEVEL);
            const currentUrl = window.location.origin;
            qrCode.addData(currentUrl);
            qrCode.make();
            
            const qrImageSrc = qrCode.createDataURL();
            elements.qrImageEl.src = qrImageSrc;
        } catch (error) {
            console.error('Error generating QR code:', error);
            // Fallback - keep the placeholder image
        }
    }
    
    function animateElement(element, animationClass, duration) {
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
        }, duration);
    }
    
    // Initialize the application
    init();
}); 