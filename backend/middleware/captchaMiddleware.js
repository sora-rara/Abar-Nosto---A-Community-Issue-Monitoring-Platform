const https = require('https');
const querystring = require('querystring');

/**
 * Middleware to verify Google reCAPTCHA v2 token
 * This prevents spam and bot submissions
 */
const verifyCaptcha = async (req, res, next) => {
    try {
        // Get token from request body
        const { captchaToken } = req.body;
        
        console.log('Verifying CAPTCHA token...');

        if (!captchaToken) {
            console.warn('CAPTCHA token missing from request');
            return res.status(400).json({ 
                success: false, 
                error: 'CAPTCHA verification is required. Please complete the CAPTCHA.' 
            });
        }

        // Prepare the data for verification
        const postData = querystring.stringify({
            secret: process.env.RECAPTCHA_SECRET_KEY,
            response: captchaToken
        });

        // Options for the HTTPS request
        const options = {
            hostname: 'www.google.com',
            path: '/recaptcha/api/siteverify',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 5000 // 5 second timeout
        };

        // Create a promise to handle the HTTPS request
        const verificationResult = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';

                // Collect response data
                res.on('data', (chunk) => {
                    data += chunk;
                });

                // Process complete response
                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(data);
                        resolve(parsedData);
                    } catch (error) {
                        reject(new Error('Failed to parse CAPTCHA response'));
                    }
                });
            });

            // Handle request timeout
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            // Handle request errors
            req.on('error', (error) => {
                reject(error);
            });

            // Write data to request body
            req.write(postData);
            req.end();
        });

        const { success, 'error-codes': errorCodes } = verificationResult;

        console.log('CAPTCHA verification result:', { success, errorCodes });

        if (!success) {
            // Handle specific error cases
            let errorMessage = 'CAPTCHA verification failed';
            
            if (errorCodes) {
                if (errorCodes.includes('timeout-or-duplicate')) {
                    errorMessage = 'CAPTCHA token expired. Please try again.';
                } else if (errorCodes.includes('invalid-input-response')) {
                    errorMessage = 'Invalid CAPTCHA. Please try again.';
                } else if (errorCodes.includes('missing-input-response')) {
                    errorMessage = 'CAPTCHA response missing. Please complete the CAPTCHA.';
                } else if (errorCodes.includes('invalid-input-secret')) {
                    errorMessage = 'CAPTCHA configuration error. Please contact support.';
                    console.error('Invalid reCAPTCHA secret key');
                }
            }

            return res.status(400).json({
                success: false,
                error: errorMessage,
                details: errorCodes
            });
        }

        // Token is valid, proceed to next middleware
        console.log('CAPTCHA verification successful');
        next();

    } catch (error) {
        console.error('CAPTCHA verification service error:', error.message);
        
        // Handle timeout errors
        if (error.message === 'Request timeout') {
            return res.status(503).json({
                success: false,
                error: 'CAPTCHA verification service timeout. Please try again.'
            });
        }

        // Handle network errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return res.status(503).json({
                success: false,
                error: 'Unable to connect to CAPTCHA verification service. Please try again later.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Unable to verify CAPTCHA. Please try again later.'
        });
    }
};

module.exports = { verifyCaptcha };