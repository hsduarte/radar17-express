require('dotenv').config();

const config = {
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  }
};

module.exports = config; 