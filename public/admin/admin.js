document.addEventListener('DOMContentLoaded', () => {
    // Configurações
    const API_URL = '/api';
    const socket = io();
    
    // Estado
    let questions = [];
    let activeQuestion = null;
    let isVotingActive = false;
    let currentScores = {
        teamA: 0,
        teamB: 0
    };
    
    // Referências para elementos DOM
    const questionsListEl = document.getElementById('questions-list');
    const questionsPreviewEl = document.getElementById('questions-preview');
    const activeQuestionTextEl = document.getElementById('active-question-text');
    const votingStatusEl = document.getElementById('voting-status');
    const startVotingBtn = document.getElementById('start-voting-btn');
    const endVotingBtn = document.getElementById('end-voting-btn');
    const resetScoresBtn = document.getElementById('reset-scores-btn');
    const saveQuestionBtn = document.getElementById('save-question-btn');
    const updateQuestionBtn = document.getElementById('update-question-btn');
    const uploadBulkBtn = document.getElementById('upload-bulk-btn');
    const refreshPreviewBtn = document.getElementById('refresh-preview-btn');
    const teamAScoreEl = document.querySelector('#current-scores .team-a .score');
    const teamBScoreEl = document.querySelector('#current-scores .team-b .score');
    
    // Modais
    const addQuestionModal = new bootstrap.Modal(document.getElementById('addQuestionModal'));
    const editQuestionModal = new bootstrap.Modal(document.getElementById('editQuestionModal'));
    const bulkUploadModal = new bootstrap.Modal(document.getElementById('bulkUploadModal'));
    const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    
    // Inicialização
    initApp();
    
    function initApp() {
        fetchQuestions();
        initEventListeners();
        initSocketListeners();
        
        // Mostrar notificação de boas-vindas
        showToast('Sistema de Administração Iniciado', 'Bem-vindo ao painel administrativo do RADAR 17!', 'success');
    }
    
    // Funções para carregar dados
    async function fetchQuestions() {
        try {
            const response = await fetch(`${API_URL}/questions`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            questions = await response.json();
            renderQuestionsList();
            renderQuestionsPreview();
        } catch (error) {
            console.error('Erro ao carregar questões:', error);
            questionsListEl.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> 
                    Erro ao carregar questões. Verifique a conexão com o servidor.
                </div>
            `;
        }
    }
    
    // Renderização de elementos
    function renderQuestionsList() {
        if (!questionsListEl) return;
        
        questionsListEl.innerHTML = '';
        
        if (questions.length === 0) {
            questionsListEl.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-question-circle" style="font-size: 3rem; color: #ccc;"></i>
                    <h4 class="mt-3">Nenhuma questão cadastrada</h4>
                    <p class="text-muted">Adicione questões para iniciar o debate</p>
                </div>
            `;
            return;
        }
        
        // Ordenar questões
        const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
        
        sortedQuestions.forEach(question => {
            const isActive = activeQuestion && activeQuestion._id === question._id;
            
            const questionEl = document.createElement('div');
            questionEl.className = `question-item ${isActive ? 'active-question' : ''} ${question.isFinalized ? 'finalized-question' : ''}`;
            
            let statusBadge = '';
            if (isActive && isVotingActive) {
                statusBadge = '<span class="badge bg-success status-badge ms-2">Votação Ativa</span>';
            } else if (isActive) {
                statusBadge = '<span class="badge bg-primary status-badge ms-2">Selecionada</span>';
            } else if (question.isFinalized) {
                statusBadge = '<span class="badge bg-secondary status-badge ms-2">Finalizada</span>';
            }
            
            questionEl.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="question-number">${question.order}</span>
                        <span class="question-text">${question.text}</span>
                        ${statusBadge}
                    </div>
                    <div class="btn-group">
                        ${question.isFinalized ? 
                            `<span class="badge bg-info me-2">
                                <i class="bi bi-trophy"></i> A: ${question.teamAVotes || 0} | B: ${question.teamBVotes || 0}
                            </span>` : 
                            ''
                        }
                        <div class="btn-group btn-group-sm">
                            ${!question.isFinalized ? 
                                `<button class="btn btn-sm btn-outline-primary activate-btn" data-id="${question._id}">
                                    <i class="bi bi-check-circle"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-warning edit-btn" data-id="${question._id}">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${question._id}">
                                    <i class="bi bi-trash"></i>
                                </button>` : 
                                `<button class="btn btn-sm btn-outline-secondary" disabled>
                                    <i class="bi bi-lock"></i>
                                </button>`
                            }
                        </div>
                    </div>
                </div>
            `;
            
            questionsListEl.appendChild(questionEl);
            
            // Adicionar event listeners
            const activateBtn = questionEl.querySelector('.activate-btn');
            if (activateBtn) {
                activateBtn.addEventListener('click', () => activateQuestion(question._id));
            }
            
            const deleteBtn = questionEl.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => confirmDelete(question));
            }
            
            const editBtn = questionEl.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => openEditModal(question));
            }
        });
    }
    
    function renderQuestionsPreview() {
        if (!questionsPreviewEl) return;
        
        questionsPreviewEl.innerHTML = '';
        
        if (questions.length === 0) {
            questionsPreviewEl.innerHTML = `
                <div class="col-12 text-center py-4">
                    <p class="text-muted">Nenhuma questão disponível</p>
                </div>
            `;
            return;
        }
        
        // Filtrar questões não finalizadas e ordenar
        const availableQuestions = questions
            .filter(q => !q.isFinalized)
            .sort((a, b) => a.order - b.order)
            .slice(0, 4); // Mostrar apenas as próximas 4
        
        if (availableQuestions.length === 0) {
            questionsPreviewEl.innerHTML = `
                <div class="col-12 text-center py-4">
                    <p class="text-muted">Todas as questões já foram respondidas</p>
                </div>
            `;
            return;
        }
        
        availableQuestions.forEach(question => {
            const isActive = activeQuestion && activeQuestion._id === question._id;
            
            const colEl = document.createElement('div');
            colEl.className = 'col-md-6 col-lg-3 mb-3';
            colEl.innerHTML = `
                <div class="card h-100 ${isActive ? 'border-primary' : ''}">
                    <div class="card-header ${isActive ? 'bg-primary text-white' : ''}">
                        <span class="badge bg-secondary">#${question.order}</span>
                        ${isActive ? '<span class="badge bg-warning text-dark float-end">Ativa</span>' : ''}
                    </div>
                    <div class="card-body">
                        <p class="card-text">${question.text}</p>
                    </div>
                    <div class="card-footer text-center">
                        <button class="btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'} quick-activate-btn" 
                            data-id="${question._id}" ${isActive ? 'disabled' : ''}>
                            ${isActive ? 'Selecionada' : 'Selecionar'}
                        </button>
                    </div>
                </div>
            `;
            
            questionsPreviewEl.appendChild(colEl);
            
            // Adicionar event listener
            const activateBtn = colEl.querySelector('.quick-activate-btn');
            if (activateBtn) {
                activateBtn.addEventListener('click', () => activateQuestion(question._id));
            }
        });
    }
    
    function updateScoreDisplay() {
        if (teamAScoreEl) {
            teamAScoreEl.textContent = currentScores.teamA;
        }
        if (teamBScoreEl) {
            teamBScoreEl.textContent = currentScores.teamB;
        }
    }
    
    function updateActiveQuestionDisplay() {
        if (!activeQuestionTextEl) return;
        
        if (activeQuestion) {
            activeQuestionTextEl.textContent = activeQuestion.text;
            activeQuestionTextEl.classList.remove('alert-secondary');
            
            if (isVotingActive) {
                activeQuestionTextEl.classList.add('alert-success');
                activeQuestionTextEl.classList.remove('alert-warning');
                startVotingBtn.disabled = true;
                endVotingBtn.disabled = false;
                votingStatusEl.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i> Votação em andamento. Os participantes podem votar agora.';
                votingStatusEl.className = 'alert alert-success';
            } else {
                activeQuestionTextEl.classList.add('alert-warning');
                activeQuestionTextEl.classList.remove('alert-success');
                startVotingBtn.disabled = false;
                endVotingBtn.disabled = true;
                votingStatusEl.innerHTML = '<i class="bi bi-info-circle"></i> Questão selecionada. Clique em "Iniciar Votação" quando estiver pronto.';
                votingStatusEl.className = 'alert alert-warning';
            }
        } else {
            activeQuestionTextEl.textContent = 'Nenhuma questão ativa';
            activeQuestionTextEl.classList.add('alert-secondary');
            activeQuestionTextEl.classList.remove('alert-success', 'alert-warning');
            startVotingBtn.disabled = true;
            endVotingBtn.disabled = true;
            votingStatusEl.innerHTML = '<i class="bi bi-info-circle"></i> Selecione uma questão para ativar.';
            votingStatusEl.className = 'alert alert-info';
        }
    }
    
    // Event listeners
    function initEventListeners() {
        // Event listener para adicionar questão
        if (saveQuestionBtn) {
            saveQuestionBtn.addEventListener('click', addQuestion);
        }
        
        // Event listener para atualizar questão
        if (updateQuestionBtn) {
            updateQuestionBtn.addEventListener('click', updateQuestion);
        }
        
        // Event listener para iniciar votação
        if (startVotingBtn) {
            startVotingBtn.addEventListener('click', startVoting);
        }
        
        // Event listener para encerrar votação
        if (endVotingBtn) {
            endVotingBtn.addEventListener('click', endVoting);
        }
        
        // Event listener para resetar pontuações
        if (resetScoresBtn) {
            resetScoresBtn.addEventListener('click', () => confirmAction(
                'Tem certeza que deseja resetar todas as pontuações?',
                resetScores
            ));
        }
        
        // Event listener para upload em massa
        if (uploadBulkBtn) {
            uploadBulkBtn.addEventListener('click', bulkUploadQuestions);
        }
        
        // Event listener para atualizar visualização rápida
        if (refreshPreviewBtn) {
            refreshPreviewBtn.addEventListener('click', () => {
                fetchQuestions();
                showToast('Lista Atualizada', 'A lista de questões foi atualizada', 'info');
            });
        }
        
        // Event listeners para ferramentas (Tab Configurações)
        const exportJsonBtn = document.getElementById('export-json-btn');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', exportQuestionsJson);
        }
        
        const exportCsvBtn = document.getElementById('export-csv-btn');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', exportResultsCsv);
        }
        
        const clearAllBtn = document.getElementById('clear-all-btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => confirmAction(
                'Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.',
                clearAllData
            ));
        }
        
        const resetDatabaseBtn = document.getElementById('reset-database-btn');
        if (resetDatabaseBtn) {
            resetDatabaseBtn.addEventListener('click', () => confirmAction(
                'ATENÇÃO: Esta ação irá resetar completamente a base de dados, removendo todas as questões e votos. Esta ação NÃO PODE ser desfeita.',
                resetDatabase,
                'danger'
            ));
        }
        
        // Event listener para formulário de configurações
        const debateSettingsForm = document.getElementById('debate-settings-form');
        if (debateSettingsForm) {
            debateSettingsForm.addEventListener('submit', function(e) {
                e.preventDefault();
                saveSettings();
            });
        }
    }
    
    // Socket listeners
    function initSocketListeners() {
        socket.on('connect', () => {
            console.log('Conectado ao servidor de websocket');
        });
        
        socket.on('disconnect', () => {
            console.log('Desconectado do servidor de websocket');
            showToast('Desconectado', 'A conexão com o servidor foi perdida. Tentando reconectar...', 'error');
        });
        
        socket.on('currentState', (state) => {
            console.log('Estado atual recebido:', state);
            currentScores.teamA = state.teamAScore;
            currentScores.teamB = state.teamBScore;
            activeQuestion = state.activeQuestion;
            isVotingActive = state.isVotingActive;
            
            updateScoreDisplay();
            updateActiveQuestionDisplay();
        });
        
        socket.on('questionActivated', (data) => {
            console.log('Questão ativada:', data);
            activeQuestion = data.question;
            isVotingActive = data.isVotingActive;
            
            updateActiveQuestionDisplay();
            fetchQuestions(); // Recarregar lista de questões
            
            showToast('Questão Ativada', `Questão #${activeQuestion.order} selecionada`, 'success');
        });
        
        socket.on('questionFinalized', (data) => {
            console.log('Questão finalizada:', data);
            isVotingActive = false;
            currentScores.teamA = data.totalScores.teamA;
            currentScores.teamB = data.totalScores.teamB;
            
            updateScoreDisplay();
            updateActiveQuestionDisplay();
            fetchQuestions(); // Recarregar lista de questões
            
            showToast('Votação Finalizada', `Resultados registrados: Equipa A (${data.results.teamA}) - Equipa B (${data.results.teamB})`, 'info');
        });
        
        socket.on('scoresReset', (data) => {
            console.log('Pontuações resetadas:', data);
            currentScores.teamA = data.teamA;
            currentScores.teamB = data.teamB;
            
            updateScoreDisplay();
            fetchQuestions(); // Recarregar lista de questões
            
            showToast('Pontuações Resetadas', 'Todas as pontuações foram resetadas para 0', 'warning');
        });
        
        socket.on('error', (error) => {
            console.error('Erro do servidor:', error);
            showToast('Erro', error.message || 'Ocorreu um erro no servidor', 'error');
        });
    }
    
    // Funções de ação
    async function addQuestion() {
        const textEl = document.getElementById('question-text');
        const orderEl = document.getElementById('question-order');
        
        if (!textEl.value.trim()) {
            showInputError(textEl, 'Por favor, insira o texto da questão');
            return;
        }
        
        if (!orderEl.value || orderEl.value < 1) {
            showInputError(orderEl, 'Por favor, insira um número de ordem válido (> 0)');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: textEl.value.trim(),
                    order: parseInt(orderEl.value)
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao criar questão');
            }
            
            const newQuestion = await response.json();
            
            // Limpar campos
            textEl.value = '';
            orderEl.value = '';
            
            // Fechar modal
            addQuestionModal.hide();
            
            // Recarregar questões
            fetchQuestions();
            
            // Notificar usuário
            showToast('Questão Adicionada', `A questão #${newQuestion.order} foi adicionada com sucesso`, 'success');
            
        } catch (error) {
            console.error('Erro ao adicionar questão:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    function openEditModal(question) {
        document.getElementById('edit-question-id').value = question._id;
        document.getElementById('edit-question-text').value = question.text;
        document.getElementById('edit-question-order').value = question.order;
        
        editQuestionModal.show();
    }
    
    async function updateQuestion() {
        const idEl = document.getElementById('edit-question-id');
        const textEl = document.getElementById('edit-question-text');
        const orderEl = document.getElementById('edit-question-order');
        
        if (!textEl.value.trim()) {
            showInputError(textEl, 'Por favor, insira o texto da questão');
            return;
        }
        
        if (!orderEl.value || orderEl.value < 1) {
            showInputError(orderEl, 'Por favor, insira um número de ordem válido (> 0)');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/questions/${idEl.value}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: textEl.value.trim(),
                    order: parseInt(orderEl.value)
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao atualizar questão');
            }
            
            const updatedQuestion = await response.json();
            
            // Fechar modal
            editQuestionModal.hide();
            
            // Recarregar questões
            fetchQuestions();
            
            // Notificar usuário
            showToast('Questão Atualizada', `A questão #${updatedQuestion.order} foi atualizada com sucesso`, 'success');
            
        } catch (error) {
            console.error('Erro ao atualizar questão:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    function confirmDelete(question) {
        confirmAction(
            `Tem certeza que deseja excluir a questão #${question.order}?`,
            () => deleteQuestion(question._id),
            'warning'
        );
    }
    
    async function deleteQuestion(id) {
        try {
            const response = await fetch(`${API_URL}/questions/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao excluir questão');
            }
            
            // Recarregar questões
            fetchQuestions();
            
            // Notificar usuário
            showToast('Questão Excluída', 'A questão foi excluída com sucesso', 'success');
            
        } catch (error) {
            console.error('Erro ao excluir questão:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    async function activateQuestion(id) {
        try {
            const response = await fetch(`${API_URL}/admin/activate-question`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questionId: id
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao ativar questão');
            }
            
            // O resto será atualizado via socket
            
        } catch (error) {
            console.error('Erro ao ativar questão:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    async function startVoting() {
        if (!activeQuestion) {
            showToast('Erro', 'Nenhuma questão ativa para iniciar votação', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/admin/start-voting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questionId: activeQuestion._id
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao iniciar votação');
            }
            
            isVotingActive = true;
            updateActiveQuestionDisplay();
            
            // Notificar usuário
            showToast('Votação Iniciada', 'Os participantes podem começar a votar agora', 'success');
            
        } catch (error) {
            console.error('Erro ao iniciar votação:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    async function endVoting() {
        try {
            const response = await fetch(`${API_URL}/admin/finalize-question`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao encerrar votação');
            }
            
            // O resto será atualizado via socket
            
        } catch (error) {
            console.error('Erro ao encerrar votação:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    async function resetScores() {
        try {
            const response = await fetch(`${API_URL}/admin/reset-scores`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao resetar pontuações');
            }
            
            // O resto será atualizado via socket
            
        } catch (error) {
            console.error('Erro ao resetar pontuações:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    async function bulkUploadQuestions() {
        const textareaEl = document.getElementById('bulk-questions');
        const questionTexts = textareaEl.value.trim().split('\n').filter(text => text.trim() !== '');
        
        if (questionTexts.length === 0) {
            showInputError(textareaEl, 'Por favor, insira pelo menos uma questão');
            return;
        }
        
        try {
            // Determinar a ordem inicial para as novas questões
            let startOrder = 1;
            if (questions.length > 0) {
                // Encontrar o maior número de ordem atual
                startOrder = Math.max(...questions.map(q => q.order)) + 1;
            }
            
            const questionsToAdd = questionTexts.map((text, index) => ({
                text: text.trim(),
                order: startOrder + index
            }));
            
            const response = await fetch(`${API_URL}/questions/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questions: questionsToAdd
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao carregar questões em massa');
            }
            
            // Limpar campo
            textareaEl.value = '';
            
            // Fechar modal
            bulkUploadModal.hide();
            
            // Recarregar questões
            fetchQuestions();
            
            // Notificar usuário
            showToast('Questões Adicionadas', `${questionsToAdd.length} questões foram adicionadas com sucesso`, 'success');
            
        } catch (error) {
            console.error('Erro ao adicionar questões em massa:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    // Funções para ferramentas (Tab Configurações)
    function exportQuestionsJson() {
        if (questions.length === 0) {
            showToast('Nenhum Dado', 'Não há questões para exportar', 'warning');
            return;
        }
        
        // Organizar dados
        const exportData = questions.map(q => ({
            order: q.order,
            text: q.text,
            isFinalized: q.isFinalized,
            teamAVotes: q.teamAVotes || 0,
            teamBVotes: q.teamBVotes || 0
        }));
        
        // Criar blob e link de download
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        // Criar link e simular clique
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `radar17-questions-${formatDate(new Date())}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        showToast('Exportação Concluída', 'As questões foram exportadas com sucesso', 'success');
    }
    
    function exportResultsCsv() {
        if (questions.length === 0) {
            showToast('Nenhum Dado', 'Não há resultados para exportar', 'warning');
            return;
        }
        
        // Filtrar apenas questões finalizadas
        const finalizedQuestions = questions.filter(q => q.isFinalized);
        
        if (finalizedQuestions.length === 0) {
            showToast('Nenhum Resultado', 'Não há questões finalizadas para exportar', 'warning');
            return;
        }
        
        // Criar cabeçalho CSV
        let csvContent = 'Ordem,Questão,Votos Equipa A,Votos Equipa B,Total Votos\n';
        
        // Adicionar linhas de dados
        finalizedQuestions.forEach(q => {
            const teamAVotes = q.teamAVotes || 0;
            const teamBVotes = q.teamBVotes || 0;
            const totalVotes = teamAVotes + teamBVotes;
            csvContent += `${q.order},"${q.text.replace(/"/g, '""')}",${teamAVotes},${teamBVotes},${totalVotes}\n`;
        });
        
        // Adicionar linha de totais
        const totalTeamA = finalizedQuestions.reduce((sum, q) => sum + (q.teamAVotes || 0), 0);
        const totalTeamB = finalizedQuestions.reduce((sum, q) => sum + (q.teamBVotes || 0), 0);
        const grandTotal = totalTeamA + totalTeamB;
        csvContent += `TOTAL,"",${totalTeamA},${totalTeamB},${grandTotal}\n`;
        
        // Criar blob e link de download
        const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(dataBlob);
        
        // Criar link e simular clique
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `radar17-results-${formatDate(new Date())}.csv`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        showToast('Exportação Concluída', 'Os resultados foram exportados com sucesso', 'success');
    }
    
    async function clearAllData() {
        try {
            const response = await fetch(`${API_URL}/admin/clear-data`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao limpar dados');
            }
            
            // Recarregar dados
            fetchQuestions();
            
            // Notificar usuário
            showToast('Dados Limpos', 'Todos os dados foram limpos com sucesso', 'success');
            
        } catch (error) {
            console.error('Erro ao limpar dados:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    async function resetDatabase() {
        try {
            const response = await fetch(`${API_URL}/admin/reset-database`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao resetar base de dados');
            }
            
            // Recarregar a página
            showToast('Base de Dados Resetada', 'A página será recarregada em 3 segundos...', 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 3000);
            
        } catch (error) {
            console.error('Erro ao resetar base de dados:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    function saveSettings() {
        const teamAName = document.getElementById('teamA-name').value;
        const teamBName = document.getElementById('teamB-name').value;
        const debateTitle = document.getElementById('debate-title').value;
        const debateSubtitle = document.getElementById('debate-subtitle').value;
        
        // Salvar no localStorage
        const settings = {
          teamAName,
          teamBName,
          debateTitle,
          debateSubtitle,
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('radar17-settings', JSON.stringify(settings));
        
        // Enviar diretamente via Socket.io (método mais confiável)
        socket.emit('updateTeamNames', { 
          teamAName: teamAName || "Equipa A", 
          teamBName: teamBName || "Equipa B" 
        });
        
        showToast('Configurações Guardadas', 'As configurações foram guardadas com sucesso', 'success');
        
        return false; // Impedir envio do formulário
    }

    function saveSettings() {
        console.log('Salvando configurações...');
        
        const teamAName = document.getElementById('teamA-name').value || "Equipa A";
        const teamBName = document.getElementById('teamB-name').value || "Equipa B";
        const debateTitle = document.getElementById('debate-title').value;
        const debateSubtitle = document.getElementById('debate-subtitle').value;
        
        console.log(`Nomes: ${teamAName} vs ${teamBName}`);
        
        // Salvar no localStorage (para persistência local)
        const settings = {
          teamAName,
          teamBName,
          debateTitle,
          debateSubtitle,
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('radar17-settings', JSON.stringify(settings));
        
        // Enviar via Socket.io (para sincronização em tempo real)
        if (socket && socket.connected) {
          console.log('Socket conectado, enviando atualização...');
          socket.emit('updateTeamNames', { 
            teamAName, 
            teamBName 
          });
          showToast('Configurações Salvas', 'As configurações foram salvas e sincronizadas', 'success');
        } else {
          console.warn('Socket não conectado!');
          showToast('Aviso', 'Socket não conectado. Configurações salvas localmente, mas podem não estar sincronizadas.', 'warning');
        }
      }
      
      // Certifique-se de ter o listener para receber atualizações também
      socket.on('teamNamesUpdated', (data) => {
        console.log('Admin recebeu atualização de nomes:', data);
        
        // Atualizar formulário se necessário
        const teamANameInput = document.getElementById('teamA-name');
        const teamBNameInput = document.getElementById('teamB-name');
        
        if (teamANameInput && data.teamAName && !teamANameInput.matches(':focus')) {
          teamANameInput.value = data.teamAName;
        }
        
        if (teamBNameInput && data.teamBName && !teamBNameInput.matches(':focus')) {
          teamBNameInput.value = data.teamBName;
        }
      });

    // Funções utilitárias
    function showToast(title, message, type = 'info') {
        // Verificar se já existe um container de toasts
        let toastContainer = document.querySelector('.toast-container');
        
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        // Criar um novo toast
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.className = `toast border-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.setAttribute('id', toastId);
        
        toast.innerHTML = `
            <div class="toast-header">
                <div class="rounded me-2 bg-${type}" style="width: 20px; height: 20px;"></div>
                <strong class="me-auto">${title}</strong>
                <small>${formatTime(new Date())}</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Inicializar e mostrar o toast
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 5000
        });
        
        bsToast.show();
        
        // Remover o toast do DOM quando for fechado
        toast.addEventListener('hidden.bs.toast', function () {
            toast.remove();
        });
    }
    
    function showInputError(inputElement, message) {
        // Destacar o input
        inputElement.classList.add('is-invalid');
        
        // Verificar se já existe uma mensagem de erro
        let errorDiv = inputElement.nextElementSibling;
        if (!errorDiv || !errorDiv.classList.contains('invalid-feedback')) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            inputElement.after(errorDiv);
        }
        
        // Atualizar mensagem
        errorDiv.textContent = message;
        
        // Remover destaque após 3 segundos
        setTimeout(() => {
            inputElement.classList.remove('is-invalid');
        }, 3000);
    }
    
    function confirmAction(message, callback, type = 'warning') {
        // Atualizar mensagem de confirmação
        const confirmationMessage = document.getElementById('confirmation-message');
        if (confirmationMessage) {
            confirmationMessage.textContent = message;
        }
        
        // Configurar botão de confirmação
        const confirmBtn = document.getElementById('confirm-action-btn');
        if (confirmBtn) {
            // Remover event listeners antigos
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            // Adicionar novo event listener
            newConfirmBtn.addEventListener('click', () => {
                confirmationModal.hide();
                callback();
            });
            
            // Atualizar estilo do botão
            newConfirmBtn.className = `btn btn-${type}`;
        }
        
        // Mostrar modal
        confirmationModal.show();
    }
    
    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
});