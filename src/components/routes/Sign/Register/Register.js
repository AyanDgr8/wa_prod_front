// /src/components/routes/Sign/Register/Register.js

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import RegisterAadhar from "./RegisterAadhar";
import RegisterPassport from "./RegisterPassport";
import "./Register.css"

const Register = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // Step 1: Email verification, Step 2: Registration form
    const [verificationEmail, setVerificationEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);
    const [alertType, setAlertType] = useState('text');
    const [isRegistrationVerified, setIsRegistrationVerified] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        telephone: "",
        email: "",
        password: "",
        confirm_password: "",
        address: "",
        card_select: "Aadhar",
        card_detail: "",
        company_name: "",
        company_gst: "",
        transactionId: "",
        fwdp: "",
        codeVerifier: "",
        totalAttempts: 0,
        phone: "",
        countryCode: "",
        passportFile: null
    });

    // Check if user is already registered
    useEffect(() => {
        const checkRegistrationStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    // Verify if token is valid
                    const response = await axios.get(`${process.env.REACT_APP_API_URL}/current-user`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (response.status === 200) {
                        navigate('/login');
                    } else {
                        // If token is invalid, remove it
                        localStorage.removeItem('token');
                        localStorage.removeItem('isRegistered');
                    }
                }
            } catch (error) {
                // If token verification fails, remove it
                localStorage.removeItem('token');
                localStorage.removeItem('isRegistered');
            }
        };

        checkRegistrationStatus();
    }, [navigate]);

    const handleEmailVerification = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            // Check if email exists in registration system
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/check-email-registration/${verificationEmail}`);
            
            // If user is already registered, show message and redirect to login
            if (response.data.isRegistered) {
                setAlertMessage('User already registered. Thanks for successful renewal.');
                setTimeout(() => {
                    navigate('/login', { replace: true });
                }, 2000);
                return;
            }
            
            // If not registered but email exists in website_registration
            if (response.data.success) {
                const { data } = response.data;
                
                console.log("API Response data:", data);
                
                // Pre-fill the form with data from website_registration
                setFormData({
                    ...formData,
                    username: `${data.firstName} ${data.lastName}`,
                    telephone: data.phone,
                    email: data.email,
                    address: data.address || "",
                    company_name: data.company_name || "",
                    company_gst: data.company_gst || "",
                    countryCode: data.countryCode || "IN",
                    card_select: data.countryCode === 'IN' ? 'Aadhar' : 'Passport'
                });
                
                console.log("Updated formData:", {
                    countryCode: data.countryCode,
                    card_select: data.countryCode === 'IN' ? 'Aadhar' : 'Passport'
                });
                
                setIsRegistrationVerified(true);
                setStep(2); // Move to registration form
            }
        } catch (error) {
            if (error.response?.status === 404) {
                setAlertMessage('Email not found in registrations. Please complete the payment process first.');
            } else {
                setAlertMessage(error.response?.data?.message || 'Verification failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (alertMessage) {
            alert(alertMessage);
            setAlertMessage(null);
        }
    }, [alertMessage]);

    if (isLoading) {
        return (
            <div className="register-container">
                <div className="loading">Loading...</div>
            </div>
        );
    }

    if (step === 1) {
        return (
            <div>
                <h2 className="register-headi">Verify Registration</h2>
                <div className="register-container">
                    <div className="register-left">
                        <form onSubmit={handleEmailVerification}>
                            <div className="form-grouppp">
                                <label>Enter the email you used for registration</label>
                                <input 
                                    type="email" 
                                    value={verificationEmail}
                                    onChange={(e) => setVerificationEmail(e.target.value)}
                                    placeholder="email@example.com"
                                    required
                                />
                            </div>
                            <button type="submit" disabled={isLoading}>
                                {isLoading ? 'Verifying...' : 'Verify Email'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    if (!isRegistrationVerified) {
        return (
            <div className="register-container">
                {alertMessage && (
                    <div className={`alert ${alertType}`}>
                        {alertMessage}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="register-container">
            {formData.countryCode === 'IN' ? (
                <RegisterAadhar formData={formData} />
            ) : (
                <RegisterPassport formData={formData} />
            )}
        </div>
    );
};

export default Register;