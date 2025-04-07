// src/components/routes/Sign/Login/Login.js

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import CryptoJS from "crypto-js";
import api from '../../../../utils/api';
import { getDeviceId } from '../../../../utils/device';
import "./Login.css";

const Login = () => {
    const [alertMessage, setAlertMessage] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutTimer, setLockoutTimer] = useState(0);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    // Check if user is locked out on component mount or email change
    const checkLockoutStatus = async (email) => {
        if (!email) return;
        
        const lockedUntil = localStorage.getItem(`lockout_${email}`);
        if (lockedUntil) {
            const remainingTime = Math.ceil((parseInt(lockedUntil) - Date.now()) / 1000);
            if (remainingTime > 0) {
                setIsLocked(true);
                setLockoutTimer(remainingTime);
                startLockoutTimer(remainingTime, email);
            } else {
                localStorage.removeItem(`lockout_${email}`);
            }
        }
    };

    // useEffect(() => {
    // // Check for token in URL params
    // const params = new URLSearchParams(window.location.search);
    // const token = params.get('token');

    // if (token) {
    // try {
    // // Decode token to get email
    // const decodedToken = JSON.parse(atob(token.split('.')[1]));
    // if (decodedToken.email) {
    // setFormData(prev => ({ ...prev, email: decodedToken.email }));
    // // Check password status for the email
    // api.post('/check-user-password', { email: decodedToken.email })
    // .then(response => {
    // setShowForgotPassword(response.data.verified === 'yes' && response.data.hasPassword);
    // })
    // .catch(error => {
    // console.error('Error checking user status:', error);
    // setShowForgotPassword(false);
    // });
    // }
    // } catch (error) {
    // console.error('Error decoding token:', error);
    // }
    // }
    // }, []);

    const startLockoutTimer = (duration, email) => {
        setLockoutTimer(duration);
        
        const timer = setInterval(() => {
            setLockoutTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setIsLocked(false);
                    localStorage.removeItem(`lockout_${email}`);
                    // Reload the page when timer expires if it's the same email
                    if (formData.email === email) {
                        window.location.reload();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return timer;
    };

    const handleEmailChange = async (e) => {
        const email = e.target.value;
        setFormData(prev => ({ ...prev, email }));

        if (email) {
            try {
                await checkLockoutStatus(email);
                const response = await api.post('/check-user-password', { email });
                setShowForgotPassword(response.data.verified === 'yes' && response.data.hasPassword);
            } catch (error) {
                console.error('Error checking user status:', error);
                setShowForgotPassword(false);
            }
        } else {
            setShowForgotPassword(false);
        }
    };

    const handlePasswordChange = (e) => {
    setFormData({ ...formData, password: e.target.value });
    };

    const validateForm = () => {
        const { email, password } = formData;
        if (!email || !password) {
            setAlertMessage('Please fill in all the required fields');
            return false;
            }
            if (password.length < 8) {
                setAlertMessage('Please enter a password with a minimum length of 8 characters');
                return false;
                }
            return true;
        };

        // Function to generate a random 16-character string
        const generateRandomString = () => {
        return CryptoJS.lib.WordArray.random(8).toString(CryptoJS.enc.Base64).slice(0, 16); // 16 characters
        };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;
        if (isLocked) {
            setAlertMessage(`Too many failed attempts. Try again in ${lockoutTimer} seconds`);
            return;
        }

        setLoading(true);

        try {
            // Get device ID
            const deviceId = getDeviceId();

            // Login user using our api service with device ID in headers
            const loginResponse = await api.post('/login', formData, {
                headers: {
                    'x-device-id': deviceId
                }
            });

            // Check if user is verified
            if (loginResponse.data.verified === 'no') {
                setAlertMessage('Your account verification is pending. Please contact our support team to complete the process. You can reach us via email at support@voicemeetme.com or by phone at +91 93110 45247.');
                setLoading(false);
                return;
            }

            const { token, username, email } = loginResponse.data;

            // Store token and email
            localStorage.setItem("token", token);
            localStorage.setItem("email", email);

            // Check if user has an instance using api service
            const instanceResponse = await api.get('/user-instance');

            if (instanceResponse.data.hasInstance) {
                const { instanceId } = instanceResponse.data;

                // Store instance ID
                localStorage.setItem("current_instance_id", instanceId);

                // Redirect to QR code page if instance exists
                navigate(`/${instanceId}/qrcode`);
            } else {
                // Generate random username if we need to create a new instance
                const randomUsername = generateRandomString();
                localStorage.setItem("username", randomUsername);

                // Redirect to create instance page
                navigate('/create-instance');
            }

        } catch (error) {
            console.error('Login error:', error);

            // Handle lockout
            if (error.response?.status === 429) {
                const { remainingTime } = error.response.data;
                setIsLocked(true);
                
                // Store lockout expiry time
                const lockoutExpiry = Date.now() + (remainingTime * 1000);
                localStorage.setItem(`lockout_${formData.email}`, lockoutExpiry.toString());
                
                // Start countdown timer
                startLockoutTimer(remainingTime, formData.email);
                setAlertMessage(`Too many failed attempts. Try again in ${remainingTime} seconds`);
            } else {
                setAlertMessage(
                    error.response?.data?.message || 
                    'An error occurred during login. Please try again.'
                );
            }
            setLoading(false);
        }
    };

    // Initialize lockout check on component mount
    useEffect(() => {
        const email = formData.email;
        if (email) {
            checkLockoutStatus(email);
        }
    }, []);

    useEffect(() => {
        if (alertMessage) {
            alert(alertMessage);
            setAlertMessage(null);
        }
    }, [alertMessage]);

    return (
        <div className="login-page">
            <h2 className="login-headi">Login</h2>
            <div className="login-container">
                <div className="login-left">
                    {isLocked && (
                        <div className="lockout-timer">
                            Account locked. Try again in {lockoutTimer} seconds
                        </div>
                    )}
                    <form onSubmit={handleSubmit}>
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleEmailChange}
                            onBlur={handleEmailChange}
                            placeholder="Email"
                            required
                            disabled={isLocked}
                            className={isLocked ? 'input-locked' : ''}
                        />
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handlePasswordChange}
                            placeholder="Password"
                            required
                            disabled={isLocked}
                            className={isLocked ? 'input-locked' : ''}
                        />
                        {showForgotPassword && (
                            <div className="forgot-password-link">
                                <Link to="/forgot-password">Forgot Password?</Link>
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading || isLocked}
                            className="login-button"
                        >
                            {loading ? "Login.." : "Login"}
                        </button>
                    </form>
                </div>

                <div className="login-right">
                    <img
                        src="/uploads/sign.webp"
                        className="sign-icon"
                        alt="sign icon"
                        aria-label="sign"
                    />
                </div>
            </div>
        </div>
    );
};

export default Login;