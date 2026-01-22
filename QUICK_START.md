# Quick Start Guide - Face Recognition

Get the face recognition feature running in 5 minutes!

## Prerequisites Check
- [ ] Docker Desktop installed and running
- [ ] Python 3.9+ installed
- [ ] Node.js 18+ installed
- [ ] At least 4GB free RAM

## Step 1: Start CompreFace (2 minutes)

```powershell
# Navigate to CompreFace folder
cd C:\Users\andre\Desktop\CompreFace-master

# Start CompreFace
docker-compose up -d

# Wait 2-3 minutes for services to start
# Check status
docker-compose ps
```

Expected output: All services should show "Up"

## Step 2: Configure CompreFace (1 minute)

1. Open browser: http://localhost:8000
2. Click "Sign Up" and create account
3. Create Application: "Mosaic Student Verification"
4. Add Service: Select "Face Verification"
5. Copy the API Key (looks like: `00000000-0000-0000-0000-000000000000`)

## Step 3: Configure Mosaic Backend (30 seconds)

```powershell
# Navigate to Mosaic folder
cd C:\Users\andre\Desktop\Mosaic

# Open .env file and update:
# COMPREFACE_API_URL=http://localhost:8000
# COMPREFACE_API_KEY=<paste_your_api_key_here>

# Install dependencies (if not done)
pip install -r requirements.txt
```

## Step 4: Configure Frontend (30 seconds)

```powershell
# Navigate to frontend folder
cd C:\Users\andre\Desktop\Mosaic\my-app

# Install dependencies
npm install
```

## Step 5: Start Services (30 seconds)

Open 2 terminals:

### Terminal 1 - Backend:
```powershell
cd C:\Users\andre\Desktop\Mosaic
uvicorn app.main:app --reload --port 8001
```

### Terminal 2 - Frontend:
```powershell
cd C:\Users\andre\Desktop\Mosaic\my-app
npm run dev
```

## Step 6: Test It! (30 seconds)

1. Open browser: http://localhost:5173
2. Click "Register"
3. Fill in form:
   - Name: John Doe
   - Student ID: 12345
   - Email: john@university.edu
   - Password: YourPassword123!
   - Complete CAPTCHA
4. Click "Register"
5. Face verification modal should appear!
6. Upload a photo of an ID card with a face
7. Take a selfie (allow camera access)
8. Wait for verification...
9. Success! ✅

## Troubleshooting

### CompreFace not accessible at localhost:8000?
```powershell
docker-compose ps
docker-compose logs compreface-ui
```

### Backend errors about COMPREFACE_API_KEY?
- Check .env file has correct API key
- No spaces before/after the key
- Restart backend server

### Camera not working?
- Allow camera permissions in browser
- Or use "QR Code" option for mobile

### Face verification fails?
- Use clear, well-lit photos
- Face should be clearly visible
- No sunglasses or masks
- Try different photos

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│ (React + Vite)  │
│  localhost:5173 │
└────────┬────────┘
         │
         │ POST /users/verify-face
         │ (id_photo + selfie)
         ▼
┌─────────────────┐
│   Backend       │
│  (FastAPI)      │
│  localhost:8001 │
└────────┬────────┘
         │
         │ Face Verification API
         │ (POST /api/v1/verification/verify)
         ▼
┌─────────────────┐
│  CompreFace     │
│   (Docker)      │
│  localhost:8000 │
└─────────────────┘
```

## What Happens During Registration?

1. **User fills form** → Including student ID (new!)
2. **Clicks Register** → Account created (unverified)
3. **Face modal opens** → Upload ID + Take selfie
4. **AI compares faces** → CompreFace checks similarity
5. **70%+ match** → Face verified ✅
6. **Email code sent** → Check inbox
7. **Enter code** → Email verified ✅
8. **Complete!** → Can now login

## Common Issues

**Issue**: "CompreFace API error: Unauthorized"
**Fix**: API key is wrong, get it from CompreFace UI

**Issue**: "No face detected in image"
**Fix**: Use better quality photo with clear face

**Issue**: "Port 8000 already in use"
**Fix**: Stop other services or change CompreFace port

**Issue**: Camera permission denied
**Fix**: Allow camera in browser settings or use QR code

## Success Criteria

You should see:
- ✅ CompreFace UI accessible at localhost:8000
- ✅ Backend running on localhost:8001
- ✅ Frontend running on localhost:5173
- ✅ Registration form has "Student ID" field
- ✅ Face verification modal appears after register
- ✅ Can upload ID photo
- ✅ Can take selfie
- ✅ Gets "Face verification successful" message
- ✅ Proceeds to email verification

## Need More Help?

See detailed guides:
- **FACE_RECOGNITION_SETUP.md** - Complete setup guide
- **IMPLEMENTATION_SUMMARY.md** - Technical details
- **README.md** - Full documentation

## Quick Commands Reference

```powershell
# Start CompreFace
cd CompreFace-master; docker-compose up -d

# Stop CompreFace
cd CompreFace-master; docker-compose down

# Start Backend
cd Mosaic; uvicorn app.main:app --reload --port 8001

# Start Frontend
cd Mosaic/my-app; npm run dev

# Check CompreFace status
cd CompreFace-master; docker-compose ps

# View CompreFace logs
cd CompreFace-master; docker-compose logs -f
```

🎉 **You're all set! Happy testing!**
