import React, { useState, useRef, useEffect } from 'react';
import './FaceVerification.css';
import QRCode from 'qrcode';

const API_BASE_URL = 'http://localhost:8001';

interface FaceVerificationProps {
    isOpen: boolean;
    onClose: () => void;
    onVerificationComplete: () => void;
    email: string;
    studentId: string;
}

const FaceVerification: React.FC<FaceVerificationProps> = ({
    isOpen,
    onClose,
    onVerificationComplete,
    email,
    studentId
}) => {
    const [step, setStep] = useState<'upload-id' | 'camera-choice' | 'camera' | 'qr-code' | 'verifying'>('upload-id');
    const [idPhoto, setIdPhoto] = useState<File | null>(null);
    const [idPhotoPreview, setIdPhotoPreview] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [hasCamera, setHasCamera] = useState<boolean>(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [stream, setStream] = useState<MediaStream | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const idPhotoInputRef = useRef<HTMLInputElement>(null);

    // Check for camera availability
    useEffect(() => {
        const checkCamera = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                setHasCamera(videoDevices.length > 0);
            } catch (err) {
                console.error('Error checking camera:', err);
                setHasCamera(false);
            }
        };
        
        if (isOpen) {
            checkCamera();
        }
    }, [isOpen]);

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
            // In production, this would be a unique session URL
            const mobileUrl = `${window.location.origin}/mobile-selfie?email=${encodeURIComponent(email)}`;
            const qrDataUrl = await QRCode.toDataURL(mobileUrl, {
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

    const handleIdPhotoNext = () => {
        if (!idPhoto) {
            setError('Please upload your student ID photo');
            return;
        }
        setStep('camera-choice');
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStep('camera');
            setError('');
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Unable to access camera. Please check permissions.');
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

    const handleQRCodeOption = () => {
        generateQRCode();
        setStep('qr-code');
    };

    const handleVerification = async (selfie: File) => {
        if (!idPhoto || !selfie) {
            setError('Both ID photo and selfie are required');
            return;
        }

        setError('');
        setStep('verifying');

        try {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('student_id', studentId);
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
            onVerificationComplete();
        } catch (err: any) {
            setError(err.message || 'Face verification failed. Please try again.');
            setStep('camera-choice'); // Allow retry
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

    if (!isOpen) return null;

    return (
        <div className="face-verification-overlay">
            <div className="face-verification-modal">
                <button className="close-btn" onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>

                <div className="face-verification-content">
                    <h2>Face Verification</h2>
                    <p className="subtitle">Verify your identity to complete registration</p>

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
                                {hasCamera && (
                                    <button className="choice-btn" onClick={startCamera}>
                                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                            <rect x="8" y="12" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
                                            <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                        <span>Use Camera</span>
                                    </button>
                                )}
                                
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

                            {qrCodeUrl && (
                                <div className="qr-code-container">
                                    <img src={qrCodeUrl} alt="QR Code" className="qr-code" />
                                </div>
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
                </div>
            </div>
        </div>
    );
};

export default FaceVerification;
