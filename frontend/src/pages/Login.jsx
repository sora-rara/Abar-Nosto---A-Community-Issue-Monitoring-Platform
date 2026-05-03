import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/auth';

function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            const result = await authService.login(formData.email, formData.password);

            if (result.success) {
                localStorage.setItem('user', JSON.stringify(result.user));
                localStorage.setItem('token', result.user.token);
                localStorage.setItem('userName', result.user.name);

                setSuccessMessage(`Welcome back, ${result.user.name}!`);

                // ✅ Request notification permission after successful login
                if ('Notification' in window && Notification.permission !== 'granted') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            console.log('Notification permission granted');
                        }
                    });
                }

                setTimeout(() => {
                    if (result.user.isAdmin || result.user.role === 'admin') {
                        navigate('/admin');
                    } else {
                        navigate('/home');
                    }
                }, 1000);
            }
        } catch (err) {
            setError(err.message || 'An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0F172A',
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '40px',
                boxShadow: '#FFA500'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: '#FFA500',
                        marginBottom: '8px'
                    }}>
                        Abar Nosto
                    </h1>
                    <p style={{ fontSize: '14px', color: '#666' }}>
                        Community Issue Monitor
                    </p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        color: '#c33',
                        padding: '12px',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        fontSize: '14px',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div style={{
                        backgroundColor: '#e8f5e9',
                        border: '1px solid #a5d6a7',
                        color: '#2e7d32',
                        padding: '12px',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        fontSize: '14px',
                        textAlign: 'center'
                    }}>
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#FFA500',
                            marginBottom: '5px'
                        }}>
                            Email address
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '10px',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#FFA500',
                            marginBottom: '5px'
                        }}>
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '10px',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: '#FFA500',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                <div style={{
                    textAlign: 'center',
                    marginTop: '24px',
                    paddingTop: '24px',
                    borderTop: '1px solid #eee'
                }}>
                    <p style={{ fontSize: '14px', color: '#666' }}>
                        Don't have an account?{' '}
                        <Link
                            to="/register"
                            style={{
                                color: '#FFA500',
                                textDecoration: 'none',
                                fontWeight: '600'
                            }}
                        >
                            Register here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;