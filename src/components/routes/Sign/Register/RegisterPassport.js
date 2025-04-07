// /src/components/routes/Sign/Register/RegisterPassport.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Register.css';

const RegisterPassport = ({ formData: initialFormData }) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        ...initialFormData,
        card_select: 'Passport',
        countryCode: initialFormData?.countryCode || 'AUS'
    });
    const [passportFile, setPassportFile] = useState(null);
    
    // References for input fields
    const fileInputRef = React.useRef(null);
    const passwordRef = React.useRef(null);
    const confirmPasswordRef = React.useRef(null);

    const isPasswordValid = (password) => {
        const hasMinLength = password.length >= 8;
        const hasUpperCase = /([A-Z])/.test(password);
        const hasLowerCase = /([a-z])/.test(password);
        const hasNumber = /(\d)/.test(password);
        return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextRef.current?.focus();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                alert('File size must be less than 5MB');
                setError('File size must be less than 5MB');
                setPassportFile(null);
                e.target.value = ''; // Reset file input
                return;
            }
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                alert('Only JPG, JPEG, PNG and PDF files are allowed');
                setError('Only JPG, JPEG, PNG and PDF files are allowed');
                setPassportFile(null);
                e.target.value = ''; // Reset file input
                return;
            }
            setPassportFile(file);
            setError('');
            alert('Passport file uploaded successfully!');
            passwordRef.current?.focus(); // Move to password field after successful upload
        }
    };

    const validateForm = () => {
        
        if (!passportFile) {
            const msg = 'Please upload your passport document';
            alert(msg);
            setError(msg);
            fileInputRef.current?.focus();
            return false;
        }
        if (!formData.password) {
            const msg = 'Please enter your password';
            alert(msg);
            setError(msg);
            passwordRef.current?.focus();
            return false;
        }
        if (!formData.confirm_password) {
            const msg = 'Please confirm your password';
            alert(msg);
            setError(msg);
            confirmPasswordRef.current?.focus();
            return false;
        }
        if (!isPasswordValid(formData.password)) {
            const msg = 'Password must be at least 8 characters long and contain uppercase, lowercase, and number';
            alert(msg);
            setError(msg);
            passwordRef.current?.focus();
            return false;
        }
        if (formData.password !== formData.confirm_password) {
            const msg = 'Passwords do not match';
            alert(msg);
            setError(msg);
            confirmPasswordRef.current?.focus();
            return false;
        }
        return true;
    };

    // const handleRegisterClick = () => {
    //     validateForm();
    // };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate required fields
        const requiredFields = {
            username: 'Name',
            email: 'Email',
            telephone: 'Phone Number'
        };

        for (const [field, label] of Object.entries(requiredFields)) {
            if (!formData[field]) {
                setError(`Please enter ${label}`);
                return;
            }
        }

        // Run all password and file validations
        if (!validateForm()) {
            return;
        }

        try {
            setIsLoading(true);


            // Format phone number
            const formattedPhone = formData.telephone?.startsWith('+') 
                ? formData.telephone 
                : `+${formData.telephone}`;

            // Upload passport file with all required fields
            const uploadData = new FormData();
            uploadData.append('passport', passportFile);
            uploadData.append('email', formData.email);
            uploadData.append('password', formData.password);
            uploadData.append('username', formData.username);
            uploadData.append('telephone', formattedPhone);
            uploadData.append('card_select', 'Passport');
            uploadData.append('card_detail', '');  // Not required for passport registration
            uploadData.append('address', formData.address || '');
            uploadData.append('company_name', formData.company_name || '');
            uploadData.append('company_gst', formData.company_gst || '');

            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/registration/upload-passport`,
                uploadData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            if (response.data.success) {
                alert('Passport uploaded successfully! You\'ll be verified shortly!');

                setFormData(prev => ({
                    ...prev,
                    passportPath: response.data.filePath,
                    isPassportUploaded: true
                }));
                setTimeout(() => navigate('/login'), 500);
            } else {
                throw new Error(response.data.message || 'Failed to upload passport');
            }

        } catch (error) {
            console.error('Registration Error:', error);
            alert(error.response?.data?.message || error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-left">
            <h2 className="register-headi">Passport Verification</h2>
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
                    <label>Upload Passport*</label>
                    <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileChange}
                        required
                        className="file-input"
                        ref={fileInputRef}
                    />
                    <div className="file-requirements">
                        <small>Supported formats: JPG, JPEG, PNG, PDF (Max size: 5MB)</small>
                    </div>
                </div>

                <div className="form-grouppp">
                    <label>Password*</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onKeyDown={(e) => handleKeyDown(e, confirmPasswordRef)}
                        required
                        placeholder="Enter your password"
                        ref={passwordRef}
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
                        value={formData.confirm_password || ''}
                        onChange={handleInputChange}
                        onKeyDown={(e) => handleKeyDown(e, { current: document.querySelector('button[type="submit"]') })}
                        required
                        placeholder="Confirm your password"
                        ref={confirmPasswordRef}
                    />
                </div>

                <button 
                    type="submit" 
                    className="register-button"
                    disabled={isLoading}
                >
                    {isLoading ? 'Processing...' : 'Register'}
                </button>
            </form>
        </div>
    );
};

export default RegisterPassport;