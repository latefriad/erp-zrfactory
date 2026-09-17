import path from 'path';
import dotenv from 'dotenv';

// Load .env
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  dbFilePath: process.env.DB_FILE_PATH && path.isAbsolute(process.env.DB_FILE_PATH)
    ? process.env.DB_FILE_PATH
    : path.resolve(__dirname, '../../data/zr_factory.sqlite'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'default-dev-secret-zr-factory-erp',
  currency: process.env.CURRENCY || 'DZD',
  partnerDefaults: {
    riadPercentage: parseFloat(process.env.DEFAULT_RIAD_PERCENTAGE || '30'),
    brotherPercentage: parseFloat(process.env.DEFAULT_BROTHER_PERCENTAGE || '70'),
  }
};
