import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { authenticateUser } from './middleware/auth';
import notesRoutes from './routes/notes';
import filesRoutes from './routes/files';
import searchRoutes from './routes/search';
import { setupSocketHandlers } from './sockets';
import { clerkClient } from '@clerk/clerk-sdk-node';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000', 
      'http://localhost:19006',
      'http://10.40.1.77:19006',
      'http://10.40.1.77:3001'
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100000, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000', 
    'http://localhost:19006',
    'http://10.40.1.77:19006',
    'http://10.40.1.77:3001'
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/notes', authenticateUser, notesRoutes);
app.use('/api/files', authenticateUser, filesRoutes);
app.use('/api/search', authenticateUser, searchRoutes);

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    // Use the same token verification logic as the REST API
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return next(new Error('Invalid token format'));
    }

    // Decode the payload (second part of JWT)
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    if (!payload.sub) {
      return next(new Error('Invalid token payload'));
    }

    const userId = payload.sub;

    // Get user from Clerk using the user ID from the token
    const clerkUser = await clerkClient.users.getUser(userId);
    
    if (!clerkUser) {
      return next(new Error('User not found'));
    }

    // Attach user to socket
    socket.data.user = {
      id: clerkUser.id,
      email: clerkUser.emailAddresses.find((email: any) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    };

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
});

// Setup socket handlers
setupSocketHandlers(io);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

startServer(); 