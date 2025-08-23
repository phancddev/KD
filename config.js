import dotenv from 'dotenv';
import { featuresConfig } from './features.config.js';

dotenv.config();

export default {
  server: {
    port: process.env.PORT || 2701,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'nqd_user',
    password: process.env.DB_PASSWORD || 'nqd_password',
    database: process.env.DB_NAME || 'nqd_database'
  },
  session: {
    secret: process.env.SESSION_SECRET || 'nqd-knowledge-duel-secret'
  },
  features: {
    // Sử dụng cấu hình từ file features.config.js
    enableRegistration: featuresConfig.enableRegistration,
    enableLogin: featuresConfig.enableLogin,
    enableGuestMode: featuresConfig.enableGuestMode
  }
};