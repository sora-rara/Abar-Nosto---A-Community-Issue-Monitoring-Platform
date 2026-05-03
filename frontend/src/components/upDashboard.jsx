import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../services/api';
import IssueCard from './IssueCard';
import LiveActivityFeed from './LiveActivityFeed';
import dhakaData from './dhaka-borders.json';

const UpDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation(); // <-- Added to read the URL
    const [userName, setUserName] = useState('');
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [highlightId, setHighlightId] = useState(null); // <-- Added to track the highlighted issue

    const [stats, setStats] = useState({
        total: 0,
        reported: 0,
        inProgress: 0,
        resolved: 0,
        archived: 0
    });
    const [filters, setFilters] = useState({
        category: 'all',
        status: 'all',
        sort: 'recent',
        ward: 'all',
        area: 'all'
    });

    // Redirect if not logged in
    useEffect(() => {
        const token = localStorage.getItem('token');
        const name = localStorage.getItem('userName') || 'User';
        if (!token) {
            navigate('/login');
        } else {
            setUserName(name);
            fetchStats(); // fetch stats once on mount
        }
    }, [navigate]);

    // Fetch issues whenever filters change
    useEffect(() => {
        fetchIssues();
    }, [filters]);

    // --- NEW: THE MAP-TO-DASHBOARD HIGHLIGHT LOGIC ---
    useEffect(() => {
        // Look at the URL for "?highlight=12345"
        const queryParams = new URLSearchParams(location.search);
        const highlightedIssueId = queryParams.get('highlight');

        // If we found an ID in the URL, and the issues have finished loading...
        if (highlightedIssueId && issues.length > 0) {
            setHighlightId(highlightedIssueId);

            // Wait a tiny fraction of a second for the browser to draw the list
            setTimeout(() => {
                const targetElement = document.getElementById(`issue-${highlightedIssueId}`);
                if (targetElement) {
                    // Scroll smoothly to the issue and put it in the center of the screen
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Optional: remove the highlight effect after 5 seconds
                    setTimeout(() => setHighlightId(null), 5000);
                }
            }, 300);
        }
    }, [location.search, issues]);
    // --------------------------------------------------

    const fetchIssues = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            let url = '/issues';

            // 1. Send Category and Status to the backend
            const params = new URLSearchParams();
            if (filters.category !== 'all') params.append('category', filters.category);
            if (filters.status !== 'all') params.append('status', filters.status);

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await API.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let processedIssues = Array.isArray(response.data.data)
                ? response.data.data
                : Array.isArray(response.data)
                    ? response.data
                    : [];

            // 2. Frontend Ward & Area Filter
            if (filters.area !== 'all') {
                processedIssues = processedIssues.filter(issue => {
                    const address = issue.location?.address?.toLowerCase() || '';
                    return address.includes(filters.area.toLowerCase());
                });
            } else if (filters.ward !== 'all') {
                const areasInThisWard = dhakaData
                    .filter(item => item.ward === filters.ward)
                    .map(item => item.area_name.en.toLowerCase());

                processedIssues = processedIssues.filter(issue => {
                    const address = issue.location?.address?.toLowerCase() || '';
                    return areasInThisWard.some(area => address.includes(area));
                });
            }

            // 3. Exclude archived when "All Status" is selected
            if (filters.status === 'all') {
                processedIssues = processedIssues.filter(issue => issue.status !== 'archived');
            }

            // 4. Sorting (Most Recent or Most Popular)
            if (filters.sort === 'popular') {
                processedIssues.sort((a, b) => {
                    const aVotes = a.upvoteCount || (a.upvotes ? a.upvotes.length : 0);
                    const bVotes = b.upvoteCount || (b.upvotes ? b.upvotes.length : 0);
                    return bVotes - aVotes;
                });
            } else {
                processedIssues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }

            setIssues(processedIssues);
        } catch (error) {
            console.error('Error fetching issues:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await API.get('/issues/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setStats({
                    total: response.data.total,
                    reported: response.data.reported,
                    inProgress: response.data.inProgress,
                    resolved: response.data.resolved,
                    archived: response.data.archived
                });
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        navigate('/login');
    };

    // --- CASCADING DROPDOWN LOGIC ---
    // 1. Get a list of unique, sorted ward numbers
    const uniqueWards = [...new Set(dhakaData.map(item => item.ward))]
        .sort((a, b) => parseInt(a) - parseInt(b));

    // 2. Get the specific areas for the currently selected ward
    const availableAreas = filters.ward === 'all'
        ? []
        : dhakaData
            .filter(item => item.ward === filters.ward)
            .map(item => item.area_name.en);

    return (
        <div className="min-h-screen bg-gray-50">
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

                {/* Stats Cards - includes Archived */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
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
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-500">
                        <p className="text-sm text-gray-600 mb-1">Archived</p>
                        <p className="text-3xl font-bold text-gray-600">{stats.archived}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Issues List */}
                    <div className="lg:col-span-2">
                        {/* Filters Bar */}
                        <div className="bg-white rounded-lg shadow p-4 mb-6">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <h3 className="font-semibold text-gray-700">Filter Issues</h3>
                                <div className="flex flex-wrap gap-3">
                                    {/* WARD DROPDOWN */}
                                    <select
                                        value={filters.ward}
                                        onChange={(e) => setFilters({ ...filters, ward: e.target.value, area: 'all' })}
                                        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                                    >
                                        <option value="all">All Wards</option>
                                        {uniqueWards.map(wardNum => (
                                            <option key={`ward-${wardNum}`} value={wardNum}>
                                                Ward {wardNum}
                                            </option>
                                        ))}
                                    </select>

                                    {/* AREA DROPDOWN (Cascading) */}
                                    <select
                                        value={filters.area}
                                        onChange={(e) => setFilters({ ...filters, area: e.target.value })}
                                        disabled={filters.ward === 'all'}
                                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm ${filters.ward === 'all' ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'}`}
                                    >
                                        <option value="all">All Areas</option>
                                        {availableAreas.map((areaName, idx) => (
                                            <option key={`area-${idx}`} value={areaName}>
                                                {areaName}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={filters.category}
                                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
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
                                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="reported">Reported</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="archived">Archived</option>
                                    </select>

                                    <select
                                        value={filters.sort}
                                        onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
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
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {issues.map(issue => (
                                    /* NEW: Wrapper div adds the ID and the orange glowing border if highlighted */
                                    <div
                                        key={issue._id}
                                        id={`issue-${issue._id}`}
                                        className={`transition-all duration-1000 ${highlightId === issue._id
                                            ? 'ring-4 ring-orange-500 shadow-2xl scale-[1.01] rounded-xl z-10 relative bg-orange-50/20'
                                            : ''
                                            }`}
                                    >
                                        <IssueCard
                                            issue={{
                                                ...issue,
                                                hasUserUpvoted: issue.upvotes?.some(
                                                    u => u.user === localStorage.getItem('userId')
                                                )
                                            }}
                                            onUpdate={fetchIssues}
                                        />
                                    </div>
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