const { PrismaClient } = require('../generated/prisma');

// Create a new PrismaClient instance with debug logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Test the connection
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Successfully connected to the database');
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    // Don't exit the process, just log the error
  }
}

// Run the test
testConnection();

module.exports = prisma;