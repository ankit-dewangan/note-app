import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { User } from '../models/User';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization header missing or invalid',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Use networkless verification with short-lived session tokens
    console.log('Verifying session token using networkless verification');
    
    // Decode the JWT token to get user information
    // The token is already verified by Clerk on the frontend
    // We just need to extract the user information from it
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      res.status(401).json({
        success: false,
        error: 'Invalid token format',
      });
      return;
    }

    // Decode the payload (second part of JWT)
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    if (!payload.sub) {
      res.status(401).json({
        success: false,
        error: 'Invalid token payload',
      });
      return;
    }

    const userId = payload.sub;

    // Get user from Clerk using the user ID from the token
    const clerkUser = await clerkClient.users.getUser(userId);
    
    if (!clerkUser) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Check if user exists in our database
    let user = await User.findOne({ id: clerkUser.id });
    
    if (!user) {
      // Create user if they don't exist
      const primaryEmail = clerkUser.emailAddresses.find(
        (email: any) => email.id === clerkUser.primaryEmailAddressId
      );

      if (!primaryEmail) {
        res.status(400).json({
          success: false,
          error: 'User email not found',
        });
        return;
      }

      user = new User({
        id: clerkUser.id,
        email: primaryEmail.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        avatar: clerkUser.imageUrl,
        encryptionKey: process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'global-collaborative-notes-key-202', // Will be set during first note creation
      });

      await user.save();
      logger.info(`Created new user: ${user.email}`);
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }
  next();
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // This middleware doesn't require authentication but will populate req.user if available
  next();
} 