# 🔐 Secure Notes - Collaborative Encrypted Note-Taking App

A full-stack collaborative encrypted note-taking application built with React Native (Expo), Node.js, and real-time collaboration features.

## ✨ Features

### 🔐 **Security & Authentication**
- **Clerk Authentication**: Secure user registration/login with Clerk SDK
- **Biometric Authentication**: Fingerprint/Face ID with fallback to password
- **End-to-End Encryption**: AES-256-GCM encryption for all note content
- **Secure Token Management**: JWT tokens with secure storage
- **Session Persistence**: Automatic login across app restarts

### 📝 **Note Management**
- **CRUD Operations**: Create, read, update, delete notes
- **Real-time Collaboration**: Multiple users can edit simultaneously
- **Operational Transform**: Conflict resolution for concurrent edits
- **Version History**: Track changes and revert if needed
- **Rich Text Support**: Formatting, links, and media embedding

### 🔍 **Advanced Search**
- **Fuzzy Search**: Powered by Fuse.js for intelligent matching
- **Real-time Results**: Instant search as you type
- **Search Across**: Titles, content, and tags
- **Highlighted Results**: See matching terms in context

### 📁 **File Management**
- **Secure File Uploads**: Encrypted files stored in AWS S3
- **Multiple File Types**: Images, documents, PDFs, and more
- **Progress Tracking**: Real-time upload progress
- **File Preview**: View files within the app
- **Automatic Encryption**: Sensitive files encrypted before upload

### 👥 **Real-time Collaboration**
- **Live Editing**: See others' changes in real-time
- **Cursor Tracking**: View other users' cursor positions
- **Participant Management**: Add/remove collaborators
- **Conflict Resolution**: Operational Transform for seamless collaboration
- **Presence Indicators**: See who's currently editing

### 🎨 **Theme System**
- **Light/Dark Themes**: Automatic theme switching
- **Custom Themes**: User-defined color schemes
- **Theme Persistence**: Settings saved securely
- **Real-time Switching**: Change themes without restart

### 📱 **Mobile-First Design**
- **Responsive UI**: Optimized for mobile devices
- **Native Performance**: Built with React Native
- **Offline Support**: Work without internet connection
- **Push Notifications**: Real-time collaboration alerts

## 🏗️ Architecture

### Frontend (React Native + Expo)
```
mobile-app/
├── app/                    # Expo Router screens
│   ├── index.tsx          # Welcome screen
│   ├── sign-in.tsx        # Authentication
│   ├── sign-up.tsx        # User registration
│   ├── home.tsx           # Notes list
│   └── note/[id].tsx      # Note editor
├── src/
│   ├── contexts/          # React contexts
│   ├── services/          # API and external services
│   ├── store/             # Zustand state management
│   ├── utils/             # Utilities and helpers
│   └── types/             # TypeScript definitions
```

### Backend (Node.js + Express)
```
backend/
├── src/
│   ├── controllers/       # Request handlers
│   ├── models/           # Mongoose schemas
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   ├── sockets/          # Socket.io handlers
│   └── utils/            # Utilities
```

### Shared
```
shared/
├── types/                # Common TypeScript types
├── utils/                # Shared utilities
└── encryption.ts         # Encryption functions
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- MongoDB
- AWS S3 bucket
- Clerk account

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Note-Making-App
```

### 2. Install Dependencies
```bash
# Install shared dependencies
cd shared && npm install

# Install backend dependencies
cd ../backend && npm install

# Install mobile app dependencies
cd ../mobile-app && npm install
```

### 3. Environment Setup

#### Backend (.env)
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/secure-notes

# Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_s3_bucket_name

# Server
PORT=3001
NODE_ENV=development
JWT_SECRET=your_jwt_secret

# Encryption
ENCRYPTION_KEY=your_encryption_key
```

#### Mobile App (env.example → .env)
```bash
# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Backend API
EXPO_PUBLIC_API_URL=http://localhost:3001/api

# Socket.io
EXPO_PUBLIC_SOCKET_URL=http://localhost:3001

# AWS S3
EXPO_PUBLIC_S3_BUCKET_NAME=your_s3_bucket_name
EXPO_PUBLIC_S3_REGION=us-east-1
```

### 4. Start Development Servers

#### Backend
```bash
cd backend
npm run dev
```

#### Mobile App
```bash
cd mobile-app
npm start
```

### 5. Run on Device/Simulator
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 🔧 Configuration

### Clerk Setup
1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your publishable and secret keys
4. Configure authentication methods (email, social, etc.)

### AWS S3 Setup
1. Create an S3 bucket
2. Configure CORS for file uploads
3. Create IAM user with S3 permissions
4. Set up bucket policies for secure access

### MongoDB Setup
1. Install MongoDB locally or use MongoDB Atlas
2. Create database and collections
3. Set up indexes for optimal performance

## 📱 Usage

### Authentication
1. Open the app
2. Sign up with email/password
3. Enable biometric authentication (optional)
4. Complete email verification

### Creating Notes
1. Tap the "+" button on the home screen
2. Enter title and content
3. Add collaborators (optional)
4. Save the note

### Collaboration
1. Share note with other users
2. See real-time changes
3. View cursor positions
4. Resolve conflicts automatically

### File Uploads
1. Open a note
2. Tap "Attach" button
3. Choose file type (image, document, camera)
4. Upload with progress tracking

### Search
1. Use the search bar on home screen
2. Type to see real-time results
3. Filter by tags or content
4. View highlighted matches

## 🔒 Security Features

### Encryption
- **AES-256-GCM**: Military-grade encryption
- **User-specific Keys**: Each user has unique encryption keys
- **Secure Storage**: Keys stored in device secure storage
- **End-to-End**: Data encrypted before leaving device

### Authentication
- **Multi-factor**: Email + password + biometric
- **Session Management**: Secure token handling
- **Automatic Logout**: Inactive session timeout
- **Device Trust**: Remember trusted devices

### Data Protection
- **At Rest**: Encrypted in database
- **In Transit**: TLS/SSL encryption
- **Access Control**: Role-based permissions
- **Audit Logs**: Track all access and changes

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd mobile-app
npm test
```

### E2E Tests
```bash
npm run test:e2e
```

## 📦 Deployment

### Backend Deployment
1. Set up production environment variables
2. Deploy to cloud platform (Heroku, AWS, etc.)
3. Configure SSL certificates
4. Set up monitoring and logging

### Mobile App Deployment
1. Build production bundle
2. Submit to App Store/Play Store
3. Configure app signing
4. Set up crash reporting

### Environment Variables
Ensure all production environment variables are properly configured:
- Database connection strings
- API keys and secrets
- AWS credentials
- SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)
- **Discussions**: [GitHub Discussions](link-to-discussions)
- **Email**: support@securenotes.com

## 🙏 Acknowledgments

- [Clerk](https://clerk.com) for authentication
- [Expo](https://expo.dev) for React Native development
- [Socket.io](https://socket.io) for real-time features
- [AWS S3](https://aws.amazon.com/s3/) for file storage
- [MongoDB](https://mongodb.com) for database
- [Fuse.js](https://fusejs.io) for fuzzy search

---

**Built with ❤️ for secure, collaborative note-taking** 