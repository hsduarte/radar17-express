const { Server } = require('socket.io');
const { prisma } = require('./prismaService');
const stateService = require('./stateService');
const voteController = require('../controllers/voteController');

let io;

function init(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Send current state to new client
    socket.emit('currentState', stateService.getCurrentState());
    
    // Handle client requesting voting state
    socket.on('checkVotingState', () => {
      voteController.checkVotingState(socket);
    });
    
    // Handle vote submission
    socket.on('submitVote', async (data) => {
      try {
        // Call the vote controller to process the vote
        await voteController.processVote(socket, data);
      } catch (error) {
        console.error('Error processing vote:', error);
        socket.emit('error', { message: error.message || 'Error processing vote' });
      }
    });
    
    socket.on('clientConnected', (data) => {
      // You can store client ID if needed
    });
    
    socket.on('disconnect', () => {
      // Handle disconnect
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

module.exports = {
  init,
  getIO
};