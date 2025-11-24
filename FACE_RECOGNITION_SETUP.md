# Face Recognition Setup Guide

This guide explains how to set up and use the face recognition feature in the Mosaic registration system.

## Overview

The face recognition feature verifies student identity during registration by:
1. User uploads a photo of their student ID
2. User takes a selfie (via camera or phone using QR code)
3. System compares both photos using CompreFace AI
4. Only after successful match, user can proceed with email verification

## Prerequisites

- Docker and Docker Compose installed
- CompreFace folder (included in the project)
- At least 4GB RAM available for CompreFace

## Step 1: Start CompreFace Server

CompreFace is an open-source face recognition system. We'll run it using Docker.

### Navigate to CompreFace directory:
```bash
cd C:\Users\andre\Desktop\CompreFace-master
```

### Start CompreFace with Docker Compose:
```bash
docker-compose up -d
```

This will start:
- CompreFace UI (port 8000)
- PostgreSQL database
- CompreFace API server
- CompreFace Admin panel

Wait 2-3 minutes for all services to fully start.

### Verify CompreFace is running:
Open your browser and go to: http://localhost:8000

You should see the CompreFace login page.

## Step 2: Configure CompreFace

### 1. Create an account:
- Go to http://localhost:8000
- Click "Sign Up"
- Create an admin account

### 2. Create an Application:
- After logging in, click "Create Application"
- Name it "Mosaic Student Verification"
- Click "Create"

### 3. Create a Recognition Service:
- Inside your application, click "Add Service"
- Select "Face Verification" service
- Name it "Student ID Verification"
- Click "Create"

### 4. Get your API Key:
- Click on the service you just created
- Copy the **API Key** shown at the top
- It looks like: `00000000-0000-0000-0000-000000000000`

## Step 3: Configure Mosaic Backend

### 1. Update .env file:
Open `C:\Users\andre\Desktop\Mosaic\.env` and update these values:

```env
# CompreFace Configuration
COMPREFACE_API_URL=http://localhost:8000
COMPREFACE_API_KEY=<paste_your_api_key_here>
```

### 2. Install Python dependencies (if not already done):
```bash
cd C:\Users\andre\Desktop\Mosaic
pip install -r requirements.txt
```

The `requests` library (needed for CompreFace API calls) is already in requirements.txt.

## Step 4: Configure Mosaic Frontend

### Install qrcode package:
```bash
cd C:\Users\andre\Desktop\Mosaic\my-app
npm install qrcode @types/qrcode
```

This package is used to generate QR codes for mobile selfie capture.

## Step 5: Start Mosaic Application

### Terminal 1 - Start Backend:
```bash
cd C:\Users\andre\Desktop\Mosaic
uvicorn app.main:app --reload --port 8001
```

Note: We use port 8001 to avoid conflict with CompreFace (port 8000)

### Terminal 2 - Start Frontend:
```bash
cd C:\Users\andre\Desktop\Mosaic\my-app
npm run dev
```

## Step 6: Test Face Recognition

1. Go to http://localhost:5173 (or your Vite dev server URL)
2. Click "Register"
3. Fill in:
   - Name
   - Student ID number
   - Email
   - Password
   - Complete CAPTCHA
4. Click "Register"
5. Face verification popup appears:
   - Upload a photo of your student ID (with your face visible)
   - Choose to take a selfie with camera or scan QR code for phone
   - Take a clear selfie
6. System will verify your face matches the ID photo
7. If successful, proceed to email verification

## How Face Verification Works

### Backend (Python/FastAPI):
- `app/face_recognition_utils.py` - CompreFace API integration
- `app/routers/users.py` - `/users/verify-face` endpoint
- `app/models.py` - User model with `student_id` and `face_verified` fields

### Frontend (React/TypeScript):
- `my-app/src/components/FaceVerification.tsx` - Face verification UI
- `my-app/src/components/FaceVerification.css` - Styling
- `my-app/src/components/Auth.tsx` - Registration flow integration

### Flow:
1. User submits registration form with student ID
2. Backend creates user account (unverified)
3. Frontend shows face verification modal
4. User uploads ID photo and takes selfie
5. Frontend sends both images to `/users/verify-face` endpoint
6. Backend calls CompreFace API to compare faces
7. If similarity >= 70%, face is verified
8. User.face_verified is set to True in database
9. User proceeds to email verification

## Troubleshooting

### CompreFace not starting:
```bash
docker-compose down
docker-compose up -d
docker-compose logs -f
```

### CompreFace API errors:
- Check COMPREFACE_API_KEY is correct in .env
- Verify CompreFace is running: `docker ps`
- Check CompreFace logs: `docker-compose logs compreface-api`

### Face detection fails:
- Ensure photos are well-lit
- Face should be clearly visible and not obscured
- Try with higher resolution images
- Check CompreFace face detection threshold (default 0.8)

### Camera not working:
- Browser must have camera permissions
- HTTPS required for camera access (or localhost)
- Use QR code option to use phone camera instead

### Port conflicts:
If port 8000 is already in use:
1. Edit CompreFace's `docker-compose.yml`
2. Change CompreFace port to 8080:
   ```yaml
   ports:
     - "8080:8000"
   ```
3. Update `.env`:
   ```env
   COMPREFACE_API_URL=http://localhost:8080
   ```

## Security Considerations

1. **API Key**: Keep COMPREFACE_API_KEY secret, don't commit to git
2. **File Size**: Uploads limited to 10MB per image
3. **Verification**: Requires both face match (70%+) AND email verification
4. **Storage**: Images not permanently stored (only used for verification)
5. **One-time**: Each user can only verify face once

## Production Deployment

For production:

1. **Use HTTPS** for camera access
2. **Deploy CompreFace** on separate server with proper resources
3. **Increase threshold** to 0.75-0.80 for stricter verification
4. **Add rate limiting** to prevent abuse
5. **Store verification logs** for audit trail
6. **Use environment variables** for all secrets
7. **Set up monitoring** for CompreFace service health

## API Reference

### POST /users/verify-face

Verify user face by comparing student ID photo with selfie.

**Parameters:**
- `email` (string): User's email
- `student_id` (string): Student ID number
- `id_photo` (file): Student ID photo with face
- `selfie` (file): User selfie

**Response:**
```json
{
  "message": "Face verification successful!",
  "verified": true,
  "similarity": 0.85
}
```

**Errors:**
- 400: No face detected in one or both images
- 400: Faces don't match (similarity too low)
- 404: User not found
- 500: CompreFace API error

## Alternative Face Recognition Services

If CompreFace doesn't work for you, the system can be adapted to use:

1. **AWS Rekognition** - Cloud-based, highly accurate
2. **Azure Face API** - Microsoft's face recognition
3. **Google Cloud Vision** - Google's AI platform
4. **Face++ (Megvii)** - Popular commercial API

To switch services, modify `app/face_recognition_utils.py` to use the new API.

## Resources

- CompreFace Documentation: https://github.com/exadel-inc/CompreFace
- Face Recognition Best Practices: https://github.com/ageitgey/face_recognition
- Docker Documentation: https://docs.docker.com/
