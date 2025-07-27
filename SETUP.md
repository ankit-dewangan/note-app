# Setup Instructions for Collaborative Encrypted Note-Taking App

This guide will help you set up the complete application with backend, frontend, and all required services.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Expo CLI installed globally: `npm install -g @expo/cli`
- MongoDB Atlas account
- AWS account with S3 access
- Clerk account for authentication

## 1. Cloud Services Setup

### MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a new cluster (M0 Free tier is sufficient for development)
3. Create a database user with read/write permissions
4. Get your connection string from the "Connect" button
5. Add your IP address to the IP whitelist

### AWS S3 Setup

1. Go to [AWS Console](https://aws.amazon.com/) and sign in
2. Navigate to S3 and create a new bucket
3. Configure bucket settings:
   - Block all public access (keep enabled)
   - Enable versioning (optional)
4. Create an IAM user with S3 access:
   - Go to IAM → Users → Create User
   - Attach the `AmazonS3FullAccess` policy
   - Generate access keys
5. Note down your bucket name, region, and access keys

### Clerk Setup

1. Go to [Clerk](https://clerk.com/) and create an account
2. Create a new application
3. Configure authentication:
   - Enable email/password authentication
   - Configure OAuth providers if needed
4. Get your publishable key and secret key from the dashboard
5. Configure webhooks (optional for advanced features)

## 2. Backend Setup

### Install Dependencies

```bash
cd backend
npm install
```

### Environment Configuration

1. Copy the environment example file:
```bash
cp env.example .env
```

2. Fill in your environment variables:
```env
# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/note-app?retryWrites=true&w=majority

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET_NAME=your-s3-bucket-name
AWS_REGION=us-east-1

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# Server Configuration
NODE_ENV=development
PORT=3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:19006

# Logging
LOG_LEVEL=info
```

### Build and Run

```bash
# Build TypeScript
npm run build

# Start development server
npm run dev

# Or start production server
npm start
```

The backend will be available at `http://localhost:3000`

## 3. Frontend Setup

### Install Dependencies

```bash
cd mobile-app
npm install
```

### Environment Configuration

1. Copy the environment example file:
```bash
cp env.example .env
```

2. Fill in your environment variables:
```env
# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here

# API Configuration
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000

# App Configuration
EXPO_PUBLIC_APP_NAME=Note App
EXPO_PUBLIC_APP_VERSION=1.0.0
```

### Run the App

```bash
# Start Expo development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run on web
npx expo start --web
```

## 4. Shared Utilities Setup

```bash
cd shared
npm install
npm run build
```

## 5. Database Initialization

The database will be automatically initialized when you first run the backend. The application will:

1. Create necessary collections
2. Set up indexes for optimal performance
3. Create text search indexes for note content

## 6. Testing the Setup

### Backend Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

### Frontend Authentication

1. Open the app in your device/simulator
2. You should see the sign-in/sign-up screen
3. Create an account or sign in
4. The app should redirect to the main interface

## 7. Development Workflow

### Backend Development

```bash
cd backend
npm run dev  # Starts with nodemon for auto-reload
```

### Frontend Development

```bash
cd mobile-app
npx expo start  # Starts Expo development server
```

### Shared Utilities Development

```bash
cd shared
npm run dev  # Watches for changes and rebuilds
```

## 8. Production Deployment

### Backend Deployment

1. Build the application:
```bash
cd backend
npm run build
```

2. Set production environment variables
3. Deploy to your preferred platform (Heroku, AWS, etc.)

### Frontend Deployment

1. Build for production:
```bash
cd mobile-app
eas build --platform all
```

2. Submit to app stores:
```bash
eas submit --platform ios
eas submit --platform android
```

## 9. Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check your connection string
   - Ensure your IP is whitelisted
   - Verify database user credentials

2. **AWS S3 Access Denied**
   - Check IAM user permissions
   - Verify bucket name and region
   - Ensure access keys are correct

3. **Clerk Authentication Issues**
   - Verify publishable and secret keys
   - Check CORS settings
   - Ensure webhook URLs are correct

4. **Expo Build Errors**
   - Clear Expo cache: `npx expo start --clear`
   - Update Expo CLI: `npm install -g @expo/cli@latest`
   - Check for dependency conflicts

### Logs

- Backend logs are available in the console and `logs/` directory
- Frontend logs are available in the Expo development tools
- Check browser console for web version

## 10. Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **API Keys**: Rotate keys regularly and use least-privilege access
3. **Database**: Enable network access restrictions
4. **S3**: Use bucket policies to restrict access
5. **CORS**: Configure allowed origins properly

## 11. Performance Optimization

1. **Database**: Monitor query performance and add indexes as needed
2. **Caching**: Implement Redis for session storage (optional)
3. **CDN**: Use CloudFront for S3 file delivery
4. **Compression**: Enable gzip compression on the backend

## 12. Monitoring and Analytics

1. Set up error tracking (Sentry, Bugsnag)
2. Implement application monitoring (New Relic, DataDog)
3. Set up database monitoring
4. Configure log aggregation

## Support

If you encounter any issues during setup, please:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Ensure all prerequisites are met
4. Verify environment variables are correctly set

For additional help, refer to the documentation in the `docs/` directory or create an issue in the project repository. 