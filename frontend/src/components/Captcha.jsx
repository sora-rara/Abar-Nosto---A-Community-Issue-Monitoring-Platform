import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const Captcha = forwardRef(({ onVerify, siteKey }, ref) => {
    const recaptchaRef = useRef(null);
    const [loadError, setLoadError] = useState(false);

    // Use prop first, then env var
    const resolvedSiteKey = siteKey || import.meta.env.VITE_RECAPTCHA_SITE_KEY;

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
        console.error('CAPTCHA error — check that this domain is added to your reCAPTCHA site key settings at https://www.google.com/recaptcha/admin');
        setLoadError(true);
        onVerify(null);
    };

    if (!resolvedSiteKey) {
        return (
            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded text-sm text-yellow-800">
                ⚠️ reCAPTCHA site key is missing. Set <code>VITE_RECAPTCHA_SITE_KEY</code> in your Vercel environment variables.
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="p-3 bg-red-50 border border-red-300 rounded text-sm text-red-800">
                ⚠️ reCAPTCHA failed to load. Make sure your Vercel domain is added in the{' '}
                <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noreferrer" className="underline">
                    Google reCAPTCHA admin console
                </a>.
            </div>
        );
    }

    return (
        <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={resolvedSiteKey}
            onChange={handleChange}
            onExpired={handleExpired}
            onErrored={handleError}
            className="captcha-container"
        />
    );
});

Captcha.displayName = 'Captcha';

export default Captcha;