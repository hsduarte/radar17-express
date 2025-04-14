document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const questionTextEl = document.getElementById('question-text');
    const voteTeamA = document.getElementById('vote-team-a');
    const voteTeamB = document.getElementById('vote-team-b');
    const teamATextEl = document.getElementById('team-a-text');
    const teamBTextEl = document.getElementById('team-b-text');
    const statusIconEl = document.getElementById('status-icon');
    const statusTextEl = document.getElementById('status-text');
    const activeContainerEl = document.getElementById('active-container');
    const waitingContainerEl = document.getElementById('waiting-container');
    const debateTitleEl = document.getElementById('debate-title');
    const debateSubtitleEl = document.getElementById('debate-subtitle');
    
    // Estado
    let currentQuestion = null;
    let isVotingActive = false;
    let hasVoted = false;
    let clientId = null;
    
    // Configuração
    const socket = io();
    
    // Carregar configurações locais (se houver)
    loadSettings();
    
    // Inicializar ID de cliente
    initClientId();
    
    // Socket listeners
    socket.on('connect', () => {
        console.log('Conectado ao servidor');
        updateStatus('Conectado! Aguardando questão...', 'success', 'check-circle-fill');
    });
    
    socket.on('disconnect', () => {
        console.log('Desconectado do servidor');
        updateStatus('Desconectado do servidor. Tentando reconectar...', 'danger', 'wifi-off');
        disableVoting();
    });
    
    // Receber o estado atual ao conectar
    socket.on('currentState', (state) => {
        console.log('Estado atual recebido:', state);
        
        if (state.activeQuestion && state.isVotingActive) {
            currentQuestion = state.activeQuestion;
            isVotingActive = state.isVotingActive;
            
            // Atualizar a questão
            questionTextEl.textContent = state.activeQuestion.text;
            
            // Verificar se já votou nesta questão
            checkIfVoted();
            
            // Mostrar container de questão ativa
            activeContainerEl.classList.remove('hidden');
            waitingContainerEl.classList.add('hidden');
            
            // Habilitar votação se não votou
            if (!hasVoted && isVotingActive) {
                enableVoting();
            }
        } else if (state.activeQuestion) {
            // Questão ativa, mas votação não está aberta
            currentQuestion = state.activeQuestion;
            isVotingActive = false;
            
            // Atualizar a questão
            questionTextEl.textContent = state.activeQuestion.text;
            
            // Mostrar container de questão ativa
            activeContainerEl.classList.remove('hidden');
            waitingContainerEl.classList.add('hidden');
            
            // Desabilitar votação
            disableVoting();
            updateStatus('Aguardando abertura da votação...', 'warning', 'hourglass-split');
        } else {
            // Nenhuma questão ativa
            currentQuestion = null;
            isVotingActive = false;
            
            // Mostrar container de espera
            activeContainerEl.classList.add('hidden');
            waitingContainerEl.classList.remove('hidden');
        }
    });
    
    // Quando uma nova questão é ativada
    socket.on('questionActivated', (data) => {
        console.log('Nova questão ativada:', data);
        currentQuestion = data.question;
        isVotingActive = data.isVotingActive;
        
        // Atualizar a questão
        questionTextEl.textContent = data.question.text;
        
        // Resetar estado de votação
        hasVoted = false;
        
        // Mostrar container de questão ativa
        activeContainerEl.classList.remove('hidden');
        waitingContainerEl.classList.add('hidden');
        
        if (isVotingActive) {
            enableVoting();
            updateStatus('Nova questão! Vote agora!', 'success', 'check-circle-fill pulse');
        } else {
            disableVoting();
            updateStatus('Nova questão! Aguardando abertura da votação...', 'warning', 'hourglass-split');
        }
        
        // Animar aparecimento da questão
        questionTextEl.classList.add('animate-shake');
        setTimeout(() => {
            questionTextEl.classList.remove('animate-shake');
        }, 500);
    });
    
    // Quando a votação é iniciada
    socket.on('votingStarted', (data) => {
        console.log('Votação iniciada:', data);
        isVotingActive = true;
        
        if (currentQuestion && !hasVoted) {
            enableVoting();
            updateStatus('Votação aberta! Escolha uma equipa!', 'success', 'check-circle-fill pulse');
        }
    });
    
    // Quando a votação é finalizada
    socket.on('questionFinalized', (data) => {
        console.log('Questão finalizada:', data);
        isVotingActive = false;
        disableVoting();
        
        if (hasVoted) {
            updateStatus('Votação encerrada. Seu voto foi registrado!', 'success', 'check-circle-fill');
        } else {
            updateStatus('Votação encerrada. Você não votou nesta questão.', 'warning', 'exclamation-triangle-fill');
        }
        
        // Aguardar próxima questão após 5 segundos
        setTimeout(() => {
            if (!isVotingActive && !currentQuestion) {
                activeContainerEl.classList.add('hidden');
                waitingContainerEl.classList.remove('hidden');
            }
        }, 5000);
    });
    
    // Confirmação de voto
    socket.on('voteConfirmed', (data) => {
        console.log('Voto confirmado:', data);
        
        if (currentQuestion && currentQuestion._id === data.questionId) {
            hasVoted = true;
            
            // Salvar informação de voto
            localStorage.setItem(`voted_${currentQuestion._id}`, 'true');
            
            disableVoting();
            updateStatus('Seu voto foi registrado! Aguardando resultado...', 'success', 'check-circle-fill');
        }
    });
    
    // Mensagens de erro
    socket.on('error', (data) => {
        console.error('Erro:', data);
        updateStatus(`Erro: ${data.message}`, 'danger', 'exclamation-triangle-fill');
    });

    // Atualização dos nomes das equipes
    socket.on('teamNamesUpdated', (data) => {
        console.log('Votação: nomes das equipas atualizados:', data);
        
        // Atualizar diretamente os elementos com ID específico
        if (teamATextEl && data.teamAName) {
            teamATextEl.textContent = data.teamAName;
        }
        
        if (teamBTextEl && data.teamBName) {
            teamBTextEl.textContent = data.teamBName;
        }
        
        // Atualizar título da página
        document.title = `Votação: ${data.teamAName} vs ${data.teamBName}`;
    });
    
    // Event listeners para botões de votação
    voteTeamA.addEventListener('click', () => {
        if (currentQuestion && isVotingActive && !hasVoted) {
            submitVote('A');
            voteTeamA.classList.add('opacity-60', 'cursor-not-allowed');
            voteTeamB.classList.add('opacity-60', 'cursor-not-allowed');
            updateStatus('Enviando seu voto...', 'info', 'arrow-repeat spinner');
        }
    });
    
    voteTeamB.addEventListener('click', () => {
        if (currentQuestion && isVotingActive && !hasVoted) {
            submitVote('B');
            voteTeamA.classList.add('opacity-60', 'cursor-not-allowed');
            voteTeamB.classList.add('opacity-60', 'cursor-not-allowed');
            updateStatus('Enviando seu voto...', 'info', 'arrow-repeat spinner');
        }
    });
    
    // Funções auxiliares
    function submitVote(team) {
        socket.emit('submitVote', { 
            teamVoted: team, 
            questionId: currentQuestion._id,
            clientId: clientId
        });
    }
    
    function enableVoting() {
        if (!hasVoted && isVotingActive) {
            voteTeamA.disabled = false;
            voteTeamB.disabled = false;
            voteTeamA.classList.remove('opacity-60', 'cursor-not-allowed');
            voteTeamB.classList.remove('opacity-60', 'cursor-not-allowed');
        }
    }
    
    function disableVoting() {
        voteTeamA.disabled = true;
        voteTeamB.disabled = true;
    }
    
    function updateStatus(message, type, icon) {
        // Mapear tipos de alerta para classes Tailwind
        const alertClasses = {
            'success': 'bg-green-100 text-green-800',
            'warning': 'bg-yellow-100 text-yellow-800',
            'danger': 'bg-red-100 text-red-800',
            'info': 'bg-blue-100 text-blue-800'
        };
        
        // Remover todas as classes de alerta e adicionar a nova
        statusTextEl.className = '';
        statusTextEl.classList.add('p-3', 'rounded-md', ...alertClasses[type].split(' '));
        statusTextEl.textContent = message;
        
        // Atualizar ícone
        statusIconEl.innerHTML = `<i class="bi bi-${icon}"></i>`;
        
        // Adicionar animações se necessário
        const iconEl = statusIconEl.querySelector('i');
        iconEl.classList.remove('animate-spin', 'animate-pulse');
        
        if (icon.includes('spinner') || icon === 'arrow-repeat') {
            iconEl.classList.add('animate-spin');
        } else if (icon.includes('pulse')) {
            iconEl.classList.add('animate-pulse');
        }
    }
    
    function checkIfVoted() {
        if (currentQuestion) {
            const votedFlag = localStorage.getItem(`voted_${currentQuestion._id}`);
            hasVoted = votedFlag === 'true';
            
            if (hasVoted) {
                disableVoting();
                updateStatus('Você já votou nesta questão!', 'info', 'check-square-fill');
            }
        }
    }
    
    function initClientId() {
        // Verificar se já existe um ID de cliente
        clientId = localStorage.getItem('clientId');
        
        // Se não existir, criar um novo
        if (!clientId) {
            clientId = generateUUID();
            localStorage.setItem('clientId', clientId);
        }
        
        console.log('ID do cliente:', clientId);
    }
    
    function generateUUID() {
        // Implementação simples de UUID
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, 
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    function loadSettings() {
        try {
            const settingsStr = localStorage.getItem('radar17-settings');
            if (settingsStr) {
                const settings = JSON.parse(settingsStr);
                
                // Atualizar nomes das equipas
                if (settings.teamAName) {
                    teamATextEl.textContent = settings.teamAName;
                }
                
                if (settings.teamBName) {
                    teamBTextEl.textContent = settings.teamBName;
                }
                
                // Atualizar título e subtítulo
                if (settings.debateTitle) {
                    debateTitleEl.textContent = settings.debateTitle;
                }
                
                if (settings.debateSubtitle) {
                    debateSubtitleEl.textContent = settings.debateSubtitle;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }
});