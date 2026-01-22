import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import './MobileSelfie.css';

// Dynamically determine API URL based on current host
const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    // Use the same hostname as the frontend, just change the port to 8001
    return `http://${hostname}:8001`;
};

const MobileSelfie: React.FC = () => {
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email');
    
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturing, setCapturing] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = async () => {
        try {
            setError('');
            
            // Check if mediaDevices API is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('Camera API not available on this browser. Please use a modern browser like Chrome or Safari.');
                return;
            }
            
            // Request camera permission with specific constraints
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
        } catch (err: any) {
            console.error('Error accessing camera:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('Camera access denied. Please allow camera permissions in your browser settings and try again.');
            } else if (err.name === 'NotFoundError') {
                setError('No camera found on this device.');
            } else {
                setError('Unable to access camera: ' + (err.message || 'Unknown error'));
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = e.target.files?.[0];
            console.log('handleFileUpload triggered');
            console.log('File selected:', file);
            console.log('Email from URL:', email);
            
            if (!file) {
                console.error('No file selected');
                setError('Please select a photo');
                return;
            }
            
            if (!email) {
                console.error('No email in URL');
                setError('Email is missing. Please scan the QR code again.');
                return;
            }
            
            console.log('Starting upload for file:', file.name, 'size:', file.size);
            await uploadSelfie(file);
        } catch (err) {
            console.error('Error in handleFileUpload:', err);
            setError('Failed to process file');
        }
    };

    const uploadSelfie = async (selfieFile: File) => {
        if (!email) {
            setError('Missing email');
            return;
        }

        setCapturing(true);
        setError('');

        try {
            console.log('Starting upload for email:', email);
            console.log('Selfie size:', selfieFile.size);

            // Send only the selfie - ID photo is already on the server
            const formData = new FormData();
            formData.append('email', email);
            formData.append('selfie', selfieFile);

            const apiUrl = getApiBaseUrl();
            console.log('API URL:', apiUrl);
            console.log('Sending request to:', `${apiUrl}/users/verify-face`);
            
            console.log('About to send fetch request...');
            const response = await fetch(`${apiUrl}/users/verify-face`, {
                method: 'POST',
                body: formData,
            });
            
            console.log('Response received, status:', response.status);
            console.log('Response ok:', response.ok);

            const data = await response.json();
            console.log('Response data:', data);

            if (!response.ok) {
                throw new Error(data.detail || 'Face verification failed');
            }

            // Success!
            setSuccess(true);
            
            // Stop camera if running
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }

            // Notify user to return to PC
            setTimeout(() => {
                alert('Verification successful! Please return to your computer to continue.');
            }, 1000);

        } catch (err: any) {
            setError(err.message || 'Failed to verify face. Please try again.');
        } finally {
            setCapturing(false);
        }
    };

    const captureAndUpload = async () => {
        if (!videoRef.current || !canvasRef.current || !email) {
            setError('Missing required data');
            return;
        }

        setCapturing(true);
        setError('');

        try {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                throw new Error('Could not get canvas context');
            }

            ctx.drawImage(video, 0, 0);
            
            // Convert to blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Failed to create blob'));
                }, 'image/jpeg', 0.9);
            });

            const file = new File([blob], 'mobile-selfie.jpg', { type: 'image/jpeg' });
            
            // Upload the captured selfie
            await uploadSelfie(file);

        } catch (err: any) {
            setError(err.message || 'Failed to capture photo.');
            setCapturing(false);
        }
    };

    React.useEffect(() => {
        if (!email) {
            setError('No email provided in QR code');
        }
    }, [email]);

    React.useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    if (!email) {
        return (
            <div className="mobile-selfie-page">
                <div className="mobile-selfie-container">
                    <h2>Invalid QR Code</h2>
                    <p>Please scan the QR code from the verification page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mobile-selfie-page">
            <div className="mobile-selfie-container">
                <h2>Take Your Selfie</h2>
                <p className="email-display">Verifying: {email}</p>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {success ? (
                    <div className="success-container">
                        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="success-icon">
                            <circle cx="40" cy="40" r="36" stroke="#10b981" strokeWidth="4"/>
                            <path d="M25 40L35 50L55 30" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <h3>Success!</h3>
                        <p>Please return to your computer to continue.</p>
                    </div>
                ) : (
                    <>
                        <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            id="selfie-upload"
                        />
                        <label htmlFor="selfie-upload" className="upload-selfie-btn">
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                <path d="M24 16V32M16 24H32" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                            </svg>
                            <span>Upload Selfie Photo</span>
                        </label>
                        
                        {stream && (
                            <>
                                <div className="camera-container">
                                    <video 
                                        ref={videoRef} 
                                        autoPlay 
                                        playsInline 
                                        className="camera-video"
                                    />
                                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                                </div>

                                <button 
                                    className="capture-btn" 
                                    onClick={captureAndUpload}
                                    disabled={capturing}
                                >
                                    {capturing ? (
                                        <>
                                            <div className="mini-spinner"></div>
                                            <span>Verifying...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <circle cx="12" cy="12" r="10"/>
                                            </svg>
                                            <span>Capture & Verify</span>
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MobileSelfie;
