document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const questionTextEl = document.getElementById('question-text');
    const votingStatusEl = document.getElementById('voting-status');
    const teamAScoreEl = document.getElementById('team-a-score');
    const teamBScoreEl = document.getElementById('team-b-score');
    const questionResultEl = document.getElementById('question-result');
    const teamABarEl = document.getElementById('team-a-bar');
    const teamBBarEl = document.getElementById('team-b-bar');
    const teamAValueEl = document.getElementById('team-a-value');
    const teamBValueEl = document.getElementById('team-b-value');
    const voteCountEl = document.getElementById('vote-count');
    const qrContainerEl = document.getElementById('qr-container');
    
    // Configuração
    const socket = io();
    
    // Estado
    let currentState = {
        activeQuestion: null,
        isVotingActive: false,
        teamAScore: 0,
        teamBScore: 0,
        questionResults: {
            teamA: 0,
            teamB: 0
        }
    };
    
    // Carregar configurações de localStorage (se houver)
    loadSettings();
    
    // Gerar QR Code
    generateQRCode();
    
    // Socket listeners
    socket.on('connect', () => {
        console.log('Conectado ao servidor');
    });
    
    socket.on('disconnect', () => {
        console.log('Desconectado do servidor');
        votingStatusEl.innerHTML = '<i class="bi bi-exclamation-triangle-fill text-warning"></i> Desconectado do servidor';
    });
    
    socket.on('currentState', (state) => {
        console.log('Estado atual recebido:', state);
        currentState.teamAScore = state.teamAScore;
        currentState.teamBScore = state.teamBScore;
        currentState.activeQuestion = state.activeQuestion;
        currentState.isVotingActive = state.isVotingActive;
        
        updateDisplay();
    });
    
    socket.on('questionActivated', (data) => {
        console.log('Questão ativada:', data);
        currentState.activeQuestion = data.question;
        currentState.isVotingActive = data.isVotingActive;
        
        // Esconder resultado da questão anterior
        questionResultEl.classList.add('hidden');
        
        // Restaurar opacidade normal do QR code
        qrContainerEl.classList.remove('opacity-70');
        
        // Atualizar display
        updateDisplay();
        
        // Animar
        questionTextEl.classList.add('animate-pulse-custom');
        setTimeout(() => {
            questionTextEl.classList.remove('animate-pulse-custom');
        }, 2000);
    });
    
    socket.on('votingStarted', (data) => {
        console.log('Votação iniciada:', data);
        currentState.isVotingActive = true;
        
        updateDisplay();
    });
    
    socket.on('questionFinalized', (data) => {
        console.log('Questão finalizada:', data);
        currentState.isVotingActive = false;
        currentState.teamAScore = data.totalScores.teamA;
        currentState.teamBScore = data.totalScores.teamB;
        currentState.questionResults = data.results;
        
        // Atualizar display
        updateDisplay();
        
        // Mostrar resultado da questão
        showQuestionResult(data.results);
        
        // Animar pontuações
        teamAScoreEl.classList.add('animate-score-change');
        teamBScoreEl.classList.add('animate-score-change');
        setTimeout(() => {
            teamAScoreEl.classList.remove('animate-score-change');
            teamBScoreEl.classList.remove('animate-score-change');
        }, 1000);
        
        // Tornar QR code semi-transparente quando os resultados aparecem
        qrContainerEl.classList.add('opacity-70');
    });
    
    socket.on('scoresReset', (data) => {
        console.log('Pontuações resetadas:', data);
        currentState.teamAScore = data.teamA;
        currentState.teamBScore = data.teamB;
        
        updateDisplay();
    });
    
    socket.on('teamNamesUpdated', (data) => {
        console.log('Nomes das equipas atualizados:', data);
        
        // Atualizar nomes das equipas no visualizador
        const teamANameEl = document.getElementById('team-a-name');
        const teamBNameEl = document.getElementById('team-b-name');
        
        if (teamANameEl && data.teamAName) {
            teamANameEl.textContent = data.teamAName;
        }
        
        if (teamBNameEl && data.teamBName) {
            teamBNameEl.textContent = data.teamBName;
        }
    });
    
    // Funções
    function updateDisplay() {
        // Atualizar pontuações
        teamAScoreEl.textContent = currentState.teamAScore;
        teamBScoreEl.textContent = currentState.teamBScore;
        
        // Atualizar questão ativa
        if (currentState.activeQuestion) {
            questionTextEl.textContent = currentState.activeQuestion.text;
            
            if (currentState.isVotingActive) {
                votingStatusEl.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i> Votação aberta - Vote agora!';
                votingStatusEl.classList.add('animate-pulse-custom');
            } else {
                votingStatusEl.innerHTML = '<i class="bi bi-pause-circle-fill"></i> Aguardando início da votação';
                votingStatusEl.classList.remove('animate-pulse-custom');
            }
        } else {
            questionTextEl.textContent = 'Aguardando próxima questão';
            votingStatusEl.innerHTML = '<i class="bi bi-hourglass"></i> Em breve';
            votingStatusEl.classList.remove('animate-pulse-custom');
        }
    }
    
    function showQuestionResult(results) {
        const teamAVotes = results.teamA || 0;
        const teamBVotes = results.teamB || 0;
        const totalVotes = teamAVotes + teamBVotes;
        
        // Calcular percentagens
        let teamAPercent = 50;
        let teamBPercent = 50;
        
        if (totalVotes > 0) {
            teamAPercent = Math.round((teamAVotes / totalVotes) * 100);
            teamBPercent = 100 - teamAPercent;
        }
        
        // Atualizar barras e valores
        teamAValueEl.textContent = `${teamAVotes} (${teamAPercent}%)`;
        teamBValueEl.textContent = `${teamBVotes} (${teamBPercent}%)`;
        
        // Animar barras
        teamABarEl.style.width = '0%';
        teamBBarEl.style.width = '0%';
        
        // Forçar um reflow para garantir que a animação funcione
        void teamABarEl.offsetWidth;
        void teamBBarEl.offsetWidth;
        
        // Definir novas larguras com animação
        teamABarEl.style.width = `${teamAPercent}%`;
        teamBBarEl.style.width = `${teamBPercent}%`;
        
        // Atualizar contador de votos
        voteCountEl.textContent = `Total de votos: ${totalVotes}`;
        
        // Mostrar resultado
        questionResultEl.classList.remove('hidden');
        
        // Atualizar status da votação
        votingStatusEl.innerHTML = '<i class="bi bi-check-circle-fill"></i> Votação encerrada - Resultados:';
        votingStatusEl.classList.remove('animate-pulse-custom');
    }
    
    function loadSettings() {
        try {
            const settingsStr = localStorage.getItem('radar17-settings');
            if (settingsStr) {
                const settings = JSON.parse(settingsStr);
                
                // Atualizar nomes das equipas
                if (settings.teamAName) {
                    document.getElementById('team-a-name').textContent = settings.teamAName;
                }
                
                if (settings.teamBName) {
                    document.getElementById('team-b-name').textContent = settings.teamBName;
                }
                
                // Atualizar título e subtítulo
                if (settings.debateTitle) {
                    document.getElementById('debate-title').textContent = settings.debateTitle;
                }
                
                if (settings.debateSubtitle) {
                    document.getElementById('debate-subtitle').textContent = settings.debateSubtitle;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }
    
    function generateQRCode() {
        try {
            // Obter a URL atual e remover a parte "visualizer"
            const baseUrl = window.location.href.replace('/visualizer', '');
            
            // Criar QR Code com a URL base
            const qr = qrcode(0, 'M');
            qr.addData(baseUrl);
            qr.make();
            
            // Substituir a imagem placeholder pelo QR Code gerado
            const qrCodeEl = document.querySelector('.qr-code');
            qrCodeEl.innerHTML = qr.createImgTag(4);
        } catch (error) {
            console.error('Erro ao gerar QR Code:', error);
        }
    }
}); 