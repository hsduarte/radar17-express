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
    const teamAScoreEl = document.querySelector('#current-scores .score:first-child');
    const teamBScoreEl = document.querySelector('#current-scores .score:last-child');
    
    // Inicialização
    initApp();
    initModalSystem();
    
    function initApp() {
        fetchQuestions();
        initEventListeners();
        initSocketListeners();
        initMobileMenu();
        initTabSystem();
        
        // Mostrar notificação de boas-vindas
        showToast('Sistema de Administração Iniciado', 'Bem-vindo ao painel administrativo do RADAR 17!', 'success');
    }
    
    function initMobileMenu() {
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
    }
    
    function initModalSystem() {
        // Open modal buttons
        document.querySelectorAll('[data-modal-target]').forEach(button => {
            button.addEventListener('click', () => {
                const modalId = button.getAttribute('data-modal-target');
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.remove('hidden');
                }
            });
        });
        
        // Close modal buttons
        document.querySelectorAll('[data-modal-close]').forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.fixed');
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        });
        
        // Close modal when clicking outside
        document.querySelectorAll('.fixed[id$="Modal"]').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }
    
    function initTabSystem() {
        const tabButtons = document.querySelectorAll('[data-tab-target]');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                tabButtons.forEach(btn => {
                    btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
                    btn.classList.add('text-gray-500', 'hover:text-gray-600', 'hover:border-gray-300');
                });
                
                // Add active class to clicked button
                button.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
                button.classList.remove('text-gray-500', 'hover:text-gray-600', 'hover:border-gray-300');
                
                // Hide all tab panes
                tabPanes.forEach(pane => {
                    pane.classList.add('hidden');
                    pane.classList.remove('block');
                });
                
                // Show the target tab pane
                const targetId = button.getAttribute('data-tab-target');
                const targetPane = document.getElementById(targetId);
                if (targetPane) {
                    targetPane.classList.remove('hidden');
                    targetPane.classList.add('block');
                }
            });
        });
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
            if (questionsListEl) {
                questionsListEl.innerHTML = `
                    <div class="bg-red-100 text-red-800 p-4 rounded">
                        <i class="bi bi-exclamation-triangle mr-2"></i> 
                        Erro ao carregar questões. Verifique a conexão com o servidor.
                    </div>
                `;
            }
        }
    }
    
    // Renderização de elementos
    function renderQuestionsList() {
        if (!questionsListEl) return;
        
        questionsListEl.innerHTML = '';
        
        if (questions.length === 0) {
            questionsListEl.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-question-circle text-gray-400 text-5xl"></i>
                    <h4 class="mt-3 text-xl font-semibold">Nenhuma questão cadastrada</h4>
                    <p class="text-gray-500">Adicione questões para iniciar o debate</p>
                </div>
            `;
            return;
        }
        
        // Ordenar questões
        const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
        
        sortedQuestions.forEach(question => {
            const isActive = activeQuestion && activeQuestion._id === question._id;
            
            const questionEl = document.createElement('div');
            questionEl.className = `mb-3 p-3 rounded ${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : question.isFinalized ? 'bg-red-50 border-l-4 border-red-500' : 'bg-gray-100'} ${question.isFinalized ? 'opacity-90' : ''} shadow-sm`;
            
            let statusBadge = '';
            if (isActive && isVotingActive) {
                statusBadge = '<span class="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Votação Ativa</span>';
            } else if (isActive) {
                statusBadge = '<span class="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Selecionada</span>';
            } else if (question.isFinalized) {
                statusBadge = '<span class="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Finalizada</span>';
            }
            
            questionEl.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <span class="inline-block w-8 h-8 text-center leading-8 ${question.isFinalized ? 'bg-red-200' : 'bg-gray-200'} rounded-full mr-2">${question.order}</span>
                        <span class="font-medium">${question.text}</span>
                        ${statusBadge}
                    </div>
                    <div class="flex items-center">
                        ${question.isFinalized ? 
                            `<span class="mr-3 px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
                                <i class="bi bi-trophy mr-1"></i> A: ${question.teamAVotes || 0} | B: ${question.teamBVotes || 0}
                            </span>` : 
                            ''
                        }
                        <div class="flex space-x-1">
                            ${!question.isFinalized ? 
                                `<button class="p-3 text-blue-600 hover:bg-blue-50 rounded activate-btn" data-id="${question._id}">
                                    <i class="bi bi-check-circle"></i>
                                </button>
                                <button class="p-3 text-yellow-600 hover:bg-gray-50 rounded edit-btn" data-id="${question._id}">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="p-3 text-red-600 hover:bg-red-50 rounded delete-btn" data-id="${question._id}">
                                    <i class="bi bi-trash"></i>
                                </button>` : 
                                `<button class="p-3 text-gray-400 rounded cursor-not-allowed" disabled>
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
                <div class="col-span-4 text-center py-4">
                    <p class="text-gray-500">Nenhuma questão disponível</p>
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
                <div class="col-span-4 text-center py-4">
                    <p class="text-gray-500">Todas as questões já foram respondidas</p>
                </div>
            `;
            return;
        }
        
        availableQuestions.forEach(question => {
            const isActive = activeQuestion && activeQuestion._id === question._id;
            
            const colEl = document.createElement('div');
            colEl.className = 'mb-3';
            colEl.innerHTML = `
                <div class="h-full rounded-lg shadow-md ${isActive ? 'border-2 border-blue-500' : 'border border-gray-200'}">
                    <div class="px-3 py-2 border-b ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-50'}">
                        <span class="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-gray-200 text-gray-800">#${question.order}</span>
                        ${isActive ? '<span class="float-right px-2 py-0.5 text-xs font-semibold rounded bg-yellow-300 text-gray-800">Ativa</span>' : ''}
                    </div>
                    <div class="p-3">
                        <p class="text-sm mb-3">${question.text}</p>
                        <div class="text-center">
                            <button class="w-full py-1.5 px-3 text-sm rounded ${isActive ? 'bg-gray-300 text-gray-700' : 'bg-blue-600 hover:bg-blue-700 text-white'} quick-activate-btn" 
                                data-id="${question._id}" ${isActive ? 'disabled' : ''}>
                                ${isActive ? 'Selecionada' : 'Selecionar'}
                            </button>
                        </div>
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
            activeQuestionTextEl.classList.remove('bg-gray-200');
            
            if (isVotingActive) {
                activeQuestionTextEl.classList.add('bg-green-100', 'text-green-800');
                activeQuestionTextEl.classList.remove('bg-yellow-100', 'text-yellow-800');
                startVotingBtn.disabled = true;
                endVotingBtn.disabled = false;
                votingStatusEl.innerHTML = '<i class="bi bi-check-circle-fill mr-1 text-green-500"></i> Votação em andamento. Os participantes podem votar agora.';
                votingStatusEl.className = 'bg-green-100 text-green-800 p-3 rounded';
            } else {
                activeQuestionTextEl.classList.add('bg-yellow-100', 'text-yellow-800');
                activeQuestionTextEl.classList.remove('bg-green-100', 'text-green-800');
                startVotingBtn.disabled = false;
                endVotingBtn.disabled = true;
                votingStatusEl.innerHTML = '<i class="bi bi-info-circle mr-1"></i> Questão selecionada. Clique em "Iniciar Votação" quando estiver pronto.';
                votingStatusEl.className = 'bg-yellow-100 text-yellow-800 p-3 rounded';
            }
        } else {
            activeQuestionTextEl.textContent = 'Nenhuma questão ativa';
            activeQuestionTextEl.classList.add('bg-gray-200');
            activeQuestionTextEl.classList.remove('bg-green-100', 'text-green-800', 'bg-yellow-100', 'text-yellow-800');
            startVotingBtn.disabled = true;
            endVotingBtn.disabled = true;
            votingStatusEl.innerHTML = '<i class="bi bi-info-circle mr-1"></i> Selecione uma questão para ativar.';
            votingStatusEl.className = 'bg-blue-100 text-blue-800 p-3 rounded';
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
        
        // Settings form submit
        const settingsForm = document.querySelector('#settings-tab-pane form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', function(e) {
                e.preventDefault();
                saveSettings();
            });
            
            // Also add click listener to the submit button as a fallback
            const saveSettingsBtn = settingsForm.querySelector('button[type="submit"]');
            if (saveSettingsBtn) {
                saveSettingsBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    saveSettings();
                });
            }
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
            document.getElementById('addQuestionModal').classList.add('hidden');
            
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
        
        document.getElementById('editQuestionModal').classList.remove('hidden');
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
            document.getElementById('editQuestionModal').classList.add('hidden');
            
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
        // Get the textarea instead of file input
        const bulkQuestionsTextarea = document.getElementById('bulk-questions');
        
        if (!bulkQuestionsTextarea || !bulkQuestionsTextarea.value.trim()) {
            showToast('Erro', 'Por favor, insira pelo menos uma questão', 'error');
            return;
        }
        
        // Parse questions from textarea (one per line)
        const questionsText = bulkQuestionsTextarea.value.trim();
        const questionLines = questionsText.split('\n').filter(line => line.trim().length > 0);
        
        if (questionLines.length === 0) {
            showToast('Erro', 'Por favor, insira pelo menos uma questão válida', 'error');
            return;
        }
        
        try {
            // Get the highest current order
            let highestOrder = 0;
            if (questions.length > 0) {
                highestOrder = Math.max(...questions.map(q => q.order || 0));
            }
            
            // Create question objects
            const newQuestions = questionLines.map((text, index) => ({
                text: text.trim(),
                order: highestOrder + index + 1
            }));
            
            // Send to server - using the correct endpoint from your routes/questions.js file
            const response = await fetch(`${API_URL}/questions/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ questions: newQuestions })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao fazer upload em massa');
            }
            
            // Fechar modal
            document.getElementById('bulkUploadModal').classList.add('hidden');
            
            // Limpar campo de texto
            bulkQuestionsTextarea.value = '';
            
            // Recarregar questões
            fetchQuestions();
            
            // Notificar usuário
            showToast('Upload Concluído', `${newQuestions.length} questões foram adicionadas com sucesso`, 'success');
            
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
        
        // Criar e baixar arquivo JSON
        const jsonData = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'questions.json';
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    function exportResultsCsv() {
        if (questions.length === 0) {
            showToast('Nenhum Dado', 'Não há resultados para exportar', 'warning');
            return;
        }
        
        // Filtrar questões finalizadas e ordenar
        const finalizedQuestions = questions
            .filter(q => q.isFinalized)
            .sort((a, b) => a.order - b.order);
        
        if (finalizedQuestions.length === 0) {
            showToast('Nenhum Dado', 'Não há questões finalizadas para exportar', 'warning');
            return;
        }
        
        // Criar dados CSV
        let csvData = 'Número,Questão,Equipa A,Equipa B\n';
        finalizedQuestions.forEach(q => {
            csvData += `${q.order},"${q.text}",${q.teamAVotes || 0},${q.teamBVotes || 0}\n`;
        });
        
        // Criar e baixar arquivo CSV
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'results.csv';
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    async function clearAllData() {
        try {
            const response = await fetch(`${API_URL}/admin/clear-all-data`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao limpar todos os dados');
            }
            
            // Recarregar questões
            fetchQuestions();
            
            // Notificar usuário
            showToast('Dados Limpos', 'Todos os dados foram limpos com sucesso', 'success');
            
        } catch (error) {
            console.error('Erro ao limpar todos os dados:', error);
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
                throw new Error(errorData.error || 'Erro ao resetar a base de dados');
            }
            
            // Recarregar questões
            fetchQuestions();
            
            // Notificar usuário
            showToast('Base de Dados Resetada', 'A base de dados foi resetada com sucesso', 'success');
            
        } catch (error) {
            console.error('Erro ao resetar a base de dados:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    async function saveSettings() {
        // Get form elements, with null checks
        const teamANameEl = document.getElementById('teamA-name');
        const teamBNameEl = document.getElementById('teamB-name');
        const debateTitleEl = document.getElementById('debate-title');
        const debateSubtitleEl = document.getElementById('debate-subtitle');
        
        // Get values with fallbacks
        const teamAName = teamANameEl ? teamANameEl.value : "Equipa A";
        const teamBName = teamBNameEl ? teamBNameEl.value : "Equipa B";
        const debateTitle = debateTitleEl ? debateTitleEl.value : "RADAR 17 - Debate Participativo";
        const debateSubtitle = debateSubtitleEl ? debateSubtitleEl.value : "Jovens e Decisores Políticos";
        
        // Save settings locally first
        const settings = {
            teamAName,
            teamBName,
            debateTitle,
            debateSubtitle,
            updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('radar17-settings', JSON.stringify(settings));
        
        try {
            // Try to save team names on the server using the correct endpoint
            const response = await fetch(`${API_URL}/admin/update-team-names`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    teamAName,
                    teamBName
                })
            });
            
            if (!response.ok) {
                // If server returns an error, we'll still use the local settings
                console.warn('Server returned error when saving settings. Using local storage only.');
            }
            
            // Emit socket event to update settings for all clients
            if (socket && socket.connected) {
                socket.emit('updateSettings', settings);
            }
            
            showToast('Configurações Salvas', 'As configurações foram salvas com sucesso', 'success');
            
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            
            // Even if there's an error with the server, we've saved locally
            if (socket && socket.connected) {
                socket.emit('updateSettings', settings);
                showToast('Configurações Salvas Localmente', 'Não foi possível salvar no servidor, mas as configurações foram enviadas via socket', 'warning');
            } else {
                showToast('Configurações Salvas Localmente', 'Não foi possível salvar no servidor ou enviar via socket', 'warning');
            }
        }
    }
    
    function showToast(title, message, type = 'info') {
        // Verificar se já existe um container de toasts
        let toastContainer = document.querySelector('.toast-container');
        
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'fixed bottom-4 right-4 z-50 space-y-2 toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Criar um novo toast
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        
        // Definir classes com base no tipo
        let bgColor, textColor, borderColor, iconClass;
        switch(type) {
            case 'success':
                bgColor = 'bg-green-100';
                textColor = 'text-green-800';
                borderColor = 'border-green-500';
                iconClass = 'bi-check-circle';
                break;
            case 'error':
                bgColor = 'bg-red-100';
                textColor = 'text-red-800';
                borderColor = 'border-red-500';
                iconClass = 'bi-exclamation-circle';
                break;
            case 'warning':
                bgColor = 'bg-yellow-100';
                textColor = 'text-yellow-800';
                borderColor = 'border-yellow-500';
                iconClass = 'bi-exclamation-triangle';
                break;
            default: // info
                bgColor = 'bg-blue-100';
                textColor = 'text-blue-800';
                borderColor = 'border-blue-500';
                iconClass = 'bi-info-circle';
        }
        
        toast.className = `${bgColor} ${textColor} border-l-4 ${borderColor} p-4 rounded shadow-md max-w-md transform transition-all duration-300 ease-in-out`;
        toast.setAttribute('id', toastId);
        
        toast.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex">
                    <i class="bi ${iconClass} mr-2 text-lg"></i>
                    <div>
                        <h3 class="font-bold">${title}</h3>
                        <p class="text-sm">${message}</p>
                    </div>
                </div>
                <button class="text-gray-500 hover:text-gray-700 ml-4" onclick="this.parentElement.parentElement.remove()">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
    }
    
    function showInputError(inputEl, message) {
        // Implementação do erro de entrada aqui
    }
    
    function confirmAction(message, action, type = 'info') {
        // Create a modal for confirmation
        const modalId = 'confirm-action-modal';
        let modal = document.getElementById(modalId);
        
        // If modal doesn't exist, create it
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
            document.body.appendChild(modal);
        }
        
        // Set icon and color based on type
        let iconClass, headerClass, buttonClass;
        switch(type) {
            case 'danger':
                iconClass = 'bi-exclamation-triangle-fill text-red-600';
                headerClass = 'text-red-600';
                buttonClass = 'bg-red-600 hover:bg-red-700';
                break;
            case 'warning':
                iconClass = 'bi-exclamation-triangle text-yellow-600';
                headerClass = 'text-yellow-600';
                buttonClass = 'bg-yellow-600 hover:bg-yellow-700';
                break;
            default: // info
                iconClass = 'bi-question-circle text-blue-600';
                headerClass = 'text-blue-600';
                buttonClass = 'bg-blue-600 hover:bg-blue-700';
        }
        
        // Set modal content
        modal.innerHTML = `
            <div class="relative w-full max-w-md mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
                <div class="px-6 py-4">
                    <div class="flex items-center mb-3">
                        <i class="bi ${iconClass} text-2xl mr-3 ml-3"></i>
                        <h3 class="text-lg font-bold ${headerClass}">Confirmação</h3>
                    </div>
                    <p class="text-gray-700 mr-3 ml-3">${message}</p>
                </div>
                <div class="px-6 py-3 bg-gray-50 flex justify-end space-x-3">
                    <button id="confirm-cancel-btn" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
                        Cancelar
                    </button>
                    <button id="confirm-action-btn" class="px-4 py-2 mr-3 ml-3 text-sm font-medium text-white ${buttonClass} rounded hover:opacity-90 transition-colors">
                        Confirmar
                    </button>
                </div>
            </div>
        `;
        
        const cancelBtn = modal.querySelector('#confirm-cancel-btn'); // Use querySelector scoped to modal
    const confirmBtn = modal.querySelector('#confirm-action-btn'); // Use querySelector scoped to modal

    // Add event listeners DIRECTLY to these buttons
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    } else {
        console.error("Confirm modal: Cancel button not found");
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            action(); // Execute the provided action function
        });
    } else {
        console.error("Confirm modal: Confirm button not found");
    }


    // --- End Simplified Listener Attachment ---


    // Listener to close when clicking outside the modal content
    modal.addEventListener('click', (e) => {
        // Check if the click target is the modal background itself, not its content
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Show the modal
    modal.classList.remove('hidden');
}})
