import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const Captcha = forwardRef(({ onVerify, siteKey }, ref) => {
    const recaptchaRef = useRef(null);

    useImperativeHandle(ref, () => ({
        reset: () => {
            recaptchaRef.current?.reset();
        },
        execute: () => {
            recaptchaRef.current?.execute();
        }
    }));

    const handleChange = (token) => {
        if (token) {
            onVerify(token);
        }
    };

    const handleExpired = () => {
        console.log('CAPTCHA expired');
        onVerify(null);
    };

    const handleError = () => {
        console.error('CAPTCHA error');
        onVerify(null);
    };

    return (
        <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
            onChange={handleChange}
            onExpired={handleExpired}
            onError={handleError}
            className="captcha-container"
        />
    );
});

Captcha.displayName = 'Captcha';

export default Captcha;