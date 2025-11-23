# Mosaic - Student Knowledge Platform

A full-stack web application designed to facilitate knowledge sharing and collaboration among students through an intuitive social platform with AI-powered assistance.

## Table of Contents
- [Overview](#overview)
- [Architecture & Theory](#architecture--theory)
- [Technology Stack](#technology-stack)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)

---

## Overview

Mosaic is a modern student collaboration platform that combines social networking features with AI-powered educational assistance. The application allows students to share notes, engage in discussions, manage their academic profiles, and interact with an AI chatbot for learning support.

The platform emphasizes:
- **Knowledge Sharing**: Students can create, upload, and share educational content
- **Community Building**: Profile-based social interactions with university verification
- **AI Integration**: Intelligent chatbot assistance for academic queries
- **Personalization**: Customizable themes and user preferences

---

## Architecture & Theory

### Client-Server Architecture

Mosaic follows a modern **three-tier architecture** pattern:

1. **Presentation Layer (Frontend)**
   - Single Page Application (SPA) built with React
   - Handles UI rendering, user interactions, and client-side routing
   - Implements optimistic updates and responsive design patterns

2. **Application Layer (Backend API)**
   - RESTful API built with FastAPI
   - Manages business logic, authentication, and data validation
   - Handles AI service integration and file management

3. **Data Layer (Database)**
   - PostgreSQL relational database
   - Stores user data, posts, files, and relationships
   - Ensures data integrity through constraints and indexes

### Key Architectural Patterns

#### Component-Based UI Architecture
The frontend uses React's component model, promoting:
- **Reusability**: UI elements like popups, editors, and viewers are self-contained
- **Separation of Concerns**: Each component manages its own state and behavior
- **Composition**: Complex UIs are built by composing smaller components

#### API-First Design
The backend exposes a well-defined REST API:
- **Stateless Communication**: Each request contains all necessary information
- **Resource-Oriented**: Endpoints represent domain entities (users, profiles, files)
- **Standard HTTP Methods**: GET, POST, PUT, DELETE for CRUD operations

#### Authentication & Security Theory

The platform implements **JWT (JSON Web Token)** authentication:
- **Stateless Sessions**: No server-side session storage required
- **Token-Based Auth**: Users receive encrypted tokens after login
- **Protected Routes**: Frontend guards and backend middleware verify tokens
- **Password Security**: Bcrypt hashing with salt for password storage

Security measures include:
- Email verification for account activation
- Rate limiting on authentication endpoints
- CORS policies to prevent unauthorized cross-origin requests
- Input validation to prevent injection attacks

#### Database Design Principles

The data model follows relational database best practices:
- **Normalization**: Reduces data redundancy and maintains integrity
- **Foreign Keys**: Establishes relationships between entities
- **Indexes**: Optimizes query performance on frequently searched columns
- **Timestamps**: Tracks creation and modification times for audit trails

#### Real-Time AI Integration

The chatbot feature demonstrates **service-oriented architecture**:
- **External Service Integration**: Connects to Hugging Face's inference API
- **Asynchronous Processing**: Handles long-running AI operations efficiently
- **Context Management**: Maintains conversation history for coherent responses
- **Error Handling**: Graceful degradation when AI service is unavailable

### Frontend State Management

The application uses React's built-in state management:
- **Component State**: For local, isolated UI state
- **Context API**: For global state like theme preferences and authentication
- **Props Drilling Prevention**: Context provides centralized state access

### Routing Strategy

Client-side routing with React Router enables:
- **Instant Navigation**: No full page reloads
- **Protected Routes**: Authentication guards prevent unauthorized access
- **Dynamic Routes**: Profile pages with user-specific parameters
- **History Management**: Browser back/forward button support

---

## Technology Stack

### Frontend
- **React 19**: Modern UI library with hooks and concurrent features
- **TypeScript**: Type-safe JavaScript for better developer experience
- **Vite**: Fast build tool and development server
- **React Router**: Client-side routing and navigation
- **CSS Modules**: Scoped styling with theme system

### Backend
- **FastAPI**: High-performance Python web framework
- **SQLModel**: SQL database ORM with Pydantic integration
- **PostgreSQL**: Robust relational database
- **Uvicorn**: ASGI server for async Python applications
- **PyJWT**: JSON Web Token implementation
- **Bcrypt**: Secure password hashing

### AI & Services
- **Hugging Face API**: Large language model inference
- **Alembic**: Database migration tool
- **Python-multipart**: File upload handling

---

## How It Works

### User Journey

1. **Registration & Authentication**
   - User creates an account with university email
   - System validates email domain against approved universities
   - Verification email is sent with confirmation link
   - Upon verification, user can access the platform

2. **Profile Setup**
   - Users create their academic profile
   - Add information like university, major, interests
   - Upload profile picture and customize theme

3. **Content Interaction**
   - Browse notes and files shared by other students
   - Upload personal notes and study materials
   - React to posts through comments and interactions
   - Search and filter content by topics or users

4. **AI Assistance**
   - Open chat interface to interact with AI tutor
   - Ask questions about academic topics
   - Receive contextual responses and explanations
   - Continue conversations with context retention

5. **Community Features**
   - View other students' profiles
   - Connect with peers from same university
   - Explore public profiles and shared knowledge

### Request Flow Example: Viewing a Note

1. User clicks on a note in the main feed
2. Frontend sends GET request to `/files/{file_id}`
3. Backend validates JWT token from request headers
4. Database query retrieves file metadata and content
5. Authorization check ensures user has access rights
6. Response returns file data in JSON format
7. Frontend renders note in viewer component
8. User can now read, comment, or save the note

### AI Chat Flow

1. User types message in chat interface
2. Frontend maintains conversation history array
3. POST request sent to `/chatbot/chat` with message history
4. Backend formats messages for AI model
5. Request forwarded to Hugging Face inference API
6. AI generates response based on conversation context
7. Response streamed back to frontend
8. Message appended to chat history and displayed

### File Upload Process

1. User selects file through upload interface
2. File read as multipart form data
3. Frontend sends POST to `/files/upload` endpoint
4. Backend validates file type and size
5. File saved to server storage directory
6. Database record created with metadata
7. File linked to user's profile
8. Success response triggers UI update

### Theme System

The application implements a dynamic theming system:
- CSS custom properties define color variables
- Theme context stores current selection
- Theme classes applied to root element
- All components reference CSS variables
- Smooth transitions between theme changes
- Themes: Default, Honeycomb, Forest, Sakura, Coffee

---

## Project Structure

```
Mosaic/
├── app/                      # Backend Python application
│   ├── main.py              # FastAPI application entry point
│   ├── models.py            # SQLModel database models
│   ├── db.py                # Database connection and configuration
│   ├── security.py          # Authentication and JWT handling
│   ├── validators.py        # Input validation logic
│   ├── loginSystem.py       # Login endpoint handlers
│   ├── registerSystem.py    # Registration logic
│   ├── email_utils.py       # Email verification system
│   ├── routers/             # API route modules
│   │   ├── users.py         # User management endpoints
│   │   ├── profiles.py      # Profile CRUD operations
│   │   ├── files.py         # File upload and retrieval
│   │   ├── chatbot.py       # AI chat integration
│   │   └── posts.py         # Content posting features
│   └── config/              # Configuration files
│       └── email_domains.txt # Approved university domains
│
├── my-app/                  # Frontend React application
│   ├── src/
│   │   ├── App.tsx          # Root component with routing
│   │   ├── main.tsx         # Application entry point
│   │   ├── components/      # React components
│   │   │   ├── Auth.tsx     # Login and registration UI
│   │   │   ├── MainPage.tsx # Main feed and navigation
│   │   │   ├── ProfilePage.tsx    # User profile editor
│   │   │   ├── PublicProfile.tsx  # Public profile viewer
│   │   │   ├── AIChat.tsx   # Chatbot interface
│   │   │   ├── NoteEditor.tsx     # Note creation tool
│   │   │   ├── NoteViewer.tsx     # Note display component
│   │   │   ├── RequireAuth.tsx    # Route protection
│   │   │   └── [Theme].css  # Theme stylesheets
│   │   └── contexts/        # React context providers
│   │       └── ThemeContext.tsx   # Theme state management
│   ├── public/              # Static assets
│   └── vite.config.ts       # Vite build configuration
│
├── uploads/                 # User-uploaded files storage
├── tests/                   # Test suite
├── requirements.txt         # Python dependencies
├── package.json            # Node.js dependencies
└── run-dev.bat             # Development startup script
```

---

## Development Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 13+

### Backend Setup
1. Navigate to project root
2. Install Python dependencies: `pip install -r requirements.txt`
3. Configure database connection
4. Run migrations: `alembic upgrade head`
5. Start server: `uvicorn app.main:app --reload`

### Frontend Setup
1. Navigate to `my-app` directory
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Application runs on `http://localhost:5173`

### Running Tests
```bash
pytest tests/
```

---

## Features

- **User Authentication**: Secure registration and login with JWT
- **Email Verification**: University email domain validation
- **Profile Management**: Customizable user profiles
- **File Sharing**: Upload and share notes and documents
- **AI Chatbot**: Integrated educational assistant
- **Theme System**: Multiple visual themes (Honeycomb, Forest, Sakura, Coffee)
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: Dynamic content loading

---

## API Documentation

Once the backend is running, visit `/docs` for interactive API documentation powered by FastAPI's automatic OpenAPI generation.

---

## Contributing

This is a student project. Contributions, suggestions, and feedback are welcome through standard pull request workflows.

---

## License

This project is for educational purposes.