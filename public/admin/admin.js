document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const API_URL = '/api';
    const socket = io();
    
    // State
    let questions = [];
    let activeQuestion = null;
    let isVotingActive = false;
    let currentScores = {
        teamA: 0,
        teamB: 0
    };
    
    // Cache DOM Elements
    const elements = {
        questionsList: document.getElementById('questions-list'),
        questionsPreview: document.getElementById('questions-preview'),
        activeQuestionText: document.getElementById('active-question-text'),
        votingStatus: document.getElementById('voting-status'),
        startVotingBtn: document.getElementById('start-voting-btn'),
        endVotingBtn: document.getElementById('end-voting-btn'),
        resetScoresBtn: document.getElementById('reset-scores-btn'),
        teamAScoreEl: document.querySelector('#current-scores .score:first-child'),
        teamBScoreEl: document.querySelector('#current-scores .score:last-child'),
        deactivateQuestionBtn: document.getElementById('deactivate-question-btn')
    };
    
    // Initialization
    initApp();
    
    function initApp() {
        fetchQuestions();
        initEventListeners();
        initSocketListeners();
        initUiSystems();
        
        showToast('Sistema de Administração Iniciado', 'Bem-vindo ao painel administrativo do RADAR 17!', 'success');
    }
    
    function initUiSystems() {
        initMobileMenu();
        initModalSystem();
        initTabSystem();
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
    
    // Data fetching
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
            console.error('Error loading questions:', error);
            if (elements.questionsList) {
                elements.questionsList.innerHTML = `
                    <div class="bg-red-100 text-red-800 p-4 rounded">
                        <i class="bi bi-exclamation-triangle mr-2"></i> 
                        Erro ao carregar questões. Verifique a conexão com o servidor.
                    </div>
                `;
            }
        }
    }
    
    // Rendering
    function renderQuestionsList() {
        if (!elements.questionsList) return;
        
        elements.questionsList.innerHTML = '';
        
        if (questions.length === 0) {
            elements.questionsList.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-question-circle text-gray-400 text-5xl"></i>
                    <h4 class="mt-3 text-xl font-semibold">Nenhuma questão cadastrada</h4>
                    <p class="text-gray-500">Adicione questões para iniciar o debate</p>
                </div>
            `;
            return;
        }
        
        // Sort questions
        const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
        
        sortedQuestions.forEach(question => {
            // Ensure we have a valid ID to work with
            const questionId = question._id || question.id;
            const isActive = activeQuestion && (activeQuestion.id === questionId || activeQuestion._id === questionId);
            
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
                                `<button class="p-3 text-yellow-600 hover:bg-gray-50 rounded edit-btn" data-id="${questionId}">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="p-3 text-red-600 hover:bg-red-50 rounded delete-btn" data-id="${questionId}">
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
            
            elements.questionsList.appendChild(questionEl);
            
            // Add event listeners to buttons
            const deleteBtn = questionEl.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => confirmAction(
                    'Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.',
                    () => deleteQuestion(questionId),
                    'danger'
                ));
            }
            
            const editBtn = questionEl.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => openEditModal(question));
            }
        });
    }
    
    function renderQuestionsPreview() {
        if (!elements.questionsPreview) return;
        
        elements.questionsPreview.innerHTML = '';
        
        if (questions.length === 0) {
            elements.questionsPreview.innerHTML = `
                <div class="col-span-4 text-center py-4">
                    <p class="text-gray-500">Nenhuma questão disponível</p>
                </div>
            `;
            return;
        }
        
        // Filter non-finalized questions and sort
        const availableQuestions = questions
            .filter(q => !q.isFinalized)
            .sort((a, b) => a.order - b.order)
            .slice(0, 4); // Show only the next 4
        
        if (availableQuestions.length === 0) {
            elements.questionsPreview.innerHTML = `
                <div class="col-span-4 text-center py-4">
                    <p class="text-gray-500">Todas as questões já foram respondidas</p>
                </div>
            `;
            return;
        }
        
        availableQuestions.forEach(question => {
            // Ensure we have a valid ID to work with
            const questionId = question._id || question.id;
            const isActive = activeQuestion && (activeQuestion.id === questionId || activeQuestion._id === questionId);
            
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
                                data-id="${questionId}" ${isActive ? 'disabled' : ''}>
                                ${isActive ? 'Selecionada' : 'Selecionar'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            elements.questionsPreview.appendChild(colEl);
            
            // Add event listener
            const activateBtn = colEl.querySelector('.quick-activate-btn');
            if (activateBtn) {
                activateBtn.addEventListener('click', () => {
                    const id = activateBtn.getAttribute('data-id');
                    activateQuestion(id);
                });
            }
        });
    }
    
    function updateScoreDisplay() {
        if (elements.teamAScoreEl) {
            elements.teamAScoreEl.textContent = currentScores.teamA;
        }
        if (elements.teamBScoreEl) {
            elements.teamBScoreEl.textContent = currentScores.teamB;
        }
    }
    
    function updateActiveQuestionDisplay() {
        if (!elements.activeQuestionText) return;
        
        if (activeQuestion) {
            elements.activeQuestionText.textContent = activeQuestion.text;
            
            // Show the active question controls
            const controlsEl = document.getElementById('active-question-controls');
            if (controlsEl) {
                controlsEl.classList.remove('hidden');
                
                // Add deactivate button if needed
                if (!document.getElementById('deactivate-question-btn') && !isVotingActive && activeQuestion.isFinalized) {
                    const deactivateBtn = document.createElement('button');
                    deactivateBtn.id = 'deactivate-question-btn';
                    deactivateBtn.className = 'bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded';
                    deactivateBtn.innerHTML = '<i class="bi bi-x-circle mr-1"></i> Desativar Questão';
                    deactivateBtn.addEventListener('click', deactivateQuestion);
                    
                    controlsEl.appendChild(deactivateBtn);
                }
            }
        } else {
            elements.activeQuestionText.textContent = 'Nenhuma questão ativa';
            
            // Hide the active question controls
            const controlsEl = document.getElementById('active-question-controls');
            if (controlsEl) {
                controlsEl.classList.add('hidden');
            }
        }
    }
    
    // Event listeners setup
    function initEventListeners() {
        // Button event listeners
        const buttonActions = {
            'save-question-btn': addQuestion,
            'update-question-btn': updateQuestion,
            'start-voting-btn': startVoting,
            'end-voting-btn': endVoting,
            'reset-scores-btn': () => confirmAction(
                'Tem certeza que deseja resetar todas as pontuações?',
                resetScores,
                'warning'
            ),
            'upload-bulk-btn': uploadBulkQuestions,
            'refresh-preview-btn': () => {
                fetchQuestions();
                showToast('Lista Atualizada', 'A lista de questões foi atualizada', 'info');
            },
            'export-json-btn': exportQuestionsJson,
            'export-csv-btn': exportResultsCsv,
            'clear-all-btn': () => confirmAction(
                'Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.',
                clearAllData,
                'warning'
            ),
            'reset-database-btn': () => confirmAction(
                'ATENÇÃO: Esta ação irá resetar completamente a base de dados, removendo todas as questões e votos. Esta ação NÃO PODE ser desfeita.',
                resetDatabase,
                'danger'
            )
        };
        
        // Attach listeners to all defined buttons
        Object.entries(buttonActions).forEach(([id, action]) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', action);
            }
        });
        
        // Settings form submit
        const settingsForm = document.querySelector('#settings-tab-pane form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', function(e) {
                e.preventDefault();
                saveSettings();
            });
        }
    }
    
    // Socket listeners
    function initSocketListeners() {
        socket.on('connect', () => {
            console.log('Connected to websocket server');
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from websocket server');
            showToast('Desconectado', 'A conexão com o servidor foi perdida. Tentando reconectar...', 'error');
        });
        
        socket.on('currentState', (state) => {
            console.log('Current state received:', state);
            
            // Update active question
            if (state.activeQuestion) {
                activeQuestion = state.activeQuestion;
                updateActiveQuestionDisplay();
            }
            
            // Update voting status
            isVotingActive = state.isVotingActive;
            updateVotingControls();
            
            // Update scores
            if (state.teamAScore !== undefined && state.teamBScore !== undefined) {
                currentScores.teamA = state.teamAScore;
                currentScores.teamB = state.teamBScore;
                updateScoreDisplay();
            }
        });
        
        socket.on('teamNamesUpdated', (data) => {
            console.log('Team names updated:', data);
            
            // Update team names in admin panel
            const teamANameEl = document.querySelector('#current-scores .text-blue-600');
            const teamBNameEl = document.querySelector('#current-scores .text-red-600');
            
            if (teamANameEl && data.teamAName) {
                teamANameEl.innerHTML = `${data.teamAName}: <span class="score">${currentScores.teamA}</span>`;
            }
            
            if (teamBNameEl && data.teamBName) {
                teamBNameEl.innerHTML = `${data.teamBName}: <span class="score">${currentScores.teamB}</span>`;
            }
            
            // Update input fields in settings form
            const teamANameInput = document.getElementById('teamA-name');
            const teamBNameInput = document.getElementById('teamB-name');
            
            if (teamANameInput && data.teamAName) {
                teamANameInput.value = data.teamAName;
            }
            
            if (teamBNameInput && data.teamBName) {
                teamBNameInput.value = data.teamBName;
            }
        });
        
        socket.on('questionActivated', (data) => {
            console.log('Question activated:', data);
            activeQuestion = data.question;
            isVotingActive = data.isVotingActive;
            
            updateActiveQuestionDisplay();
            updateVotingControls();
            renderQuestionsList();
            renderQuestionsPreview();
        });
        
        socket.on('votingStarted', () => {
            console.log('Voting started');
            isVotingActive = true;
            updateVotingControls();
            
            showToast('Votação Iniciada', 'A votação foi iniciada com sucesso', 'success');
        });
        
        socket.on('votingEnded', (data) => {
            console.log('Voting ended:', data);
            isVotingActive = false;
            updateVotingControls();
            
            // Update scores
            if (data.results) {
                showToast('Votação Encerrada', `Resultados: Equipa A: ${data.results.teamA}, Equipa B: ${data.results.teamB}`, 'info');
            } else {
                showToast('Votação Encerrada', 'A votação foi encerrada com sucesso', 'info');
            }
            
            // Refresh questions to get updated vote counts
            fetchQuestions();
        });
        
        socket.on('scoresReset', (data) => {
            console.log('Scores reset:', data);
            currentScores.teamA = data.teamA;
            currentScores.teamB = data.teamB;
            
            updateScoreDisplay();
            fetchQuestions(); // Reload questions list
            
            showToast('Pontuações Resetadas', 'Todas as pontuações foram resetadas para 0', 'warning');
        });
        
        socket.on('error', (error) => {
            console.error('Server error:', error);
            showToast('Erro', error.message || 'Ocorreu um erro no servidor', 'error');
        });
        
        socket.on('questionDeleted', (data) => {
            console.log('Question deleted event received:', data);
            if (data && data.id) {
                // Remove from local array
                const index = questions.findIndex(q => q.id === data.id);
                if (index !== -1) {
                    questions.splice(index, 1);
                    // Update UI
                    renderQuestionsList();
                    renderQuestionsPreview();
                }
                showToast('Questão Removida', 'Uma questão foi removida com sucesso', 'info');
            }
        });
    }
    
    // Update voting controls based on state
    function updateVotingControls() {
        if (!elements.startVotingBtn || !elements.endVotingBtn) return;
        
        // Update button states based on active question and voting status
        if (activeQuestion) {
            elements.startVotingBtn.disabled = isVotingActive || activeQuestion.isFinalized;
            elements.endVotingBtn.disabled = !isVotingActive;
            
            // Update voting status message
            if (elements.votingStatus) {
                if (isVotingActive) {
                    elements.votingStatus.className = 'bg-green-100 text-green-800 p-3 rounded';
                    elements.votingStatus.innerHTML = '<i class="bi bi-check-circle mr-1"></i> Votação em andamento. Os participantes podem votar agora.';
                } else if (activeQuestion.isFinalized) {
                    elements.votingStatus.className = 'bg-red-100 text-red-800 p-3 rounded';
                    elements.votingStatus.innerHTML = '<i class="bi bi-x-circle mr-1"></i> Votação encerrada. Resultados: Equipa A: ' + 
                        activeQuestion.teamAVotes + ', Equipa B: ' + activeQuestion.teamBVotes;
                    
                    // Add deactivate button if it doesn't exist
                    const controlsEl = document.getElementById('active-question-controls');
                    if (controlsEl && !document.getElementById('deactivate-question-btn')) {
                        const deactivateBtn = document.createElement('button');
                        deactivateBtn.id = 'deactivate-question-btn';
                        deactivateBtn.className = 'bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded';
                        deactivateBtn.innerHTML = '<i class="bi bi-x-circle mr-1"></i> Desativar Questão';
                        deactivateBtn.addEventListener('click', deactivateQuestion);
                        
                        controlsEl.appendChild(deactivateBtn);
                    }
                } else {
                    elements.votingStatus.className = 'bg-blue-100 text-blue-800 p-3 rounded';
                    elements.votingStatus.innerHTML = '<i class="bi bi-info-circle mr-1"></i> Questão selecionada. Clique em "Iniciar Votação" para permitir votos.';
                }
            }
        } else {
            elements.startVotingBtn.disabled = true;
            elements.endVotingBtn.disabled = true;
            
            // Update voting status message
            if (elements.votingStatus) {
                elements.votingStatus.className = 'bg-blue-100 text-blue-800 p-3 rounded';
                elements.votingStatus.innerHTML = '<i class="bi bi-info-circle mr-1"></i> Selecione uma questão para ativar.';
            }
        }
    }
    
    // Actions
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
            
            // Clear fields
            textEl.value = '';
            orderEl.value = '';
            
            // Close modal
            document.getElementById('addQuestionModal').classList.add('hidden');
            
            // Reload questions
            fetchQuestions();
            
            // Notify user
            showToast('Questão Adicionada', `A questão #${newQuestion.order} foi adicionada com sucesso`, 'success');
            
        } catch (error) {
            console.error('Error adding question:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    function openEditModal(question) {
        // Ensure we have a valid ID to work with
        const questionId = question._id || question.id;
        
        const editIdField = document.getElementById('edit-question-id');
        const editTextField = document.getElementById('edit-question-text');
        const editOrderField = document.getElementById('edit-question-order');
        
        if (editIdField) editIdField.value = questionId;
        if (editTextField) editTextField.value = question.text;
        if (editOrderField) editOrderField.value = question.order;
        
        const modal = document.getElementById('editQuestionModal');
        if (modal) modal.classList.remove('hidden');
    }
    
    async function updateQuestion() {
        const idEl = document.getElementById('edit-question-id');
        const textEl = document.getElementById('edit-question-text');
        const orderEl = document.getElementById('edit-question-order');
        
        if (!textEl || !textEl.value.trim()) {
            showInputError(textEl, 'Por favor, insira o texto da questão');
            return;
        }
        
        if (!orderEl || !orderEl.value || orderEl.value < 1) {
            showInputError(orderEl, 'Por favor, insira um número de ordem válido (> 0)');
            return;
        }
        
        const id = idEl ? idEl.value : null;
        if (!id) {
            showToast('Erro', 'ID da questão não encontrado', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/questions/${id}`, {
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
            
            // Close modal
            const modal = document.getElementById('editQuestionModal');
            if (modal) modal.classList.add('hidden');
            
            // Reload questions
            fetchQuestions();
            
            // Notify user
            showToast('Questão Atualizada', `A questão #${updatedQuestion.order} foi atualizada com sucesso`, 'success');
            
        } catch (error) {
            showToast('Erro', `Falha ao atualizar questão: ${error.message}`, 'error');
        }
    }
    
    async function deleteQuestion(id) {
        if (!id) {
            showToast('Erro', 'ID da questão não definido', 'error');
            return;
        }
        
        try {
            // Ensure we're using the correct endpoint format and ID parameter
            const response = await fetch(`${API_URL}/questions/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Falha ao excluir questão: ${response.status}`);
            }
            
            // Remove the question from our local array
            const index = questions.findIndex(q => q._id === id || q.id === id);
            if (index !== -1) {
                questions.splice(index, 1);
            }
            
            // Refresh the UI
            renderQuestionsList();
            renderQuestionsPreview();
            
            showToast('Questão Removida', 'A questão foi removida com sucesso', 'success');
            
        } catch (error) {
            showToast('Erro', `Falha ao excluir questão: ${error.message}`, 'error');
        }
    }
    
    async function activateQuestion(id) {
        if (!id) {
            showToast('Erro', 'ID da questão é obrigatório', 'error');
            return;
        }
        
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
            
            // Find the question in our local array
            const selectedQuestion = questions.find(q => q._id === id || q.id === id);
            if (selectedQuestion) {
                // Update only this question as active
                activeQuestion = selectedQuestion;
                
                // Update UI immediately without waiting for socket
                updateActiveQuestionDisplay();
                updateVotingControls();
                renderQuestionsList();
                renderQuestionsPreview();
            }
            
        } catch (error) {
            showToast('Erro', error.message, 'error');
        }
    }
    
    function deactivateQuestion() {
        activeQuestion = null;
        updateActiveQuestionDisplay();
        updateVotingControls();
        renderQuestionsList();
        renderQuestionsPreview();
        
        showToast('Questão Desativada', 'A questão foi desativada com sucesso', 'info');
    }
    
    // Function to start voting
    async function startVoting() {
        try {
            // Get the active question ID
            if (!activeQuestion || !activeQuestion.id) {
                throw new Error("ID da questão é obrigatório");
            }
            
            const questionId = activeQuestion.id;
            console.log("Starting voting for question ID:", questionId);
            
            const response = await fetch(`${API_URL}/admin/start-voting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questionId: questionId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao iniciar votação');
            }
            
            // The rest will be updated via socket
            showToast('Votação Iniciada', 'A votação foi iniciada com sucesso', 'success');
            
        } catch (error) {
            console.error('Error starting voting:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    // Function to end voting
    async function endVoting() {
        try {
            // Get the active question ID
            if (!activeQuestion || !activeQuestion.id) {
                throw new Error("ID da questão é obrigatório");
            }
            
            const questionId = activeQuestion.id;
            console.log("Ending voting for question ID:", questionId);
            
            const response = await fetch(`${API_URL}/admin/end-voting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questionId: questionId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao encerrar votação');
            }
            
            // The rest will be updated via socket
            
        } catch (error) {
            console.error('Error ending voting:', error);
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
            
            // The rest will be updated via socket
            
        } catch (error) {
            console.error('Error resetting scores:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    // Function to handle bulk upload of questions
    async function uploadBulkQuestions() {
        try {
            const bulkQuestionsText = document.getElementById('bulk-questions').value.trim();
            
            if (!bulkQuestionsText) {
                throw new Error('Por favor, insira pelo menos uma questão');
            }
            
            // Split by new lines
            const questionTexts = bulkQuestionsText.split('\n')
                .map(text => text.trim())
                .filter(text => text.length > 0);
            
            if (questionTexts.length === 0) {
                throw new Error('Por favor, insira pelo menos uma questão válida');
            }
            
            // Create question objects with just text (order will be assigned by the server)
            const newQuestions = questionTexts.map(text => ({ text }));
            
            console.log("Bulk uploading questions:", newQuestions);
            
            const response = await fetch(`${API_URL}/admin/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ questions: newQuestions })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao carregar questões em massa');
            }
            
            const result = await response.json();
            
            // Close modal and refresh questions
            document.getElementById('bulkUploadModal').classList.add('hidden');
            document.getElementById('bulk-questions').value = '';
            
            fetchQuestions();
            
            showToast('Questões Adicionadas', `${result.count || newQuestions.length} questões foram adicionadas com sucesso`, 'success');
            
        } catch (error) {
            console.error('Error bulk uploading questions:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    // Tools functions (Settings Tab)
    function exportQuestionsJson() {
        if (questions.length === 0) {
            showToast('Nenhum Dado', 'Não há questões para exportar', 'warning');
            return;
        }
        
        // Organize data
        const exportData = questions.map(q => ({
            order: q.order,
            text: q.text,
            isFinalized: q.isFinalized,
            teamAVotes: q.teamAVotes || 0,
            teamBVotes: q.teamBVotes || 0
        }));
        
        // Create and download JSON file
        const jsonData = JSON.stringify(exportData, null, 2);
        downloadFile(jsonData, 'questions.json', 'application/json');
    }
    
    function exportResultsCsv() {
        if (questions.length === 0) {
            showToast('Nenhum Dado', 'Não há resultados para exportar', 'warning');
            return;
        }
        
        // Filter finalized questions and sort
        const finalizedQuestions = questions
            .filter(q => q.isFinalized)
            .sort((a, b) => a.order - b.order);
        
        if (finalizedQuestions.length === 0) {
            showToast('Nenhum Dado', 'Não há questões finalizadas para exportar', 'warning');
            return;
        }
        
        // Create CSV data
        let csvData = 'Número,Questão,Equipa A,Equipa B\n';
        finalizedQuestions.forEach(q => {
            csvData += `${q.order},"${q.text}",${q.teamAVotes || 0},${q.teamBVotes || 0}\n`;
        });
        
        // Download CSV file
        downloadFile(csvData, 'results.csv', 'text/csv;charset=utf-8;');
    }
    
    // Helper function for file downloads
    function downloadFile(data, filename, type) {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    async function clearAllData() {
        try {
            const response = await fetch(`${API_URL}/admin/reset-scores`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao limpar todos os dados');
            }
            
            // Reload questions
            fetchQuestions();
            
            // Notify user
            showToast('Dados Limpos', 'Todos os dados foram limpos com sucesso', 'success');
            
        } catch (error) {
            console.error('Error clearing all data:', error);
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
            
            // Reload questions
            fetchQuestions();
            
            // Notify user
            showToast('Base de Dados Resetada', 'A base de dados foi resetada com sucesso', 'success');
            
        } catch (error) {
            console.error('Error resetting database:', error);
            showToast('Erro', error.message, 'error');
        }
    }
    
    async function saveSettings() {
        // Get form elements with null checks
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
            // Try to save team names on the server
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
            console.error('Error saving settings:', error);
            
            // Even if there's an error with the server, we've saved locally
            if (socket && socket.connected) {
                socket.emit('updateSettings', settings);
                showToast('Configurações Salvas Localmente', 'Não foi possível salvar no servidor, mas as configurações foram enviadas via socket', 'warning');
            } else {
                showToast('Configurações Salvas Localmente', 'Não foi possível salvar no servidor ou enviar via socket', 'warning');
            }
        }
    }
    
    // Generic confirmation dialog function
    function confirmAction(message, action, type = 'info') {
        // Create modal for confirmation
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        modal.id = 'confirm-action-modal';
        
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
                        <i class="bi ${iconClass} text-2xl mr-3"></i>
                        <h3 class="text-lg font-bold ${headerClass}">Confirmação</h3>
                    </div>
                    <p class="text-gray-700">${message}</p>
                </div>
                <div class="px-6 py-3 bg-gray-50 flex justify-end space-x-3">
                    <button id="confirm-cancel-btn" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
                        Cancelar
                    </button>
                    <button id="confirm-action-btn" class="px-4 py-2 text-sm font-medium text-white ${buttonClass} rounded hover:opacity-90 transition-colors">
                        Confirmar
                    </button>
                </div>
            </div>
        `;
        
        // Add to DOM
        document.body.appendChild(modal);
        
        // Set up event handlers
        const cancelBtn = modal.querySelector('#confirm-cancel-btn');
        const confirmBtn = modal.querySelector('#confirm-action-btn');
        
        // Create promise to handle the result
        return new Promise((resolve) => {
            // Cancel button closes the modal and resolves with false
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
            
            // Confirm button closes the modal, calls the action, and resolves with true
            confirmBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                if (typeof action === 'function') {
                    action();
                }
                resolve(true);
            });
            
            // Click outside the modal also cancels
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve(false);
                }
            });
        });
    }
    
    function showInputError(inputEl, message) {
        // Add error styling to the input
        inputEl.classList.add('border-red-500', 'bg-red-50');
        
        // Check if error message already exists
        let errorEl = inputEl.nextElementSibling;
        if (!errorEl || !errorEl.classList.contains('error-message')) {
            errorEl = document.createElement('p');
            errorEl.className = 'text-red-500 text-sm mt-1 error-message';
            inputEl.parentNode.insertBefore(errorEl, inputEl.nextSibling);
        }
        
        errorEl.textContent = message;
        
        // Remove error after user starts typing
        const clearError = () => {
            inputEl.classList.remove('border-red-500', 'bg-red-50');
            if (errorEl) {
                errorEl.textContent = '';
            }
            inputEl.removeEventListener('input', clearError);
        };
        
        inputEl.addEventListener('input', clearError);
    }
    
    // Toast notification system
    function showToast(title, message, type = 'info') {
        // Check if toast container exists
        let toastContainer = document.querySelector('.toast-container');
        
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'fixed bottom-4 right-4 z-50 space-y-2 toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create new toast
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        
        // Set classes based on type
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
                <button class="text-gray-500 hover:text-gray-700 ml-4">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Add close event to the button
        const closeBtn = toast.querySelector('button');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                toast.classList.add('opacity-0');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            });
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, 5000);
    }
});