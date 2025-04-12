document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    
    // Elementos DOM
    const questionText = document.getElementById('question-text');
    const voteTeamA = document.getElementById('vote-team-a');
    const voteTeamB = document.getElementById('vote-team-b');
    const voteStatus = document.getElementById('vote-status');
    
    // Estado
    let currentQuestion = null;
    let hasVoted = false;
    
    // Conexão com o servidor
    socket.on('connect', () => {
        console.log('Conectado ao servidor');
        voteStatus.textContent = 'Conectado! Aguardando próxima questão...';
        voteStatus.className = 'alert alert-success';
    });
    
    socket.on('disconnect', () => {
        console.log('Desconectado do servidor');
        voteStatus.textContent = 'Desconectado do servidor. Tentando reconectar...';
        voteStatus.className = 'alert alert-danger';
        disableVoting();
    });
    
    // Receber o estado atual ao conectar
    socket.on('currentState', (state) => {
        console.log('Estado atual recebido:', state);
        
        if (state.activeQuestion && state.isVotingActive) {
            currentQuestion = state.activeQuestion;
            questionText.textContent = state.activeQuestion.text;
            enableVoting();
        } else {
            disableVoting();
        }
    });
    
    // Quando uma nova questão é ativada
    socket.on('questionActivated', (data) => {
        console.log('Nova questão ativada:', data);
        currentQuestion = data.question;
        questionText.textContent = data.question.text;
        
        if (data.isVotingActive) {
            enableVoting();
        } else {
            disableVoting();
        }
        
        // Resetar o estado de votação
        hasVoted = false;
    });
    
    // Quando a votação é finalizada
    socket.on('questionFinalized', (data) => {
        console.log('Questão finalizada:', data);
        disableVoting();
        voteStatus.textContent = 'Votação encerrada. Aguardando próxima questão...';
        voteStatus.className = 'alert alert-info';
    });
    
    // Confirmação de voto
    socket.on('voteConfirmed', (data) => {
        console.log('Voto confirmado:', data);
        hasVoted = true;
        voteStatus.textContent = 'Seu voto foi registrado!';
        voteStatus.className = 'alert alert-success';
        disableVoting();
    });
    
    // Mensagens de erro
    socket.on('error', (data) => {
        console.error('Erro:', data);
        voteStatus.textContent = `Erro: ${data.message}`;
        voteStatus.className = 'alert alert-danger';
    });
    
    // Event listeners para botões de votação
    voteTeamA.addEventListener('click', () => {
        if (currentQuestion && !hasVoted) {
            socket.emit('submitVote', { 
                teamVoted: 'A', 
                questionId: currentQuestion._id 
            });
            voteStatus.textContent = 'Enviando seu voto...';
        }
    });
    
    voteTeamB.addEventListener('click', () => {
        if (currentQuestion && !hasVoted) {
            socket.emit('submitVote', { 
                teamVoted: 'B', 
                questionId: currentQuestion._id 
            });
            voteStatus.textContent = 'Enviando seu voto...';
        }
    });
    
    // Funções auxiliares
    function enableVoting() {
        if (!hasVoted) {
            voteTeamA.disabled = false;
            voteTeamB.disabled = false;
            voteStatus.textContent = 'Escolha uma equipa para votar!';
            voteStatus.className = 'alert alert-primary';
        }
    }
    
    function disableVoting() {
        voteTeamA.disabled = true;
        voteTeamB.disabled = true;
    }
});