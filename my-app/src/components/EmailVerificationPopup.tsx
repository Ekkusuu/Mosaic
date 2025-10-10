import React, { useState, useRef, useEffect } from 'react';
import './EmailVerificationPopup.css';

interface EmailVerificationPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onVerify: (code: string) => void;
    email: string;
    loading?: boolean;
    error?: string;
    onResendCode?: () => void;
}

const EmailVerificationPopup: React.FC<EmailVerificationPopupProps> = ({
    isOpen,
    onClose,
    onVerify,
    email,
    loading = false,
    error = '',
    onResendCode
}) => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [timeLeft, setTimeLeft] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (isOpen && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [isOpen, timeLeft]);

    useEffect(() => {
        if (isOpen) {
            // Reset state when popup opens
            setCode(['', '', '', '', '', '']);
            setTimeLeft(60);
            setCanResend(false);
            // Focus first input
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        }
    }, [isOpen]);

    const handleInputChange = (index: number, value: string) => {
        if (value.length > 1) return; // Only allow single digit
        if (value && !/^\d$/.test(value)) return; // Only allow digits

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits are entered
        if (newCode.every(digit => digit !== '') && value) {
            handleVerify(newCode.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (!code[index] && index > 0) {
                // If current input is empty and backspace is pressed, go to previous input
                inputRefs.current[index - 1]?.focus();
            } else {
                // Clear current input
                const newCode = [...code];
                newCode[index] = '';
                setCode(newCode);
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim();
        
        if (/^\d{6}$/.test(pastedData)) {
            const newCode = pastedData.split('');
            setCode(newCode);
            inputRefs.current[5]?.focus();
            handleVerify(pastedData);
        }
    };

    const handleVerify = (verificationCode: string) => {
        if (verificationCode.length === 6) {
            onVerify(verificationCode);
        }
    };

    const handleResendCode = () => {
        if (canResend && onResendCode) {
            onResendCode();
            setTimeLeft(60);
            setCanResend(false);
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="verification-overlay">
            <div className="verification-popup">
                <button className="close-btn" onClick={onClose}>
                    <span className="close-icon">×</span>
                </button>

                <div className="verification-header">
                    <h2>Verify Your Email</h2>
                    <p>
                        We've sent a 6-digit verification code to<br />
                        <strong>{email}</strong>
                    </p>
                </div>

                <div className="verification-form">
                    <div className="code-inputs">
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => { inputRefs.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleInputChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className={`code-input ${error ? 'error' : ''}`}
                                disabled={loading}
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <button 
                        className="verify-btn"
                        onClick={() => handleVerify(code.join(''))}
                        disabled={loading || code.some(digit => digit === '')}
                    >
                        {loading ? 'Verifying...' : 'Verify Code'}
                    </button>

                    <div className="resend-section">
                        <p className="resend-text">
                            Didn't receive the code?
                        </p>
                        {canResend ? (
                            <button 
                                className="resend-btn"
                                onClick={handleResendCode}
                                disabled={loading}
                            >
                                Resend Code
                            </button>
                        ) : (
                            <span className="resend-timer">
                                Resend in {formatTime(timeLeft)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationPopup;