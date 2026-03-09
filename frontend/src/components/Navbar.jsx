import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [userName, setUserName] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const name = localStorage.getItem('userName');

        if (token && name) {
            setIsLoggedIn(true);
            setUserName(name);
        } else {
            setIsLoggedIn(false);
            setUserName('');
        }
    }, [location]); // Re-check when route changes

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        setIsLoggedIn(false);
        setMobileMenuOpen(false);
        navigate('/login');
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <nav style={{ backgroundColor: '#0F172A' }} className="shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo, Brand and Tagline */}
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center space-x-2">

                            <div className="flex flex-col items-start">
                                <span style={{ color: '#FFA500' }} className="font-bold text-xl leading-tight">Abar Nosto!</span>
                                <span className="text-xs text-gray-400 leading-tight">A Community Issue Monitoring Platform</span>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Navigation Links */}
                    <div className="hidden md:block">
                        <div className="flex items-center space-x-4">
                            {isLoggedIn ? (
                                <>
                                    <Link
                                        to="/dashboard"
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/dashboard')
                                            ? 'text-white'
                                            : 'text-gray-300 hover:text-white'
                                            }`}
                                        style={isActive('/dashboard') ? { backgroundColor: '#FFA500' } : {}}
                                    >
                                        Dashboard
                                    </Link>
                                    <Link
                                        to="/create-report"
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive('/create-report')
                                            ? 'text-white'
                                            : 'text-gray-300 hover:text-white'
                                            }`}
                                        style={isActive('/create-report') ? { backgroundColor: '#FFA500' } : {}}
                                    >

                                        Report Issue
                                    </Link>
                                    <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-700">
                                        <span className="text-gray-300 text-sm">
                                            Hi, <span style={{ color: '#FFA500' }} className="font-semibold">{userName}</span>
                                        </span>
                                        <button
                                            onClick={handleLogout}
                                            className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/login')
                                            ? 'text-white'
                                            : 'text-gray-300 hover:text-white'
                                            }`}
                                        style={isActive('/login') ? { backgroundColor: '#FFA500' } : {}}
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/register"
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/register')
                                            ? 'text-white'
                                            : 'text-gray-300 hover:text-white'
                                            }`}
                                        style={isActive('/register') ? { backgroundColor: '#FFA500' } : {}}
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-orange-600 focus:outline-none"
                        >
                            <svg
                                className="h-6 w-6"
                                stroke="currentColor"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                {mobileMenuOpen ? (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                ) : (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden" style={{ backgroundColor: '#0F172A' }}>
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {isLoggedIn ? (
                            <>
                                <div className="px-3 py-2 text-gray-300">
                                    Signed in as <span style={{ color: '#FFA500' }} className="font-semibold">{userName}</span>
                                </div>
                                <Link
                                    to="/dashboard"
                                    className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/dashboard')
                                        ? 'text-white'
                                        : 'text-gray-300 hover:text-white'
                                        }`}
                                    style={isActive('/dashboard') ? { backgroundColor: '#FFA500' } : {}}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    to="/create-report"
                                    className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${isActive('/create-report')
                                        ? 'text-white'
                                        : 'text-gray-300 hover:text-white'
                                        }`}
                                    style={isActive('/create-report') ? { backgroundColor: '#FFA500' } : {}}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <span className="mr-2">📸</span>
                                    Report Issue
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-red-600 hover:text-white"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/login')
                                        ? 'text-white'
                                        : 'text-gray-300 hover:text-white'
                                        }`}
                                    style={isActive('/login') ? { backgroundColor: '#FFA500' } : {}}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/register')
                                        ? 'text-white'
                                        : 'text-gray-300 hover:text-white'
                                        }`}
                                    style={isActive('/register') ? { backgroundColor: '#FFA500' } : {}}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;