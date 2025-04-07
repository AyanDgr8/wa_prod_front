// src/components/routes/Forms/Messenger/Messenger.js 

import React, { useState, useEffect } from "react";
import "./Messenger.css";
import axios from "axios";
import Subscription from "../Subscription/Subscription";

const Messenger = () => {
    const [filePath, setFilePath] = useState("");
    const [selectedFileName, setSelectedFileName] = useState("");
    const [selectedCSVName, setSelectedCSVName] = useState("");
    const [numbers, setNumbers] = useState("");
    const [message, setMessage] = useState("");
    const [caption, setCaption] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [storedInstanceId, setStoredInstanceId] = useState(null); // State to hold the instance ID
    const [loading, setLoading] = useState(false); // Optional: loading state
    const [error, setError] = useState(null); // Optional: error state
    const [isConnected, setIsConnected] = useState(false);
    const [refreshSubscription, setRefreshSubscription] = useState(0);
    const [csvHeaders, setCsvHeaders] = useState([]); // Store CSV headers
    const [csvData, setCsvData] = useState([]); // Store CSV data rows
    const [activeInput, setActiveInput] = useState(null); // 'caption' or 'message'
    const [isVerified, setIsVerified] = useState(false);

    const handleUnverifiedUser = () => {
        if (!isVerified) {
            setError("Your account verification is pending. Please check your subscription status.");
            return false;
        }
        return true;
    };

    useEffect(() => {
        const checkVerification = async () => {
            try {
                const token = localStorage.getItem("token");
                const instanceId = localStorage.getItem('current_instance_id');
                
                if (!token) {
                    console.log('token not valid')
                    return;
                }

                if (!instanceId) {
                    console.error("No instance ID found");
                    setIsVerified(false);
                    return;
                }

                const apiUrl = process.env.REACT_APP_API_URL;
                try {
                    const response = await axios.get(`${apiUrl}/${instanceId}/check-subscription`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    console.log('Subscription check response:', response.data);
                    setIsVerified(response.data.success && response.data.hasSubscription);
                } catch (error) {
                    if (error.response?.status === 404) {
                        console.error('Subscription endpoint not found. Please check API URL and routes.');
                    } else if (error.response?.status === 401) {
                        console.error('Unauthorized. Token may be invalid.');
                    } else {
                        console.error('Subscription check failed:', error.message);
                    }
                    setIsVerified(false);
                }
            } catch (error) {
                console.error("Failed to check subscription status:", error);
                setIsVerified(false);
            }
        };

        checkVerification();
    }, []);

    const verificationCheck = (callback) => (e) => {
        if (!isVerified) {
            e.preventDefault();
            handleUnverifiedUser();
            if (e.target.type === 'file') {
                e.target.value = '';
            }
            return;
        }
        callback(e);
    };

    const handleDownloadClick = () => {
        const link = document.createElement('a');
        link.href = '/uploads/sample.csv';
        link.download = 'sample.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
      // Retrieve the instance ID from localStorage
      const storedInstanceId = localStorage.getItem('current_instance_id');
      if (storedInstanceId) {
          console.log("Instance ID retrieved:", storedInstanceId);
          setStoredInstanceId(storedInstanceId);
      } else {
          console.error("Instance ID is missing.");
          setError("Instance ID not found");
      }
  }, []);

    useEffect(() => {
      // Check connection status when component mounts and when instance ID changes
      const checkConnection = async () => {
        try {
          const apiUrl = process.env.REACT_APP_API_URL;
          const token = localStorage.getItem("token");
          const instanceId = localStorage.getItem('current_instance_id');
          
          if (!instanceId) {
            console.error("No instance ID found");
            setIsConnected(false);
            return;
          }

          if (!token) {
            console.error("No token found");
            setIsConnected(false);
            setError("No valid token found. Please login again.");
            return;
          }

          const response = await axios.get(`${apiUrl}/${instanceId}/status`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.data.success) {
            setIsConnected(response.data.connected);
            
            if (!response.data.connected) {
              if (response.data.status === 'disconnected' || response.data.status === 'closed') {
                console.log("WhatsApp is disconnected. Redirecting to QR code scan...");
                // Store current instance ID before redirect
                sessionStorage.setItem('reconnecting_instance', instanceId);
                window.location.href = `/qrcode/${instanceId}`;
              } else if (response.data.status === 'reconnecting') {
                console.log("WhatsApp is reconnecting...");
              }
            } else {
              console.log("WhatsApp connected successfully!");
            }
          } else {
            setIsConnected(false);
            console.error(response.data.message);
          }
        } catch (error) {
          console.error("Failed to check connection status:", error);
          setIsConnected(false);
          
          if (error.response?.status === 403) {
            setError("Session expired. Please login again.");
          } else if (error.response?.status === 404) {
            setError("QR code not found. Please scan QR code again.");
          } else {
            setError("Failed to check connection status. Please try again.");
          }
        }
      };

      // Initial check
      checkConnection();
      
      // Poll every 5 seconds
      const interval = setInterval(checkConnection, 5000);
      return () => clearInterval(interval);
    }, [storedInstanceId]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Set the selected file name
        setSelectedFileName(file.name);

        // Show loading state
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = localStorage.getItem("token");
            const apiUrl = process.env.REACT_APP_API_URL;

            if (!storedInstanceId) {
                throw new Error("Instance ID not found");
            }

            // Log the request details
            console.log("Upload details:", {
                instanceId: storedInstanceId,
                url: `${apiUrl}/${storedInstanceId}/upload-media`,
                fileName: file.name,
                fileSize: file.size
            });

            const response = await axios.post(
                `${apiUrl}/${storedInstanceId}/upload-media`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            console.log("Upload response:", response.data);

            if (response.data.success) {
                setFilePath(response.data.filePath);
                alert("Media file uploaded successfully!");
            } else {
                throw new Error(response.data.message || "Failed to upload media file");
            }
        } catch (error) {
            console.error("File upload failed:", error);
            console.error("Error details:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            const errorMessage = error.response?.data?.message || error.message || "Failed to upload media file";
            setError(errorMessage);
            alert(errorMessage);
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };
  
    const handleContactFileUpload = async (e) => {
        verificationCheck(async (e) => {
            if (!isVerified) return;

            const file = e.target.files[0];
            if (!file) return;

            // Check file extension
            const extension = file.name.toLowerCase().split('.').pop();
            const allowedExtensions = ['csv', 'xls', 'xlsx'];
            
            if (!allowedExtensions.includes(extension)) {
                alert('Please upload a CSV or Excel file (.csv, .xls, .xlsx)');
                e.target.value = '';
                return;
            }

            setSelectedCSVName(file.name);
            setLoading(true);
            setError(null);

            const formData = new FormData();
            formData.append("file", file);
  
            try {
                const token = localStorage.getItem("token");
                const apiUrl = process.env.REACT_APP_API_URL;

                if (!storedInstanceId) {
                    throw new Error("Instance ID not found");
                }

                console.log("Uploading CSV for instance:", storedInstanceId);
  
                const response = await axios.post(
                    `${apiUrl}/${storedInstanceId}/upload-csv`,
                    formData,
                    {
                        headers: {
                            "Content-Type": "multipart/form-data",
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
  
                if (response.data.phoneNumbers && response.data.phoneNumbers.length > 0) {
                    const formattedNumbers = response.data.phoneNumbers.join(", ");
                    setNumbers(formattedNumbers);
                    
                    // Store CSV headers and data
                    if (response.data.headers) {
                        setCsvHeaders(response.data.headers); 
                    }
                    if (response.data.data) {
                        setCsvData(response.data.data);
                    }
                    
                    alert(`Successfully loaded ${response.data.phoneNumbers.length} phone numbers`);
                } else {
                    throw new Error("No valid phone numbers found in CSV");
                }
  
            } catch (error) {
                console.error("CSV upload failed:", error);
                const errorMessage = error.response?.data?.message || error.message || "Failed to upload CSV";
                setError(errorMessage);
                alert(errorMessage);
                // Clear the file name on error
                setSelectedCSVName("");
            } finally {
                setLoading(false);
            }
        })(e);
    };
  
    // const handleCSVUpload = async (e) => {
    //     const file = e.target.files[0];
    //     if (!file) return;

    //     setSelectedCSVName(file.name);
    //     setLoading(true);
    //     setError(null);

    //     const formData = new FormData();
    //     formData.append("file", file);
  
    //     try {
    //         const token = localStorage.getItem("token");
    //         const apiUrl = process.env.REACT_APP_API_URL;

    //         if (!storedInstanceId) {
    //             throw new Error("Instance ID not found");
    //         }

    //         console.log("Uploading CSV for instance:", storedInstanceId);
  
    //         const response = await axios.post(
    //             `${apiUrl}/${storedInstanceId}/upload-csv`,
    //             formData,
    //             {
    //                 headers: {
    //                     "Content-Type": "multipart/form-data",
    //                     Authorization: `Bearer ${token}`,
    //                 },
    //             }
    //         );
  
    //         if (response.data.phoneNumbers && response.data.phoneNumbers.length > 0) {
    //             const formattedNumbers = response.data.phoneNumbers.join(", ");
    //             setNumbers(formattedNumbers);
                
    //             // Store CSV headers and data
    //             if (response.data.headers) {
    //                 setCsvHeaders(response.data.headers); 
    //             }
    //             if (response.data.data) {
    //                 setCsvData(response.data.data);
    //             }
                
    //             alert(`Successfully loaded ${response.data.phoneNumbers.length} phone numbers`);
    //         } else {
    //             throw new Error("No valid phone numbers found in CSV");
    //         }
  
    //     } catch (error) {
    //         console.error("CSV upload failed:", error);
    //         const errorMessage = error.response?.data?.message || error.message || "Failed to upload CSV";
    //         setError(errorMessage);
    //         alert(errorMessage);
    //         // Clear the file name on error
    //         setSelectedCSVName("");
    //     } finally {
    //         setLoading(false);
    //     }
    // };
    
    const checkSubscription = async (instanceId) => {
        try {
            const token = localStorage.getItem("token");
            const apiUrl = process.env.REACT_APP_API_URL;
            
            const response = await axios.get(`${apiUrl}/${instanceId}/check-subscription`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            return response.data.success && response.data.hasSubscription;
        } catch (error) {
            console.error("Error checking subscription:", error);
            return false;
        }
    };

    // Validate phone numbers input
    const validatePhoneNumbers = (input) => {
        // Only allow numbers, +, comma and spaces
        return /^[0-9+,\s]*$/.test(input);
    };

    const handleNumbersChange = (e) => {
        const input = e.target.value;
        if (validatePhoneNumbers(input)) {
            setNumbers(input);
        }
    };

    // Function to insert header placeholder at cursor position
    const insertHeaderValue = (field) => {
        if (!activeInput || (activeInput !== 'message' && activeInput !== 'caption')) {
            alert("Please click inside the message or caption field to insert variables!");
            return;
        }

        const inputDiv = document.querySelector(activeInput === 'message' ? '.message-input' : '.caption-input');
        
        if (!inputDiv) return;

        // Check if the cursor/selection is actually inside the input div
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const isInsideInput = inputDiv.contains(range.commonAncestorContainer);

        if (!isInsideInput) {
            alert("Please click inside the message or caption field to insert variables!");
            return;
        }

        const placeholder = `{{${field}}}`;
        
        // Create a text node with the placeholder
        const textNode = document.createTextNode(placeholder);
        
        // Insert the placeholder at cursor position
        range.deleteContents();
        range.insertNode(textNode);
        
        // Move cursor to end of inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Update state
        if (activeInput === 'message') {
            setMessage(inputDiv.innerText);
        } else {
            setCaption(inputDiv.innerText);
        }
    };

    // Function to replace placeholders with actual values for a recipient
    const replacePlaceholders = (text, recipientData) => {
        if (!text) return '';
        
        return text.replace(/\{\{(\w+)\}\}/g, (match, field) => {
            return recipientData[field] || match;
        });
    };

    const formatText = (formatType, inputType) => {
        const inputDiv = document.querySelector(inputType === 'message' ? '.message-input' : '.caption-input');
        if (!inputDiv) return;

        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText) {
            // Check if text already contains formatting
            const hasBold = selectedText.includes('*');
            const hasItalic = selectedText.includes('_');
            
            // Remove existing formatting if any
            let cleanText = selectedText
                .replace(/^\*+|\*+$/g, '') // Remove leading/trailing asterisks
                .replace(/^_+|_+$/g, '');  // Remove leading/trailing underscores
            
            const range = selection.getRangeAt(0);
            let formattedText = cleanText;

            // Apply new formatting
            if (formatType === 'bold' && !hasBold) {
                formattedText = `*${cleanText}*`;
            } else if (formatType === 'italic' && !hasItalic) {
                formattedText = `_${cleanText}_`;
            }

            // If text already has the requested format, just keep the clean text
            if ((formatType === 'bold' && hasBold) || (formatType === 'italic' && hasItalic)) {
                formattedText = cleanText;
            }

            // If text has one format and user requests the other, combine them
            if (formatType === 'bold' && hasItalic && !hasBold) {
                formattedText = `*_${cleanText}_*`;
            } else if (formatType === 'italic' && hasBold && !hasItalic) {
                formattedText = `*_${cleanText}_*`;
            }
            
            // Replace the selected text with the formatted version
            range.deleteContents();
            range.insertNode(document.createTextNode(formattedText));
            
            // Update state based on input type
            if (inputType === 'message') {
                setMessage(inputDiv.innerText);
            } else {
                setCaption(inputDiv.innerText);
            }
        } else {
            alert('Please select the text you want to format');
        }
    };

    // Handle submit with template processing
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!numbers) {
                throw new Error("Please enter phone numbers");
            }

            if (!selectedFileName && !message) {
                throw new Error("Please either upload a media file or enter a message");
            }

            const token = localStorage.getItem("token");
            const apiUrl = process.env.REACT_APP_API_URL;

            const hasValidSubscription = await checkSubscription(storedInstanceId);
            if (!hasValidSubscription) {
                throw new Error("No active subscription found. Please subscribe first.");
            }

            // Get phone numbers list
            const phoneNumbersList = numbers.split(',')
                .map(num => num.trim())
                .filter(num => num !== '');

            console.log('Phone numbers to process:', phoneNumbersList);

            // Process personalized messages for each recipient
            const personalizedMessages = phoneNumbersList.map(phoneNumber => {
                const messageDiv = document.querySelector('.message-input');
                const captionDiv = document.querySelector('.caption-input');
                let recipientMessage = messageDiv ? messageDiv.innerText : '';
                let recipientCaption = captionDiv ? captionDiv.innerText : '';

                // Clean the phone number
                const cleanedPhoneNumber = phoneNumber.replace(/\s+/g, '').replace(/^[+]/, '');
                const formattedNumber = cleanedPhoneNumber.length === 10 ? '91' + cleanedPhoneNumber : cleanedPhoneNumber;

                if (csvData.length > 0) {
                    const recipientData = csvData.find(row => {
                        const rowPhone = row.phone_numbers.replace(/\s+/g, '').replace(/^[+]/, '');
                        return rowPhone === cleanedPhoneNumber;
                    });

                    if (recipientData) {
                        recipientMessage = recipientMessage ? replacePlaceholders(recipientMessage, recipientData) : '';
                        recipientCaption = recipientCaption ? replacePlaceholders(recipientCaption, recipientData) : '';
                    }
                }

                return {
                    number: formattedNumber,
                    message: recipientMessage,
                    caption: recipientCaption
                };
            });

            const messageData = {
                messages: personalizedMessages.map(recipient => ({
                    number: recipient.number,
                    text: recipient.message,
                    caption: recipient.caption
                })),
                filePath: filePath || '',
                scheduleTime: scheduleTime || null
            };

            console.log('Sending data:', messageData);

            // Send personalized messages to all recipients
            const response = await axios.post(
                `${apiUrl}/${storedInstanceId}/send-media`,
                messageData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.data.success) {
                throw new Error(`Failed to send messages: ${response.data.message}`);
            }

            console.log('Messages sent successfully');
            alert('Messages sent successfully!');
            
            // Clear form
            setNumbers("");
            setMessage("");
            setCaption("");
            setFilePath("");
            setSelectedFileName("");
            setSelectedCSVName("");
            setCsvData([]);
            setCsvHeaders([]);
            
            // Refresh the page after a short delay to allow the alert to be seen(0.25sec)
            setTimeout(() => {
                window.location.reload();
            }, 250);
            
        } catch (error) {
            console.error("Error sending messages:", error);
            const errorMessage = error.response?.data?.message || error.message || "Failed to send messages";
            setError(errorMessage);
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="messenger-container" className="messenger-container">
            <div className="download-section">
                <img 
                    src="/uploads/download.svg"
                    className="download-icon"
                    alt="download icon"
                    onClick={verificationCheck(handleDownloadClick)}
                />
                <span className="download-text" onClick={verificationCheck(handleDownloadClick)}>Download Sample CSV</span>
            </div>
            
            <div className="messenger-form">
                <div className="sendinggg_twos">
                    {csvHeaders.length > 0 && (
                        <div className="header-buttons">
                            <p>Click to insert:</p>
                            <div className="button-container">
                                {csvHeaders.map((header) => (
                                    <button
                                        key={header}
                                        type="button"
                                        className="header-button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            insertHeaderValue(header);
                                        }}
                                    >
                                        {header}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="form-container">
                    <form onSubmit={handleSubmit}>
                        <div className="form-section">
                        <label className="form-label">Upload phone numbers file (.csv, .xls, .xlsx):</label>
                            <div className="file-upload-container">
                                <input
                                    type="file"
                                    onChange={verificationCheck(handleContactFileUpload)}
                                    accept=".csv,.xls,.xlsx"
                                    className="form-input file-input"
                                    id="contact-file-upload"
                                    readOnly={!isVerified}
                                />
                                <input
                                    type="text"
                                    value={selectedCSVName}
                                    readOnly
                                    placeholder="No file selected"
                                    className="form-input file-name-input"
                                />
                            </div>
                        </div>
                        <div className="form-section">
                        <label className="form-label">Enter mobile phone numbers with country code (comma separated):</label>
                            <input
                            type="text"
                            value={numbers}
                            onChange={handleNumbersChange}
                            placeholder="Example:+910123456789, +910123456789"
                            className="form-input"
                            required
                            />
                        </div>

                        <div className="form-section">
                            <label className="form-label">
                                Media File <span className="file-types">(.jpg, .jpeg, .png, .mp4, .mov, .mp3, .wav, .ogg, .pdf, .doc, .docx)</span>
                            </label>
                            <div className="file-upload-container">
                                <input
                                    type="file"
                                    onChange={handleFileUpload}
                                    className="form-input file-input"
                                    id="file-upload"
                                />
                                <input
                                    type="text"
                                    value={selectedFileName}
                                    readOnly
                                    placeholder="No file selected"
                                    className="form-input file-name-input"
                                />
                            </div>
                        </div>
                        <div className="form-section">
                        <label className="form-label">CAPTION to be displayed with media file only:</label>
                            <div className="caption-input-container">
                                <div className="formatting-buttons">
                                    <button 
                                        type="button" 
                                        onClick={() => formatText('bold', 'caption')}
                                        className="format-btn"
                                        title="Bold"
                                    >
                                        <strong>B</strong>
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => formatText('italic', 'caption')}
                                        className="format-btn"
                                        title="Italic"
                                    >
                                        <em>I</em>
                                    </button>
                                </div>
                                <div
                                    className="caption-input"
                                    contentEditable
                                    onInput={(e) => setCaption(e.target.innerText)}
                                    onFocus={() => setActiveInput('caption')}
                                    placeholder="Type your caption here... Select text and use formatting buttons above"
                                    role="textbox"
                                    aria-multiline="true"
                                    spellCheck={true}
                                    lang='en'
                                />
                            </div>
                        </div>
                        <div className="form-section">
                            <label className="form-label">Message:</label>
                            <div className="message-input-container">
                                <div className="formatting-buttons">
                                    <button 
                                        type="button" 
                                        onClick={() => formatText('bold', 'message')}
                                        className="format-btn"
                                        title="Bold"
                                    >
                                        <strong>B</strong>
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => formatText('italic', 'message')}
                                        className="format-btn"
                                        title="Italic"
                                    >
                                        <em>I</em>
                                    </button>
                                </div>
                                <div
                                    className="message-input"
                                    contentEditable
                                    onInput={(e) => setMessage(e.target.innerText)}
                                    onFocus={() => setActiveInput('message')}
                                    placeholder="Type your message here... Select text and use formatting buttons above"
                                    role="textbox"
                                    aria-multiline="true"
                                    spellCheck={true}
                                    lang='en'
                                />
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            className="form-button"
                            disabled={loading || !isConnected}
                        >
                            {loading ? "Sending..." : "Send"}
                        </button>
                        </form>
                    </div>

                    <div>
                        <Subscription refreshTrigger={refreshSubscription} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Messenger; 