const { PrismaClient } = require('../generated/prisma');

// Create a singleton instance
let prisma;

if (!global.prisma) {
  global.prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  });
}

prisma = global.prisma;

// Test connection function
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Successfully connected to the database');
    return true;
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    return false;
  }
}

module.exports = {
  prisma,
  testConnection
};