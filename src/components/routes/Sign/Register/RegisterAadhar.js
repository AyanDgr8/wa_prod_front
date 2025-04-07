// src/components/routes/Sign/Register/RegisterAadhar.js

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Register.css';

const RegisterAadhar = ({ formData: initialFormData }) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [step, setStep] = useState(1); // 1: Verification, 2: OTP/Upload
    const [otpTimer, setOtpTimer] = useState(60);
    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const [showOtpInput, setShowOtpInput] = useState(false);

    // Create refs for OTP inputs
    const otpRefs = [
        useRef(null),
        useRef(null),
        useRef(null),
        useRef(null),
        useRef(null),
        useRef(null)
    ];

    const [formData, setFormData] = useState(initialFormData || {
        username: "",
        telephone: "",
        email: "",
        password: "",
        confirm_password: "",
        address: "",
        card_select: "Aadhar", // Default to Aadhar
        card_detail: "",
        company_name: "",
        company_gst: "",
        transactionId: "",
        fwdp: "",
        codeVerifier: "",
        totalAttempts: 0, // Track total attempts (including resends)
        phone: "", // Add phone number to form data
    });

    const isPasswordValid = (password) => {
        const hasMinLength = password.length >= 8;
        const hasUpperCase = /([A-Z])/.test(password);
        const hasLowerCase = /([a-z])/.test(password);
        const hasNumber = /\d/.test(password);
        return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'card_detail') {
            // Only allow numbers and limit to 12 digits
            const numericValue = value.replace(/\D/g, '').slice(0, 12);
            setFormData(prev => ({
                ...prev,
                [name]: numericValue
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleOTPInput = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newOtpValues = [...otpValues];
        newOtpValues[index] = value;
        setOtpValues(newOtpValues);

        // Auto-focus next input
        if (value !== '' && index < 5) {
            otpRefs[index + 1].current.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && otpValues[index] === '' && index > 0) {
            otpRefs[index - 1].current.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtpValues = [...otpValues];
        
        for (let i = 0; i < pastedData.length; i++) {
            if (i < 6) newOtpValues[i] = pastedData[i];
        }
        
        setOtpValues(newOtpValues);
        
        if (pastedData.length > 0) {
            otpRefs[Math.min(pastedData.length, 5)].current.focus();
        }
    };

    const renderOTPInput = () => (
        <div className="form-group otp-container">
            <h2 className="otp-heading">OTP Verification</h2>
            <div className="otp-input-wrapper">
                <div className="otp-boxes">
                    {otpValues.map((value, index) => (
                        <input
                            key={index}
                            ref={otpRefs[index]}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={value}
                            onChange={(e) => handleOTPInput(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            disabled={isLoading}
                            required
                            autoComplete="off"
                            className="otp-box"
                            autoFocus={index === 0}
                        />
                    ))}
                </div>
                {otpTimer > 0 && (
                    <div className="otp-timer">
                        Time remaining: {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}
                    </div>
                )}
            </div>
            <div className="otp-actions">
                {otpTimer > 0 ? (
                    <button 
                        type="button" 
                        onClick={() => handleVerifyOTP(otpValues.join(''))}
                        disabled={otpValues.join('').length !== 6 || isLoading || formData.totalAttempts >= 3}
                        className="verify-btn"
                    >
                        {isLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={isLoading || formData.totalAttempts >= 3}
                        className="resend-btn"
                    >
                        {isLoading ? 'Sending...' : 'Resend OTP'}
                    </button>
                )}
            </div>
            {formData.totalAttempts > 0 && (
                <div className="otp-attempts">
                    Attempts remaining: {Math.max(0, 3 - formData.totalAttempts)}
                </div>
            )}
        </div>
    );

    const startOtpTimer = () => {
        setOtpTimer(60); // Reset timer to 60 seconds
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        let timer;
        if (otpTimer > 0) {
            timer = setInterval(() => {
                setOtpTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [otpTimer]);

    useEffect(() => {
        if (step === 3 && otpRefs[0]?.current) {
            otpRefs[0].current.focus();
        }
    }, [step]);

    const handleVerificationSubmit = async (e) => {
        e.preventDefault();
        if (!validateVerificationStep()) return;

        try {
            setIsLoading(true);


            if (formData.card_select === 'Passport') {
                // For passport, move directly to password step
                setStep(3);
                return;
            }

            // Check if Aadhar is already registered via KYC initiate
            const checkResponse = await axios.post(
                `${process.env.REACT_APP_API_URL}/kyc/initiate`,
                {
                    uniqueId: formData.telephone,
                    uid: formData.card_detail,
                    checkOnly: true // Flag to indicate we just want to check status
                }
            );

            if (!checkResponse.data.success) {
                if (checkResponse.data.exists) {
                    alert('This Aadhar number is already registered');
                    return;
                }
                throw new Error(checkResponse.data.message || 'Failed to check Aadhar status');
            }

            // First validate password
            if (!formData.password || formData.password !== formData.confirm_password) {
                alert('Please set and confirm your password');
                return;
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!passwordRegex.test(formData.password)) {
                alert('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number');
                return;
            }

            // Normalize phone number (remove spaces and add +91)
            const normalizedPhone = formData.telephone.replace(/\s+/g, '').replace(/^\+?91?/, '');
            const formattedPhone = `+91${normalizedPhone}`;

            // Split name into first and last name
            const nameParts = formData.username.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');

            // If Aadhar is not registered, proceed with KYC
            const kycResponse = await axios.post(
                `${process.env.REACT_APP_API_URL}/kyc/initiate`,
                {
                    uniqueId: formattedPhone,
                    uid: formData.card_detail,
                    f_name: firstName,
                    l_name: lastName || '',
                    email: formData.email,
                    phone: formattedPhone,
                    address: formData.address || '',
                    company_name: formData.company_name || '',
                    password: formData.password,
                    card_select: formData.card_select || 'Aadhar',
                    card_detail: formData.card_detail,
                    company_gst: formData.company_gst || ''
                }
            );

            console.log('KYC Response:', kycResponse.data);

            // Handle direct login cases
            if (kycResponse.data.success && kycResponse.data.proceedToLogin) {
                alert('Registration successful! Please login to continue.');
                setTimeout(() => navigate('/login'), 2000);
                return;
            }

            // Handle OTP generation success
            if (kycResponse.data.code === "200" || kycResponse.data.otpGenerated) {
                const aadharName = kycResponse.data.model?.name || `${firstName} ${lastName}`.trim();
                console.log('Setting Aadhar name:', aadharName);
                
                setFormData({
                    ...formData,
                    transactionId: kycResponse.data.model?.transactionId,
                    fwdp: kycResponse.data.model?.fwdp,
                    codeVerifier: kycResponse.data.model?.codeVerifier,
                    aadharName: aadharName
                });
                setStep(2); // Move to OTP input page
                setOtpTimer(60);
                setShowOtpInput(true);
                alert('Please enter the OTP sent to your Aadhar-linked mobile number');
                return;
            }

            // If we reach here, something went wrong
            throw new Error(kycResponse.data.message || 'KYC initiation failed');

            // Log the updated form data
            console.log('Updated form data after KYC:', {
                username: formData.username,
                transactionId: formData.transactionId,
                phone: formData.telephone
            });
        } catch (error) {
            console.log('Verification response:', error);
            
            // Handle specific error cases
            const errorMessage = error.response?.data?.message || error.message || 'Verification failed';
            
            // Check if it's a success message disguised as an error
            if (errorMessage.includes('Registration successful')) {
                alert(errorMessage);
                setTimeout(() => navigate('/login'), 500);
            } else {
                alert(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (otp) => {
        if (!otp || otp.length !== 6) {
            alert('Please enter a valid 6-digit OTP');
            return;
        }

        try {
            setIsLoading(true);


            // Normalize phone number first
            const normalizedPhone = formData.telephone.replace(/\s+/g, '').replace(/^\+?91?/, '');
            const formattedPhone = `+91${normalizedPhone}`;

            // Validate password
            if (!formData.password) {
                alert('Password is required for registration');
                throw new Error('Password is required');
            }

            // First verify OTP
            const otpResponse = await axios.post(
                `${process.env.REACT_APP_API_URL}/kyc/submit-otp`,
                {
                    transactionId: formData.transactionId,
                    fwdp: formData.fwdp,
                    codeVerifier: formData.codeVerifier,
                    otp: otpValues.join(''),
                    phone: formattedPhone,
                    registeredName: formData.username, // Changed from username to registeredName
                    aadharName: '', // This will be filled by backend from Aadhaar response
                    email: formData.email,
                    password: formData.password,
                    card_detail: formData.card_detail,
                    card_select: formData.card_select || 'Aadhar',
                    shareCode: '1234',
                    isSendPdf: true
                }
            );

            console.log('OTP verification request sent:', {
                transactionId: formData.transactionId,
                phone: formattedPhone,
                username: formData.username,
                hasPassword: !!formData.password,
                otp: otpValues.join('')
            });

            if (!otpResponse.data.success || otpResponse.data.code === '400') {
                const errorMsg = otpResponse.data.msg || 'OTP verification failed';
                console.error('OTP verification failed:', otpResponse.data);
                alert(`OTP verification failed: ${errorMsg}`);
                
                // If name mismatch, go back
                if (otpResponse.data.goBack) {
                    window.history.back();
                    return;
                }
                throw new Error(errorMsg);
            }

            // Then fetch the latest Aadhaar details
            const detailsResponse = await axios.get(
                `${process.env.REACT_APP_API_URL}/kyc/get-customer-details`,
                {
                    params: {
                        phone: formattedPhone
                    }
                }
            );

            if (!detailsResponse.data.success || !detailsResponse.data.customerDetails) {
                alert('Unable to fetch Aadhaar details. Please try again.');
                throw new Error('Failed to fetch customer details');
            }

            const storedAadharName = detailsResponse.data.customerDetails.name;
            const registeredName = (formData.username || '').trim();

            console.log('Names to compare:', {
                registeredName,
                storedAadharName
            });

            if (!storedAadharName) {
                alert('Name information from Aadhaar verification is missing. Please try again.');
                throw new Error('Missing Aadhaar name information');
            }

            // Validate names are present
            if (!registeredName || !storedAadharName) {
                console.error('Missing name data:', { registeredName, storedAadharName });
                alert('Missing name information. Please ensure both names are provided.');
                throw new Error('Missing name information for comparison');
            }

            // Normalize names for comparison
            const normalizeNameForComparison = (name) => {
                if (typeof name !== 'string') {
                    console.error('Invalid name type:', { name, type: typeof name });
                    throw new Error('Invalid name type for comparison');
                }
                return name.toLowerCase()
                    .replace(/\s+/g, ' ')
                    .trim();
            };

            let normalizedInputName, normalizedAadharName;
            try {
                normalizedInputName = normalizeNameForComparison(registeredName);
                normalizedAadharName = normalizeNameForComparison(storedAadharName);

                console.log('Normalized name comparison:', {
                    inputName: normalizedInputName,
                    storedAadharName: normalizedAadharName
                });
            } catch (error) {
                console.error('Name normalization error:', error);
                alert('Error processing names. Please ensure valid names are provided.');
                throw error;
            }

            // Strict exact match required
            const nameMatches = normalizedInputName === normalizedAadharName;
            
            if (!nameMatches) {
                alert(`Name mismatch! Your input (${registeredName}) does not match with your Aadhaar name (${storedAadharName}). Please enter your name exactly as it appears on your Aadhaar card.`);
                throw new Error(`Name mismatch: Input=${registeredName}, Aadhaar=${storedAadharName}`);
            }

            // Registration is successful at this point
            console.log('Name verification successful:', {
                registeredName: registeredName,
                aadharName: storedAadharName
            });

            // Success, proceed with login redirect
            alert('Registration successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 500);
        } catch (error) {
            console.error('OTP verification error:', error);
            
            // Update attempts counter
            const newAttempts = (formData.totalAttempts || 0) + 1;
            setFormData(prev => ({ ...prev, totalAttempts: newAttempts }));
            
            if (newAttempts >= 3) {
                alert('Maximum attempts reached. Please try again later.');
                setTimeout(() => navigate('/login'), 500);
            } else {
                // Get detailed error message
                let errorMessage = 'OTP verification failed';
                if (error.response?.data?.msg) {
                    errorMessage = error.response.data.msg;
                } else if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                alert(`${errorMessage}`);
                
                // If name mismatch, go back
                if (error.response?.data?.goBack) {
                    window.history.back();
                    return;
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOTP = async () => {
        try {
            setIsLoading(true);


            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/kyc/initiate`,
                {
                    uniqueId: formData.telephone,
                    uid: formData.card_detail,
                    f_name: formData.username.split(' ')[0],
                    l_name: formData.username.split(' ').slice(1).join(' '),
                    email: formData.email,
                    phone: formData.telephone,
                    address: formData.address,
                    company_name: formData.company_name || null,
                    password: formData.password,
                    card_select: formData.card_select,
                    card_detail: formData.card_detail,
                    company_gst: formData.company_gst || null,
                    resend: true
                }
            );

            if (response.data.success) {
                setFormData(prev => ({
                    ...prev,
                    transactionId: response.data.model?.transactionId,
                    fwdp: response.data.model?.fwdp,
                    codeVerifier: response.data.model?.codeVerifier
                }));
                setOtpTimer(60);
                alert('OTP has been resent to your Aadhar-linked mobile number');
                setOtpValues(['', '', '', '', '', '']); // Clear OTP input
                if (otpRefs[0]?.current) {
                    otpRefs[0].current.focus();
                }
            } else {
                throw new Error(response.data.message || 'Failed to resend OTP');
            }
        } catch (error) {
            console.error('Resend OTP error:', error);
            alert(error.response?.data?.message || error.message || 'Failed to resend OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            setIsLoading(true);
            
            // Normalize phone number
            const normalizedPhone = formData.telephone.replace(/\s+/g, '').replace(/^\+?91?/, '');
            const formattedPhone = `+91${normalizedPhone}`;

            // Split name properly
            const nameParts = formData.username.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Directly initiate KYC with all user data
            const kycResponse = await axios.post(
                `${process.env.REACT_APP_API_URL}/kyc/initiate`,
                {
                    uniqueId: formattedPhone,
                    uid: formData.card_detail,
                    f_name: firstName,
                    l_name: lastName,
                    email: formData.email,
                    phone: formattedPhone,
                    name: formData.username,
                    address: formData.address || '',
                    company_name: formData.company_name || '',
                    password: formData.password,
                    card_select: formData.card_select || 'Aadhar',
                    card_detail: formData.card_detail,
                    company_gst: formData.company_gst || ''
                }
            );

            console.log('KYC Response:', kycResponse.data);

            // Handle direct login cases
            if (kycResponse.data.success && kycResponse.data.proceedToLogin) {
                alert('Registration successful! Please login to continue.');
                setTimeout(() => navigate('/login'), 500);
                return;
            }

            // Handle OTP generation success
            if (kycResponse.data.code === "200" || kycResponse.data.otpGenerated) {
                try {
                    // Save customer details immediately after successful KYC
                    const fullName = formData.username; // Use username since it's guaranteed to be present
                    console.log('Using name for save:', fullName);
                    
                    // Normalize phone number
                    const normalizedPhone = formData.telephone.replace(/\s+/g, '').replace(/^\+?91?/, '');
                    const formattedPhone = `+91${normalizedPhone}`;

                    const saveResponse = await axios.post(
                        `${process.env.REACT_APP_API_URL}/kyc/save-details`,
                        {
                            aadharName: fullName,
                            username: formData.username,
                            phone: formattedPhone,
                            email: formData.email,
                            card_detail: formData.card_detail
                        }
                    );

                    console.log('Save details response:', saveResponse.data);

                    if (!saveResponse.data.success) {
                        throw new Error('Failed to save customer details');
                    }

                    // Update form data with transaction details and saved name
                    setFormData({
                        ...formData,
                        transactionId: kycResponse.data.model?.transactionId,
                        fwdp: kycResponse.data.model?.fwdp,
                        codeVerifier: kycResponse.data.model?.codeVerifier,
                        aadharName: fullName
                    });

                    setStep(2); // Move to OTP input page
                    setOtpTimer(60);
                    setShowOtpInput(true);
                    alert('Please enter the OTP sent to your Aadhar-linked mobile number');
                } catch (error) {
                    console.error('Error saving customer details:', error);
                    alert('Failed to save verification details. Please try again.');
                    throw error;
                }
                return;
            }

            // If we reach here, something went wrong
            throw new Error(kycResponse.data.message || 'KYC initiation failed');
        } catch (error) {
            console.error('Submit error:', error);
            alert(error.response?.data?.message || error.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    const validateForm = () => {
        // Check required fields
        const requiredFields = {
            username: 'Full Name',
            email: 'Email',
            telephone: 'Phone Number',
            card_detail: 'Aadhar Number',
            password: 'Password',
            confirm_password: 'Confirm Password'
        };

        for (const [field, label] of Object.entries(requiredFields)) {
            if (!formData[field]) {
                alert(`Please enter your ${label}`);
                return false;
            }
        }

        // Validate Aadhar number
        if (formData.card_detail.length !== 12 || !/^\d+$/.test(formData.card_detail)) {
            alert('Please enter a valid 12-digit Aadhar number');
            return false;
        }

        // Validate phone number
        const phoneRegex = /^[6-9]\d{9}$/;
        const normalizedPhone = formData.telephone.replace(/\s+/g, '').replace(/^\+?91?/, '');
        if (!phoneRegex.test(normalizedPhone)) {
            alert('Please enter a valid 10-digit Indian mobile number');
            return false;
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            alert('Please enter a valid email address');
            return false;
        }

        // Validate password match
        if (formData.password !== formData.confirm_password) {
            alert('Passwords do not match');
            return false;
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            alert('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number');
            return false;
        }

        if (!isPasswordValid(formData.password)) {
            alert('Password must meet all requirements');
            return false;
        }

        return true;
    };

    const validateVerificationStep = () => {
        if (!formData.card_detail || formData.card_detail.length !== 12) {
            alert('Please enter a valid 12-digit Aadhar number');
            return false;
        }

        if (!formData.password || formData.password !== formData.confirm_password) {
            alert('Please set and confirm your password');
            return false;
        }

        if (!isPasswordValid(formData.password)) {
            alert('Password must meet all requirements');
            return false;
        }

        return true;
    };

    const verifyOtp = async (e) => {
        e.preventDefault();

        const otpString = otpValues.join('');
        if (!otpString || otpString.length !== 6) {
            alert('Please enter a valid 6-digit OTP');
            return;
        }

        try {
            setIsLoading(true);


            // Log transaction details for debugging
            console.log('Transaction details:', {
                transactionId: formData.transactionId,
                fwdp: formData.fwdp,
                codeVerifier: formData.codeVerifier,
                otpLength: otpString.length
            });

            // Ensure we have all required fields
            if (!formData.transactionId || !formData.fwdp || !formData.codeVerifier || !otpString) {
                console.error('Missing required fields:', {
                    transactionId: formData.transactionId,
                    fwdp: formData.fwdp,
                    codeVerifier: formData.codeVerifier,
                    otpLength: otpString.length
                });
                throw new Error('Missing required fields for OTP verification');
            }

            // Submit OTP with minimal required fields
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/kyc/submit-otp`,
                {
                    transactionId: formData.transactionId,
                    fwdp: formData.fwdp,
                    codeVerifier: formData.codeVerifier,
                    otp: otpString,
                    shareCode: "1234"
                }
            );

            // Log response for debugging
            console.log('OTP verification response:', response.data);

            if (response.data.success) {
                // Save customer details after successful OTP verification
                await axios.post(
                    `${process.env.REACT_APP_API_URL}/kyc/save-details`,
                    {
                        email: formData.email,
                        phone: formData.telephone,
                        username: formData.username,
                        address: formData.address,
                        company_name: formData.company_name,
                        company_gst: formData.company_gst,
                        card_select: formData.card_select,
                        card_detail: formData.card_detail
                    }
                );
                alert('Registration successful! Please login to continue.');
                setTimeout(() => navigate('/login'), 500);
            } else {
                throw new Error(response.data.message || 'OTP verification failed');
            }

        } catch (error) {
            console.error('OTP Verification Error:', error);
            alert(error.response?.data?.message || error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-left">
            {step === 2 ? (
                <>
                    {renderOTPInput()}

                </>
            ) : (
                <>
                    <h2 className="register-headi">Aadhar Verification</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-row">
                    <div className="form-grouppp">
                        <label>Name*</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            readOnly
                            className="readonly-field"
                        />
                    </div>

                    <div className="form-grouppp">
                        <label>Email*</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            readOnly
                            className="readonly-field"
                        />
                    </div>

                    <div className="form-grouppp">
                        <label>Phone Number*</label>
                        <input
                            type="tel"
                            name="telephone"
                            value={formData.telephone}
                            readOnly
                            className="readonly-field"
                        />
                    </div>
                </div>

                <div className="form-grouppp">
                    <label>Password*</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your password"
                    />
                    <div className="password-requirements">
                        <ul>
                            <li style={{ color: formData.password.length >= 8 ? 'green' : 'red' }}>
                                {formData.password.length >= 8 ? '✓' : '×'} At least 8 characters
                            </li>
                            <li style={{ color: /([A-Z])/.test(formData.password) ? 'green' : 'red' }}>
                                {/([A-Z])/.test(formData.password) ? '✓' : '×'} One uppercase letter
                            </li>
                            <li style={{ color: /([a-z])/.test(formData.password) ? 'green' : 'red' }}>
                                {/([a-z])/.test(formData.password) ? '✓' : '×'} One lowercase letter
                            </li>
                            <li style={{ color: /(\d)/.test(formData.password) ? 'green' : 'red' }}>
                                {/(\d)/.test(formData.password) ? '✓' : '×'} One number
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="form-grouppp">
                    <label>Confirm Password*</label>
                    <input
                        type="password"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleInputChange}
                        required
                        placeholder="Confirm your password"
                    />
                </div>

                <div className="form-grouppp">
                    <label>Aadhar Number*</label>
                    <input
                        type="text"
                        name="card_detail"
                        value={formData.card_detail}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter 12-digit Aadhar number"
                        maxLength="12"
                    />
                </div>


                <button
                    type="submit"
                    className="register-button"
                    disabled={isLoading}
                >
                    {isLoading ? 'Processing...' : 'Submit'}
                </button>
            </form>
            </>
            )}
        </div>
    );
};

export default RegisterAadhar;