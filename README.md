# Dummy Project - Monorepo

A full-stack application with React frontend and Node.js backend, featuring Docker containerization, CI/CD pipelines, and VPS deployment.

## 📁 Monorepo Structure

```
DummyProject/
├── frontend/              # React + Vite frontend application
├── backend/               # Node.js + Express + Prisma backend
├── scripts/               # Backup and utility scripts
├── .github/workflows/     # CI/CD pipelines
├── docker-compose.yml     # Development Docker orchestration
├── docker-compose.prod.yml # Production Docker orchestration
├── nginx-reverse-proxy.conf # Nginx reverse proxy configuration
└── package.json           # Root workspace configuration
```

## ✨ Features

- **Monorepo Structure**: Unified codebase with pnpm workspaces
- **Docker Containerization**: Development and production configurations
- **CI/CD Pipeline**: Automated testing, building, and deployment via GitHub Actions
- **VPS Deployment**: Automated deployment to VPS server
- **Database Backups**: Automated MongoDB backups with optional GCS upload
- **Real-time Features**: Socket.io for real-time communication
- **Redis Integration**: Session management and Socket.io adapter

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- Docker & Docker Compose
- pnpm (recommended) or npm
- MongoDB (or use Docker)

### Installation

```bash
# Clone the repository
git clone https://github.com/julfyalnayeem/DummyProject.git
cd DummyProject

# Install all dependencies
npm run install:all

# Or with pnpm
pnpm install
```

### Development with Docker (Recommended)

```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

### Development without Docker

```bash
# Start frontend (http://localhost:3002)
npm run dev:frontend

# Start backend (http://localhost:3001)
npm run dev:backend
```

## 🐳 Docker Commands

### Development
```bash
docker-compose up -d                    # Start services
docker-compose logs -f                  # View logs
docker-compose down                     # Stop services
docker-compose up -d --build            # Rebuild and start
```

### Production
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f
docker-compose -f docker-compose.prod.yml --env-file .env.production down
```

## 🔄 Backup System

The project includes an automated backup system for MongoDB:

- **Manual Backups**: `docker-compose run --rm backup`
- **Scheduled Backups**: Automatic twice daily at 11 AM and 5 PM (Asia/Dhaka timezone)
- **Storage**: Local storage in `./backups/` directory
- **Cloud Upload**: Optional Google Cloud Storage integration
- **Retention**: Configurable local retention (default 7 days)

## 🔧 CI/CD Pipeline

GitHub Actions workflows are configured for:
1. **Test** - Validates frontend code
2. **Build** - Creates Docker images and pushes to Docker Hub
3. **Deploy** - Deploys to VPS via SSH

### Required GitHub Secrets
- `DOCKERHUB_USERNAME` - Docker Hub username
- `DOCKERHUB_TOKEN` - Docker Hub access token
- `VPS_HOST` - VPS server IP address
- `VPS_USER` - SSH username
- `VPS_SSH_KEY` - Private SSH key
- `VPS_PORT` - SSH port (usually 22)

## 📝 Environment Variables

### Production `.env.production`
```env
# MongoDB Configuration
MONGO_USER=your_mongo_user
MONGO_PASSWORD=your_secure_password
MONGO_DATABASE=dummy

# Redis
REDIS_URL=redis://redis:6379

# Secrets
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

# Docker Hub
DOCKERHUB_USERNAME=your_dockerhub_username

# Server
NODE_ENV=production
```

## 🌐 VPS Deployment

### Quick Deploy
1. SSH into your VPS
2. Clone the repository to `/opt/DummyProject`
3. Create `.env.production` with your configuration
4. Run `docker-compose -f docker-compose.prod.yml --env-file .env.production up -d`

### Access Points
- Frontend: `http://YOUR_VPS_IP`
- Backend API: `http://YOUR_VPS_IP:3001`

For detailed VPS deployment instructions, see [docs/VPS_DEPLOYMENT_GUIDE.md](./docs/VPS_DEPLOYMENT_GUIDE.md)

## 📦 Tech Stack

### Frontend
- React 18
- Vite
- Redux Toolkit
- Tailwind CSS
- Socket.io Client

### Backend
- Node.js
- Express
- MongoDB with Mongoose
- Prisma ORM
- Redis
- Socket.io

### Infrastructure
- Docker & Docker Compose
- Nginx
- GitHub Actions
- MongoDB
- Redis

## 📄 License

UNLICENSED - Proprietary

## 👥 Support

For support or questions, please open an issue on GitHub.
