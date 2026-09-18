import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './utils/errors';
import healthRoutes from './routes/health';
import systemRoutes from './routes/system';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import materialRoutes from './routes/materials';
import customerRoutes from './routes/customers';
import orderRoutes from './routes/orders';
import supplierRoutes from './routes/suppliers';
import expenseRoutes from './routes/expenses';
import partnerRoutes from './routes/partners';
import cashRoutes from './routes/cash';
import accountingPeriodRoutes from './routes/accountingPeriods';
import reportRoutes from './routes/reports';
import auditRoutes from './routes/audit';
import productionRoutes from './routes/production';
import shippingRoutes from './routes/shipping';
import dashboardRoutes from './routes/dashboard';


export function createApp(): Application {
  const app = express();

  // Cross-Origin Resource Sharing
  app.use(cors({
    origin: (origin, callback) => {
      // Allow localhost dev environments or undefined origin (curl, etc.)
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true); // Dev friendly
      }
    },
    credentials: true,
  }));

  // Body parsers with generous limit for high-res product photos
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // HTTP Request Logger
  app.use(requestLogger);

  // API Routes
  app.use('/api', healthRoutes);
  app.use('/api', systemRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/materials', materialRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/partners', partnerRoutes);
  app.use('/api/cash', cashRoutes);
  app.use('/api/accounting-periods', accountingPeriodRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/production', productionRoutes);
  app.use('/api/shipping', shippingRoutes);
  app.use('/api/dashboard', dashboardRoutes);


  // Static frontend serving in production/standalone mode
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // 404 Route Handler
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
