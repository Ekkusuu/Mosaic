import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './EmailVerificationPopup.css';
import Logo from './Logo';
import HexagonBackground from './HexagonBackground';

const API_BASE_URL = 'http://localhost:8001';

const EmailVerificationPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = (location.state as { email?: string })?.email;

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!email) {
            navigate('/auth');
        }
    }, [email, navigate]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email) return;

        setLoading(true);
        setError('');

        try {
            const verifyResponse = await fetch(`${API_BASE_URL}/users/verify-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    code: code
                }),
            });

            if (!verifyResponse.ok) {
                const errorData = await verifyResponse.json();
                throw new Error(errorData.detail || 'Verification failed');
            }

            // Success - redirect to main page
            navigate('/', { replace: true });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!email) return;

        try {
            const response = await fetch(`${API_BASE_URL}/users/resend-verification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to resend code');
            }

            setError('');
            alert('Verification code resent! Check your email.');
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (!email) {
        return null;
    }

    return (
        <div className="email-verification-page">
            <HexagonBackground />
            <div className="email-verification-container">
                <Logo />
                
                <div className="verification-header">
                    <h1>Verify Your Email</h1>
                    <p className="subtitle">
                        We've sent a 6-digit code to <strong>{email}</strong>
                    </p>
                </div>

                <form onSubmit={handleVerify} className="verification-form">
                    <div className="form-group">
                        <label htmlFor="code">Verification Code</label>
                        <input
                            type="text"
                            id="code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            pattern="[0-9]{6}"
                            required
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="verify-btn"
                        disabled={loading || code.length !== 6}
                    >
                        {loading ? 'Verifying...' : 'Verify Email'}
                    </button>
                </form>

                <div className="resend-section">
                    <p>Didn't receive the code?</p>
                    <button onClick={handleResendCode} className="resend-btn">
                        Resend Code
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationPage;
