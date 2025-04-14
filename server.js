const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Inicializar configurações
dotenv.config();

// Criar aplicação Express e servidor HTTP
const app = express();
const server = http.createServer(app);

// Configurar Socket.io e exportá-lo
const socketService = require('./services/socketService');
socketService.init(server);

require('./generated/prisma');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Compartilhar io com as rotas
app.use(require('./middlewares/socketMiddleware'));

// Rotas
app.use('/api/questions', require('./routes/questions'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/admin', require('./routes/admin'));

// Iniciar servidor
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Servidor a rodar na porta ${PORT}`);
});

module.exports = { app, server };