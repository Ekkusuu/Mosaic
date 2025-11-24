# Mosaic

A student collaboration platform with AI-powered face recognition for secure registration.

## Features

- **Secure Registration with Face Recognition**: Students verify their identity by uploading their student ID and taking a selfie. The system uses CompreFace AI to ensure the photos match before allowing registration.
- **Email Verification**: Two-factor verification with email codes
- **Student Profiles**: Searchable profiles by university, specialty, and year
- **File Sharing**: Encrypted file uploads with compression
- **AI Chatbot**: Get help and answers to questions
- **Post & Comments**: Share content and engage with the community
- **Custom Themes**: Multiple color themes (Sakura, Forest, Coffee, Honeycomb)

## Face Recognition Setup

The registration process now includes face verification:

1. User provides student ID number during registration
2. User uploads a photo of their student ID card (showing their face)
3. User takes a selfie via webcam or phone (QR code option)
4. System compares photos using CompreFace AI (70% similarity threshold)
5. Only after successful face match, user proceeds to email verification

**See [FACE_RECOGNITION_SETUP.md](FACE_RECOGNITION_SETUP.md) for detailed setup instructions.**

Quick setup:
```bash
# 1. Start CompreFace
cd CompreFace-master
docker-compose up -d

# 2. Configure API key in .env (see FACE_RECOGNITION_SETUP.md)

# 3. Install frontend dependencies
cd my-app
npm install

# 4. Start backend (port 8001 to avoid conflict with CompreFace)
cd ..
uvicorn app.main:app --reload --port 8001

# 5. Start frontend
cd my-app
npm run dev
```

## Technology Stack

### Backend
- FastAPI (Python web framework)
- SQLModel (ORM with SQLite/PostgreSQL)
- CompreFace (Face recognition API)
- PyJWT (Authentication)
- Bcrypt (Password hashing)
- Cryptography (File encryption)

### Frontend
- React 18 + TypeScript
- Vite (Build tool)
- React Router (Navigation)
- Custom CSS with CSS variables (theming)

### AI & Machine Learning
- CompreFace (Face verification)
- Docker (CompreFace containerization)

## Project Structure

```
Mosaic/
├── app/                          # Backend (Python/FastAPI)
│   ├── face_recognition_utils.py # CompreFace integration
│   ├── routers/
│   │   ├── users.py             # Auth & face verification endpoints
│   │   ├── profiles.py
│   │   ├── files.py
│   │   ├── posts.py
│   │   └── chatbot.py
│   ├── models.py                # Database models
│   ├── security.py              # Password hashing, JWT
│   └── validators.py            # Input validation
├── my-app/                      # Frontend (React/TypeScript)
│   └── src/
│       └── components/
│           ├── FaceVerification.tsx  # Face verification UI
│           ├── Auth.tsx              # Login/Register
│           ├── MainPage.tsx
│           └── ProfilePage.tsx
├── CompreFace-master/           # Face recognition system (Docker)
├── FACE_RECOGNITION_SETUP.md    # Face recognition setup guide
└── README.md                    # This file
```

## Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- Docker & Docker Compose (for CompreFace)

### 1. Clone the repository
```bash
git clone https://github.com/Ekkusuu/Mosaic.git
cd Mosaic
```

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run database migrations (if using Alembic)
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload --port 8001
```

### 3. Frontend Setup
```bash
cd my-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. CompreFace Setup (Face Recognition)
See detailed instructions in [FACE_RECOGNITION_SETUP.md](FACE_RECOGNITION_SETUP.md)

```bash
cd CompreFace-master
docker-compose up -d
# Wait 2-3 minutes for services to start
# Access CompreFace UI at http://localhost:8000
# Create account, application, and get API key
# Add API key to .env file
```

## Environment Variables

Required in `.env`:

```env
# Database
DATABASE_URL=sqlite:///./mosaic.db

# JWT Authentication
JWT_SECRET=your_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=600

# Email (for verification codes)
EMAIL_ADDRESS=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# CompreFace (Face Recognition)
COMPREFACE_API_URL=http://localhost:8000
COMPREFACE_API_KEY=your_compreface_api_key

# File Uploads
UPLOAD_DIR=./uploads
```

## Usage

### User Registration Flow
1. Navigate to http://localhost:5173
2. Click "Register"
3. Fill in name, student ID, email, password
4. Complete CAPTCHA
5. **Face Verification:**
   - Upload student ID photo
   - Take selfie (camera or QR code for phone)
   - Wait for AI verification
6. **Email Verification:**
   - Check email for 6-digit code
   - Enter code to complete registration
7. Account activated!

### API Endpoints

#### Face Recognition
- `POST /users/verify-face` - Verify face with student ID
  - Params: email, student_id, id_photo (file), selfie (file)
  - Returns: similarity score and verification status

#### Authentication
- `POST /users/register` - Register new user (requires student_id)
- `POST /users/login` - Login with email/password
- `POST /users/verify-email` - Verify email with code
- `GET /users/me` - Get current user

#### Profiles
- `GET /profiles/me` - Get own profile
- `PUT /profiles/me` - Update profile
- `GET /profiles/{username}` - Get public profile
- `GET /profiles/search` - Search profiles

## Security Features

1. **Face Verification**: AI-powered identity verification using CompreFace
2. **Email Verification**: Two-factor authentication with time-limited codes
3. **Password Security**: Bcrypt hashing with salt
4. **JWT Tokens**: Secure session management with HTTP-only cookies
5. **CAPTCHA**: Bot prevention on login/register
6. **Rate Limiting**: Brute force protection (5 attempts, 15min lockout)
7. **File Encryption**: AES-256-GCM for uploaded files
8. **Input Validation**: Email domain whitelist, password complexity

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/Ekkusuu/Mosaic/issues
- Face Recognition Issues: See [FACE_RECOGNITION_SETUP.md](FACE_RECOGNITION_SETUP.md)

## Acknowledgments

- CompreFace for the open-source face recognition system
- FastAPI for the excellent Python web framework
- React team for the frontend library