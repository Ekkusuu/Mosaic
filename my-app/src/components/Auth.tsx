import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';
import Logo from './Logo';
import HexagonBackground from './HexagonBackground';
import EmailVerificationPopup from './EmailVerificationPopup';

const API_BASE_URL = 'http://localhost:8000';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showVerification, setShowVerification] = useState(false);
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [verificationError, setVerificationError] = useState('');
    const [pendingRegistrationData, setPendingRegistrationData] = useState<{
        email: string;
        password: string;
        name: string;
    } | null>(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                // Login logic
                const response = await fetch(`${API_BASE_URL}/users/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include', // Important for cookies
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Login failed');
                }

                const userData = await response.json();
                console.log('Login successful:', userData);
                navigate('/', { replace: true });
            } else {
                // Register logic - validate first, then show verification popup
                if (formData.password !== formData.confirmPassword) {
                    throw new Error('Passwords do not match');
                }

                // First, validate the registration data with the backend
                const validationResponse = await fetch(`${API_BASE_URL}/users/validate-registration`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                        name: formData.name
                    }),
                });

                if (!validationResponse.ok) {
                    const errorData = await validationResponse.json();
                    throw new Error(errorData.detail || 'Validation failed');
                }

                // If validation passes, store the data and show verification popup
                setPendingRegistrationData({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name
                });
                setShowVerification(true);
            }
        } catch (err: any) {
            setError(err.message);
            console.error('Authentication error:', err);
        } finally {
            setLoading(false);
        }
    };


    const switchMode = () => {
        setIsLogin(!isLogin);
        setError(''); // Clear error when switching modes
        setShowVerification(false); // Close verification popup when switching modes
        setVerificationError(''); // Clear verification errors
        setPendingRegistrationData(null); // Clear pending data
        setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            name: ''
        });
    };

    const handleVerifyCode = async (code: string) => {
        if (!pendingRegistrationData) {
            setVerificationError('No registration data found');
            return;
        }

        setVerificationLoading(true);
        setVerificationError('');

        try {
            // First verify the code
            const verifyResponse = await fetch(`${API_BASE_URL}/users/verify-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: pendingRegistrationData.email,
                    code: code
                }),
            });

            if (!verifyResponse.ok) {
                const errorData = await verifyResponse.json();
                throw new Error(errorData.detail || 'Verification failed');
            }

            // If verification successful, complete the registration
            const registerResponse = await fetch(`${API_BASE_URL}/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(pendingRegistrationData),
            });

            if (!registerResponse.ok) {
                const errorData = await registerResponse.json();
                throw new Error(errorData.detail || 'Registration failed');
            }

            const userData = await registerResponse.json();
            console.log('Registration successful:', userData);
            
            // Clear states and navigate
            setShowVerification(false);
            setPendingRegistrationData(null);
            navigate('/', { replace: true });
        } catch (err: any) {
            setVerificationError(err.message);
            console.error('Verification error:', err);
        } finally {
            setVerificationLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!pendingRegistrationData) {
            setVerificationError('No registration data found');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/resend-verification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: pendingRegistrationData.email
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to resend code');
            }

            setVerificationError(''); // Clear any previous errors
            console.log('Verification code resent');
        } catch (err: any) {
            setVerificationError(err.message);
            console.error('Resend error:', err);
        }
    };

    const handleCloseVerification = () => {
        setShowVerification(false);
        setVerificationError('');
        // Keep pendingRegistrationData in case user wants to try again
    };

    const navigate = useNavigate();

    return (
        <div className="auth-container">
            <HexagonBackground />
            <div className="auth-modal">
                <Logo />

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required={!isLogin}
                                    placeholder=" "
                                />
                                <button type="button" className="clear-btn" onClick={() => setFormData(prev => ({...prev, name: ''}))}>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{color: 'var(--color-muted)'}}>
                                        <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <div className="input-wrapper">
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                placeholder=" "
                            />
                            <button type="button" className="clear-btn" onClick={() => setFormData(prev => ({...prev, email: ''}))}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{color: 'var(--color-muted)'}}>
                                    <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                                placeholder=" "
                            />
                            <button type="button" className="clear-btn" onClick={() => setFormData(prev => ({...prev, password: ''}))}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                                     style={{color: 'var(--color-muted)'}}>
                                    <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2"
                                          strokeLinecap="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    required={!isLogin}
                                    placeholder=" "
                                />
                                <button type="button" className="clear-btn" onClick={() => setFormData(prev => ({...prev, confirmPassword: ''}))}>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{color: 'var(--color-muted)'}}>
                                        <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    <button type="submit" className="submit-btn" disabled={loading}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{marginRight: '8px'}}>
                            <path d="M1 5H9M5 1L9 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
                    </button>
                </form>

                {error && (
                    <div className="error-message" style={{color: 'red', marginTop: '10px', textAlign: 'center'}}>
                        {error}
                    </div>
                )}

                <div className="auth-switch">
                    <span>{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
                    <button onClick={switchMode} className="switch-btn">
                        {isLogin ? 'Register' : 'Login'}
                    </button>
                </div>
            </div>

            <EmailVerificationPopup
                isOpen={showVerification}
                onClose={handleCloseVerification}
                onVerify={handleVerifyCode}
                email={pendingRegistrationData?.email || ''}
                loading={verificationLoading}
                error={verificationError}
                onResendCode={handleResendCode}
            />
        </div>
    );
};

export default Auth;