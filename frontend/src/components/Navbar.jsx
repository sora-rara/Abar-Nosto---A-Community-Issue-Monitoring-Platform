import { useState, useEffect } from 'react';
import API from '../services/api';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import UserReputation from './userReputation';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [userName, setUserName] = useState('');
    const [userReputation, setUserReputation] = useState(0);
    const [userRole, setUserRole] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const fetchUserReputation = async () => {
        try {
            const response = await API.get('/auth/me');
            const data = response.data;
            if (data.success && data.user) {
                setUserReputation(data.user.reputation);
                setUserRole(data.user.role);
            }
        } catch (error) {
            console.error('Failed to fetch user reputation:', error);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const name = localStorage.getItem('userName');
        const userStr = localStorage.getItem('user');

        if (token && name) {
            setIsLoggedIn(true);
            setUserName(name);
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    setUserRole(user.role || 'user');
                } catch (e) {
                    console.error('Error parsing user', e);
                }
            }
            fetchUserReputation();
        } else {
            setIsLoggedIn(false);
            setUserName('');
            setUserReputation(0);
            setUserRole('');
        }
    }, [location]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        setMobileMenuOpen(false);
        navigate('/login');
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    const isAdmin = userRole === 'admin';

    return (
        <nav style={{ backgroundColor: '#0F172A' }} className="shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo, Brand and Tagline - admin link updated */}
                    <div className="flex items-center">
                        <Link
                            to={isLoggedIn ? (isAdmin ? "/admin/issues" : "/home") : "/login"}
                            className="flex items-center space-x-2"
                        >
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
                                    {/* Dashboard – visible only for non‑admins */}
                                    {!isAdmin && (
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
                                    )}

                                    {/* Admin Dashboard – visible only for admins */}
                                    {isAdmin && (
                                        <Link
                                            to="/admin/issues"
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/admin/issues')
                                                ? 'text-white'
                                                : 'text-gray-300 hover:text-white'
                                                }`}
                                            style={isActive('/admin/issues') ? { backgroundColor: '#FFA500' } : {}}
                                        >
                                            Admin Dashboard
                                        </Link>
                                    )}

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

                                    {/* Search Link */}
                                    <Link
                                        to="/search"
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/search')
                                            ? 'text-white'
                                            : 'text-gray-300 hover:text-white'
                                            }`}
                                        style={isActive('/search') ? { backgroundColor: '#FFA500' } : {}}
                                    >
                                        <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        Search
                                    </Link>

                                    {/* Map Link */}
                                    <Link
                                        to="/map"
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive('/map')
                                            ? 'text-white'
                                            : 'text-gray-300 hover:text-white'
                                            }`}
                                        style={isActive('/map') ? { backgroundColor: '#FFA500' } : {}}
                                    >
                                        Map
                                    </Link>

                                    {/* Authorities Link – different for admin vs regular user */}
                                    {!isAdmin && (
                                        <Link
                                            to="/authorities"
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/authorities')
                                                ? 'text-white'
                                                : 'text-gray-300 hover:text-white'
                                                }`}
                                            style={isActive('/authorities') ? { backgroundColor: '#FFA500' } : {}}
                                        >
                                            Authorities
                                        </Link>
                                    )}
                                    {isAdmin && (
                                        <Link
                                            to="/admin/authorities"
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/admin/authorities')
                                                ? 'text-white'
                                                : 'text-gray-300 hover:text-white'
                                                }`}
                                            style={isActive('/admin/authorities') ? { backgroundColor: '#FFA500' } : {}}
                                        >
                                            Manage Authorities
                                        </Link>
                                    )}

                                    {/* Profile Link - Regular users only */}
                                    {!isAdmin && (
                                        <Link
                                            to="/profile"
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/profile')
                                                ? 'text-white'
                                                : 'text-gray-300 hover:text-white'
                                                }`}
                                            style={isActive('/profile') ? { backgroundColor: '#FFA500' } : {}}
                                        >
                                            Rep. Profile
                                        </Link>
                                    )}

                                    {/* Reputation Management Link - Admin only */}
                                    {isAdmin && (
                                        <Link
                                            to="/admin/reputation"
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/admin/reputation')
                                                ? 'text-white'
                                                : 'text-gray-300 hover:text-white'
                                                }`}
                                            style={isActive('/admin/reputation') ? { backgroundColor: '#FFA500' } : {}}
                                        >
                                            Reputation
                                        </Link>
                                    )}

                                    <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-700">
                                        <div className="flex flex-col items-end">
                                            <span className="text-gray-300 text-sm">
                                                Hi, <span style={{ color: '#FFA500' }} className="font-semibold">{userName}</span>
                                            </span>
                                            {/* Reputation Badge - Regular users only */}
                                            {!isAdmin && (
                                                <div className="mt-1">
                                                    <UserReputation reputation={userReputation} size="small" />
                                                </div>
                                            )}
                                        </div>
                                        <NotificationBell />
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
                            <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                {mobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu – updated with admin & authorities links */}
            {mobileMenuOpen && (
                <div className="md:hidden" style={{ backgroundColor: '#0F172A' }}>
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {isLoggedIn ? (
                            <>
                                <div className="px-3 py-2 text-gray-300">
                                    Signed in as <span style={{ color: '#FFA500' }} className="font-semibold">{userName}</span>
                                </div>
                                {/* Reputation Badge in Mobile Menu - Regular users only */}
                                {!isAdmin && (
                                    <div className="px-3 py-2">
                                        <UserReputation reputation={userReputation} size="small" />
                                    </div>
                                )}
                                {/* Dashboard link – non‑admin only */}
                                {!isAdmin && (
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
                                )}
                                {/* Admin Issues link – admin only */}
                                {isAdmin && (
                                    <Link
                                        to="/admin/issues"
                                        className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/admin/issues')
                                            ? 'text-white'
                                            : 'text-gray-300 hover:text-white'
                                            }`}
                                        style={isActive('/admin/issues') ? { backgroundColor: '#FFA500' } : {}}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Admin Issues
                                    </Link>
                                )}
                                <Link
                                    to="/create-report"
                                    className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${isActive('/create-report')
                                        ? 'text-white'
                                        : 'text-gray-300 hover:text-white'
                                        }`}
                                    style={isActive('/create-report') ? { backgroundColor: '#FFA500' } : {}}
                                    onClick={() => setMobileMenuOpen(false)}
                                >

                                    Report Issue
                                </Link>
                                <Link
                                    to="/search"
                                    className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/search')
                                        ? 'text-white'
                                        : 'text-gray-300 hover:text-white'
                                        }`}
                                    style={isActive('/search') ? { backgroundColor: '#FFA500' } : {}}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Search Issues
                                </Link>
                                <Link
                                    to="/map"
                                    className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${isActive('/map')
                                        ? 'text-white'
                                        : 'text-gray-300 hover:text-white'
                                        }`}
                                    style={isActive('/map') ? { backgroundColor: '#FFA500' } : {}}
                                    onClick={() => setMobileMenuOpen(false)}
                                >

                                    City Map
                                </Link>
                                {/* Authorities links */}
                                {!isAdmin && (
                                    <Link
                                        to="/authorities"
                                        className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/authorities')
                                            ? 'text-white'
                                            : 'text-gray-300 hover:text-white'
                                            }`}
                                        style={isActive('/authorities') ? { backgroundColor: '#FFA500' } : {}}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Authorities Directory
                                    </Link>
                                )}
                                {isAdmin && (
                                    <Link
                                        to="/admin/authorities"
                                        className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/admin/authorities')
                                            ? 'text-white'
                                            : 'text-gray-300 hover:text-white'
                                            }`}
                                        style={isActive('/admin/authorities') ? { backgroundColor: '#FFA500' } : {}}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Manage Authorities
                                    </Link>
                                )}
                                {/* Profile Link in Mobile Menu - Regular users only */}
                                {!isAdmin && (
                                    <Link
                                        to="/profile"
                                        className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/profile')
                                            ? 'text-white'
                                            : 'text-gray-300 hover:text-white'
                                            }`}
                                        style={isActive('/profile') ? { backgroundColor: '#FFA500' } : {}}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        My Profile
                                    </Link>
                                )}
                                {/* Reputation Management Link in Mobile Menu - Admin only */}
                                {isAdmin && (
                                    <Link
                                        to="/admin/reputation"
                                        className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/admin/reputation')
                                            ? 'text-white'
                                            : 'text-gray-300 hover:text-white'
                                            }`}
                                        style={isActive('/admin/reputation') ? { backgroundColor: '#FFA500' } : {}}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Reputation Management
                                    </Link>
                                )}
                                {/* Existing Preferences Link - keep */}
                                <Link
                                    to="/preferences"
                                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-orange-600"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    🔔 Notification Settings
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