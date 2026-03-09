import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import IssueCard from './IssueCard';
import LiveActivityFeed from './LiveActivityFeed';

const UpDashboard = () => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');
    const [userInitial, setUserInitial] = useState('');
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        resolved: 0,
        inProgress: 0,
        reported: 0
    });
    const [filters, setFilters] = useState({
        category: 'all',
        status: 'all',
        sort: 'recent'
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        const name = localStorage.getItem('userName') || 'User';
        if (!token) {
            navigate('/login');
        } else {
            setUserName(name);
            setUserInitial(name.charAt(0).toUpperCase());
            fetchIssues();
        }
    }, [navigate]);

    const fetchIssues = async () => {
        try {
            const token = localStorage.getItem('token');
            let url = 'http://localhost:5000/api/issues';
            
            const params = new URLSearchParams();
            if (filters.category !== 'all') params.append('category', filters.category);
            if (filters.status !== 'all') params.append('status', filters.status);
            if (filters.sort === 'popular') params.append('sort', '-upvoteCount');
            else if (filters.sort === 'recent') params.append('sort', '-createdAt');
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setIssues(response.data);
            
            // Calculate stats
            const total = response.data.length;
            const resolved = response.data.filter(i => i.status === 'resolved').length;
            const inProgress = response.data.filter(i => i.status === 'in_progress').length;
            const reported = response.data.filter(i => i.status === 'reported').length;
            
            setStats({ total, resolved, inProgress, reported });
        } catch (error) {
            console.error('Error fetching issues:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {/* Logo/Brand */}
                            <Link to="/home" className="text-2xl font-bold tracking-tight">
                                ABAR NOSTO!
                            </Link>
                            <span className="text-blue-200 text-sm hidden md:inline">
                                Community Issue Monitoring Platform
                            </span>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* REMOVED: Report Issue Link */}

                            {/* User Menu */}
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-blue-300">
                                    {userInitial}
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-sm font-medium">{userName}</p>
                                    <button
                                        onClick={handleLogout}
                                        className="text-xs text-blue-200 hover:text-white transition"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        Welcome back, {userName}!
                    </h1>
                    <p className="text-gray-600">
                        Track and discuss community issues in your area. Your voice matters! Let's heal the world.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                        <p className="text-sm text-gray-600 mb-1">Total Issues</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                        <p className="text-sm text-gray-600 mb-1">Reported</p>
                        <p className="text-3xl font-bold text-yellow-600">{stats.reported}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-400">
                        <p className="text-sm text-gray-600 mb-1">In Progress</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                        <p className="text-sm text-gray-600 mb-1">Resolved</p>
                        <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Issues List */}
                    <div className="lg:col-span-2">
                        {/* Filters Bar */}
                        <div className="bg-white rounded-lg shadow p-4 mb-6">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <h3 className="font-semibold text-gray-700">Filter Issues</h3>
                                <div className="flex flex-wrap gap-3">
                                    <select
                                        value={filters.category}
                                        onChange={(e) => setFilters({...filters, category: e.target.value})}
                                        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                                    >
                                        <option value="all">All Categories</option>
                                        <option value="pothole">Pothole</option>
                                        <option value="broken_light">Broken Light</option>
                                        <option value="drainage">Drainage</option>
                                        <option value="flooding">Flooding</option>
                                        <option value="garbage">Garbage</option>
                                        <option value="debris">Debris</option>
                                        <option value="other">Other</option>
                                    </select>

                                    <select
                                        value={filters.status}
                                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                                        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="reported">Reported</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                    </select>

                                    <select
                                        value={filters.sort}
                                        onChange={(e) => setFilters({...filters, sort: e.target.value})}
                                        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                                    >
                                        <option value="recent">Most Recent</option>
                                        <option value="popular">Most Popular</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Issues List */}
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Loading issues...</p>
                            </div>
                        ) : issues.length === 0 ? (
                            <div className="bg-white rounded-lg shadow p-12 text-center">
                                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">No issues found</h3>
                                <p className="text-gray-500 mb-6">Check back later for community issues in your area.</p>
                                {/* REMOVED: Report an Issue button */}
                            </div>
                        ) : (
                            <div>
                                {issues.map(issue => (
                                    <IssueCard 
                                        key={issue._id} 
                                        issue={{
                                            ...issue,
                                            hasUserUpvoted: issue.upvotes?.some(
                                                u => u.user === localStorage.getItem('userId')
                                            )
                                        }} 
                                        onUpdate={fetchIssues}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Activity Feed */}
                    <div className="lg:col-span-1">
                        <LiveActivityFeed />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UpDashboard;