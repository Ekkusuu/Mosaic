import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './FaceVerificationPage.css';
import Logo from './Logo';
import HexagonBackground from './HexagonBackground';
import QRCode from 'qrcode';

const API_BASE_URL = 'http://localhost:8001';

const FaceVerificationPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const registrationData = location.state as { email: string } | null;

    const [step, setStep] = useState<'upload-id' | 'camera-choice' | 'camera' | 'qr-code' | 'verifying' | 'success'>('upload-id');
    const [idPhoto, setIdPhoto] = useState<File | null>(null);
    const [idPhotoPreview, setIdPhotoPreview] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [hasCamera, setHasCamera] = useState<boolean>(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [mobileUrl, setMobileUrl] = useState<string>('');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [verificationResult, setVerificationResult] = useState<{ similarity: number } | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const idPhotoInputRef = useRef<HTMLInputElement>(null);

    // Redirect if no registration data
    useEffect(() => {
        if (!registrationData?.email) {
            navigate('/auth');
        }
    }, [registrationData, navigate]);

    // Check for camera availability
    useEffect(() => {
        const checkCamera = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                    setHasCamera(false);
                    return;
                }
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                setHasCamera(videoDevices.length > 0);
            } catch (err) {
                console.error('Error checking camera:', err);
                setHasCamera(false);
            }
        };
        
        checkCamera();
    }, []);

    // Cleanup camera stream on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Generate QR code for mobile selfie
    const generateQRCode = async () => {
        try {
            // Store ID photo in localStorage for mobile access (persists across devices/sessions)
            if (idPhotoPreview) {
                localStorage.setItem(`id_photo_${registrationData!.email}`, idPhotoPreview);
                sessionStorage.setItem(`id_photo_${registrationData!.email}`, idPhotoPreview);
                console.log('ID photo saved to storage for email:', registrationData!.email);
            }
            
            // Use network hostname instead of localhost
            const hostname = window.location.hostname === 'localhost' ? window.location.hostname : window.location.hostname;
            const port = window.location.port;
            const protocol = window.location.protocol;
            const baseUrl = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
            
            const generatedUrl = `${baseUrl}/mobile-selfie?email=${encodeURIComponent(registrationData!.email)}`;
            setMobileUrl(generatedUrl);
            
            const qrDataUrl = await QRCode.toDataURL(generatedUrl, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            setQrCodeUrl(qrDataUrl);
        } catch (err) {
            console.error('Error generating QR code:', err);
            setError('Failed to generate QR code');
        }
    };

    const handleIdPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB');
                return;
            }
            
            setIdPhoto(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setIdPhotoPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
            setError('');
        }
    };

    const handleIdPhotoNext = async () => {
        if (!idPhoto) {
            setError('Please upload your student ID photo');
            return;
        }
        
        if (!registrationData?.email) {
            setError('Email not found. Please restart registration.');
            return;
        }
        
        // Upload ID photo to backend for storage
        try {
            setError('Uploading ID photo...');
            console.log('Uploading ID photo for:', registrationData.email);
            console.log('ID photo file:', idPhoto.name, idPhoto.size, 'bytes');
            
            const formData = new FormData();
            formData.append('email', registrationData.email);
            formData.append('id_photo', idPhoto);
            
            console.log('Sending request to:', `${API_BASE_URL}/users/upload-id-photo`);
            
            const response = await fetch(`${API_BASE_URL}/users/upload-id-photo`, {
                method: 'POST',
                body: formData,
            });
            
            console.log('Upload response status:', response.status);
            
            if (!response.ok) {
                let errorMessage = 'Failed to upload ID photo';
                try {
                    const data = await response.json();
                    errorMessage = data.detail || errorMessage;
                } catch {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            console.log('Upload successful:', result);
            
            setError('');
            setStep('camera-choice');
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload ID photo. Please try again.');
            return; // Don't proceed if upload failed
        }
    };

    const startCamera = async () => {
        try {
            setError('');
            
            // Check if mediaDevices API is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('Camera API not available. Please use HTTPS or try the QR code option with your phone.');
                return;
            }
            
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStep('camera');
        } catch (err: any) {
            console.error('Error accessing camera:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('Camera access denied. Please allow camera permissions and try again.');
            } else if (err.name === 'NotFoundError') {
                setError('No camera found. Please use the QR code option to take a selfie with your phone.');
            } else {
                setError('Unable to access camera: ' + (err.message || 'Please try the QR code option.'));
            }
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
                        
                        // Stop camera
                        if (stream) {
                            stream.getTracks().forEach(track => track.stop());
                            setStream(null);
                        }
                        
                        // Proceed to verification
                        handleVerification(file);
                    }
                }, 'image/jpeg', 0.9);
            }
        }
    };

    const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please upload an image file');
                return;
            }
            // Validate file size (10MB max)
            if (file.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB');
                return;
            }
            
            console.log('Selfie uploaded:', file.name, file.size, 'bytes');
            
            // Directly verify with the uploaded selfie
            handleVerification(file);
        }
    };

    const handleQRCodeOption = () => {
        generateQRCode();
        setStep('qr-code');
    };

    const handleVerification = async (selfie: File) => {
        if (!idPhoto || !selfie || !registrationData) {
            setError('Missing required data for verification');
            return;
        }

        setError('');
        setStep('verifying');

        try {
            const formData = new FormData();
            formData.append('email', registrationData.email);
            formData.append('id_photo', idPhoto);
            formData.append('selfie', selfie);

            const response = await fetch(`${API_BASE_URL}/users/verify-face`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Face verification failed');
            }

            // Success!
            setVerificationResult({ similarity: data.similarity });
            setStep('success');
            
            // Redirect to email verification after 3 seconds
            setTimeout(() => {
                navigate('/verify-email', { 
                    state: { email: registrationData.email } 
                });
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Face verification failed. Please try again.');
            setStep('camera-choice');
        }
    };

    const handleRetake = () => {
        setStep('camera-choice');
    };

    const handleReset = () => {
        setIdPhoto(null);
        setIdPhotoPreview(null);
        setError('');
        setStep('upload-id');
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    if (!registrationData) {
        return null;
    }

    return (
        <div className="face-verification-page">
            <HexagonBackground />
            <div className="face-verification-container">
                <Logo />

                <div className="verification-header">
                    <h1>Face Verification</h1>
                    <p className="subtitle">
                        Hi {registrationData.email.split('@')[0]}! Let's verify your identity.
                    </p>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {/* Step 1: Upload ID Photo */}
                {step === 'upload-id' && (
                    <div className="step-content">
                        <h3>Step 1: Upload Student ID Photo</h3>
                        <p>Please upload a clear photo of your student ID showing your face.</p>
                        
                        <div className="upload-area">
                            <input
                                ref={idPhotoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleIdPhotoSelect}
                                style={{ display: 'none' }}
                            />
                            
                            {idPhotoPreview ? (
                                <div className="preview-container">
                                    <img src={idPhotoPreview} alt="ID Preview" className="photo-preview" />
                                    <button 
                                        className="change-photo-btn"
                                        onClick={() => idPhotoInputRef.current?.click()}
                                    >
                                        Change Photo
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    className="upload-btn"
                                    onClick={() => idPhotoInputRef.current?.click()}
                                >
                                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                        <path d="M24 16V32M16 24H32" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                    </svg>
                                    <span>Upload Student ID</span>
                                </button>
                            )}
                        </div>

                        <button 
                            className="next-btn"
                            onClick={handleIdPhotoNext}
                            disabled={!idPhoto}
                        >
                            Next: Take Selfie →
                        </button>
                    </div>
                )}

                {/* Step 2: Choose Camera or QR Code */}
                {step === 'camera-choice' && (
                    <div className="step-content">
                        <h3>Step 2: Take a Selfie</h3>
                        <p>Choose how you want to take your selfie:</p>

                        <div className="choice-buttons">
                            <button className="choice-btn" onClick={startCamera}>
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                    <rect x="8" y="12" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
                                    <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                                <span>Use Camera</span>
                                {!hasCamera && <span className="no-camera-hint">(Will request access)</span>}
                            </button>
                            
                            <label className="choice-btn" htmlFor="selfie-upload">
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                    <rect x="8" y="12" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M24 18 L24 30 M18 24 L30 24" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                                <span>Upload Photo</span>
                                <input
                                    type="file"
                                    id="selfie-upload"
                                    accept="image/*"
                                    capture="user"
                                    style={{ display: 'none' }}
                                    onChange={handleSelfieUpload}
                                />
                            </label>
                            
                            <button className="choice-btn" onClick={handleQRCodeOption}>
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                    <rect x="8" y="8" width="32" height="32" rx="2" stroke="currentColor" strokeWidth="2"/>
                                    <rect x="12" y="12" width="8" height="8" fill="currentColor"/>
                                    <rect x="28" y="12" width="8" height="8" fill="currentColor"/>
                                    <rect x="12" y="28" width="8" height="8" fill="currentColor"/>
                                </svg>
                                <span>Use Phone (QR Code)</span>
                            </button>
                        </div>

                        <button className="back-btn" onClick={handleReset}>
                            ← Back to ID Upload
                        </button>
                    </div>
                )}

                {/* Step 3a: Camera View */}
                {step === 'camera' && (
                    <div className="step-content">
                        <h3>Position Your Face</h3>
                        <p>Make sure your face is clearly visible and well-lit.</p>

                        <div className="camera-container">
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                className="camera-video"
                            />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                        </div>

                        <div className="camera-controls">
                            <button className="capture-btn" onClick={capturePhoto}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="12" r="10"/>
                                </svg>
                                Capture Photo
                            </button>
                            <button className="cancel-btn" onClick={handleRetake}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3b: QR Code */}
                {step === 'qr-code' && (
                    <div className="step-content">
                        <h3>Scan QR Code with Your Phone</h3>
                        <p>Open your phone's camera and scan this code to take a selfie.</p>

                        {window.location.hostname === 'localhost' && (
                            <div className="warning-message">
                                ⚠️ You're accessing from localhost. For mobile to work, access this page from your PC's IP address instead (e.g., http://192.168.x.x:5178)
                            </div>
                        )}

                        {qrCodeUrl && (
                            <>
                                <div className="qr-code-container">
                                    <img src={qrCodeUrl} alt="QR Code" className="qr-code" />
                                </div>
                                <p className="mobile-url-display">{mobileUrl}</p>
                            </>
                        )}

                        <p className="qr-instructions">
                            After taking the selfie on your phone, the verification will happen automatically.
                        </p>

                        <button className="back-btn" onClick={handleRetake}>
                            ← Back to Options
                        </button>
                    </div>
                )}

                {/* Step 4: Verifying */}
                {step === 'verifying' && (
                    <div className="step-content">
                        <div className="verifying-container">
                            <div className="spinner"></div>
                            <h3>Verifying Your Face...</h3>
                            <p>Please wait while we compare your photos.</p>
                        </div>
                    </div>
                )}

                {/* Step 5: Success */}
                {step === 'success' && (
                    <div className="step-content">
                        <div className="success-container">
                            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="success-icon">
                                <circle cx="40" cy="40" r="36" stroke="#10b981" strokeWidth="4"/>
                                <path d="M25 40L35 50L55 30" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <h3>Face Verification Successful!</h3>
                            <p>Match confidence: {verificationResult ? (verificationResult.similarity * 100).toFixed(1) : 0}%</p>
                            <p className="redirect-message">Redirecting to email verification...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaceVerificationPage;
