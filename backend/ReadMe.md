# Developer Project Planner - Backend API

Production-ready backend API for the Developer Project Planner MVP built with Node.js, Express, and MongoDB.

## ✅ Status: Production Ready

**Latest Update (January 24, 2026)**:
- ✅ Fixed critical "Cannot set headers after sent" error
- ✅ Resolved JWT_SECRET validation issues
- ✅ Added comprehensive security documentation
- ✅ Created complete testing guide
- ✅ Added production deployment guide
- ✅ Fixed environment configuration
- ✅ All tests passing
- ✅ Ready for production deployment

See [RESOLUTION_SUMMARY.md](RESOLUTION_SUMMARY.md) for detailed information on fixes.

## 🚀 Features

- ✅ RESTful API architecture
- ✅ JWT authentication & authorization
- ✅ MongoDB with Mongoose ODM
- ✅ Input validation & sanitization
- ✅ Error handling middleware
- ✅ Rate limiting & security headers
- ✅ CORS configuration
- ✅ Request logging with Winston
- ✅ Auto-calculation of project progress
- ✅ Cascade delete for related entities
- ✅ Comprehensive test coverage
- ✅ Production-ready security

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 6.0
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/dev-project-planner
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

4. **Start MongoDB**
```bash
# If using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or start your local MongoDB service
```

5. **Run the server**
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

Server will be running at `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── controllers/          # Request handlers
│   ├── auth.controller.js
│   ├── project.controller.js
│   ├── feature.controller.js
│   └── task.controller.js
├── middleware/           # Custom middleware
│   ├── auth.js          # Authentication & authorization
│   ├── errorHandler.js  # Global error handler
│   └── validate.js      # Validation middleware
├── models/              # Mongoose models
│   ├── User.js
│   ├── Project.js
│   ├── Feature.js
│   └── Task.js
├── routes/              # API routes
│   ├── auth.routes.js
│   ├── project.routes.js
│   ├── feature.routes.js
│   └── task.routes.js
├── .env.example         # Environment variables template
├── server.js            # Application entry point
└── package.json
```

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register        Register new user
POST   /api/auth/login           Login user
GET    /api/auth/me              Get current user
PUT    /api/auth/updatedetails   Update user details
PUT    /api/auth/updatepassword  Update password
```

### Projects
```
GET    /api/projects             Get all user projects
GET    /api/projects/:id         Get single project
POST   /api/projects             Create new project
PUT    /api/projects/:id         Update project
DELETE /api/projects/:id         Delete project
GET    /api/projects/:id/stats   Get project statistics
```

### Features
```
GET    /api/features/project/:projectId    Get all features for project
GET    /api/features/:id                   Get single feature
POST   /api/features                       Create new feature
PUT    /api/features/:id                   Update feature
DELETE /api/features/:id                   Delete feature
PUT    /api/features/reorder               Reorder features
```

### Tasks
```
GET    /api/tasks/project/:projectId    Get all tasks for project
GET    /api/tasks/feature/:featureId    Get tasks by feature
GET    /api/tasks/:id                   Get single task
POST   /api/tasks                       Create new task
PUT    /api/tasks/:id                   Update task
DELETE /api/tasks/:id                   Delete task
PUT    /api/tasks/reorder               Reorder tasks
```

## 🔒 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📝 Example Requests

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Create Project
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "E-Commerce Platform",
    "description": "Full-stack e-commerce application",
    "category": "Web App",
    "targetTimeline": 8,
    "difficulty": "Hard"
  }'
```

### Create Feature
```bash
curl -X POST http://localhost:5000/api/features \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "projectId": "project-id-here",
    "name": "User Authentication",
    "description": "Implement user login and registration",
    "type": "core",
    "priority": "Critical"
  }'
```

### Create Task
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "projectId": "project-id-here",
    "featureId": "feature-id-here",
    "title": "Setup JWT authentication",
    "description": "Implement JWT token generation and validation",
    "priority": "High"
  }'
```

## 🔐 Security Features

- **Helmet**: Sets various HTTP headers for security
- **CORS**: Configured for frontend origin
- **Rate Limiting**: Prevents brute-force attacks (100 requests per 15 minutes)
- **Input Validation**: Express-validator for request validation
- **Password Hashing**: Bcrypt with salt rounds
- **JWT**: Secure token-based authentication

## 📊 Database Schema

### User
- name, email, password (hashed)
- role, isActive, lastLogin
- timestamps

### Project
- name, description, category
- status, difficulty, targetTimeline
- startDate, endDate (auto-calculated)
- userId (reference), progress (auto-calculated)
- stats (totalFeatures, completedFeatures, totalTasks, completedTasks)
- timestamps

### Feature
- projectId (reference)
- name, description, type (core/nice-to-have/stretch)
- status, priority, order
- taskCount, completedTaskCount, progress (auto-calculated)
- timestamps

### Task
- projectId (reference), featureId (optional reference)
- title, description, status, priority
- dueDate, order
- timestamps

## ⚡ Auto-Calculations

The system automatically:
- Calculates project end date based on start date and timeline
- Updates feature progress when tasks are added/removed/updated
- Updates project progress when tasks/features change
- Updates feature and project statistics when tasks are modified

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

See [TESTING.md](TESTING.md) for comprehensive testing documentation.

## 🚀 Deployment

For comprehensive deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=your-very-secure-secret-key-min-32-characters
JWT_EXPIRE=7d
FRONTEND_URL=https://your-frontend-domain.com
```

**Important**: Generate a new JWT_SECRET for production:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Deployment Platforms
- **Traditional Server**: PM2 or Systemd (see [DEPLOYMENT.md](DEPLOYMENT.md))
- **Docker**: Container deployment with Docker Compose
- **Heroku**: Easy deployment with MongoDB Atlas
- **Railway**: Modern platform with auto-deployment
- **Render**: Free tier available
- **AWS/DigitalOcean**: More control, requires configuration

### Pre-Deployment Checklist

Before deploying to production, ensure you have:
- ✅ Generated new JWT_SECRET
- ✅ Configured MongoDB Atlas or secure database
- ✅ Set up CORS for your frontend domain
- ✅ Configured HTTPS/TLS
- ✅ Run full test suite
- ✅ Reviewed [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)

## 📚 Documentation

Complete documentation is available:

- **[SECURITY.md](SECURITY.md)** - Security best practices and configuration
- **[TESTING.md](TESTING.md)** - Testing guide and examples
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Comprehensive deployment guide
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - Production readiness checklist
- **[RESOLUTION_SUMMARY.md](RESOLUTION_SUMMARY.md)** - Issues fixed and resolutions
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick reference for common tasks
- **[CHANGELOG.md](CHANGELOG.md)** - Complete change log

## 👤 Author

Abhishek Ojha

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!