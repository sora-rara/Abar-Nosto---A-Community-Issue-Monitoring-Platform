import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';

const LiveActivityFeed = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const pollingInterval = useRef(null);

    useEffect(() => {
        fetchActivities(true);

        // Poll for new activities every 10 seconds
        pollingInterval.current = setInterval(() => {
            fetchLatestActivities();
        }, 10000);

        return () => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
        };
    }, [filter]);

    const fetchActivities = async (reset = true) => {
        try {
            setError(null);
            const token = localStorage.getItem('token');

            // Build URL with filters
            let url = `/issues/activities/feed?page=${reset ? 1 : page}&limit=10`;
            if (filter !== 'all') {
                url += `&type=${filter}`;
            }

            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await API.get(url, { headers });

            if (response.data.success) {
                if (reset) {
                    setActivities(response.data.data);
                    setPage(2);
                } else {
                    setActivities(prev => [...prev, ...response.data.data]);
                    setPage(prev => prev + 1);
                }
                setHasMore(response.data.data.length === 10);
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
            setError('Failed to load activity feed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchLatestActivities = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            let url = `/issues/activities/feed?limit=5&page=1`;
            if (filter !== 'all') {
                url += `&type=${filter}`;
            }

            const response = await API.get(url, { headers });

            if (response.data.success && response.data.data.length > 0) {
                const latestActivityId = activities[0]?._id;
                const newActivities = response.data.data.filter(
                    a => a._id !== latestActivityId
                );

                if (newActivities.length > 0) {
                    setActivities(prev => [...newActivities, ...prev]);
                }
            }
        } catch (error) {
            console.error('Error fetching latest activities:', error);
        }
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'new_issue':
                return (
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#3359B2]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                        </svg>
                    </div>
                );
            case 'new_comment':
                return (
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#2c928d]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3 1h10v2H5V6zm0 4h10v2H5v-2zm0 4h6v2H5v-2z" />
                        </svg>
                    </div>
                );
            case 'upvote':
                return (
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#2c928d]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                        </svg>
                    </div>
                );
            case 'downvote':
                return (
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                        </svg>
                    </div>
                );
            case 'status_update':
            case 'issue_resolved':
                return (
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    </div>
                );
        }
    };

    const getActivityText = (activity) => {
        switch (activity.type) {
            case 'new_issue':
                return 'reported a new issue';
            case 'new_comment':
                return 'commented on';
            case 'upvote':
                return 'upvoted';
            case 'downvote':
                return 'downvoted';
            case 'status_update':
                return 'updated status of';
            case 'issue_resolved':
                return 'resolved';
            default:
                return 'interacted with';
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-red-600">{error}</p>
                <button
                    onClick={() => fetchActivities(true)}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-[#3359B2] to-[#0F172A]">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Live Activity Feed</h2>
                    <div className="flex items-center space-x-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs text-gray-300">LIVE</span>
                    </div>
                </div>

                {/* Filter buttons */}
                <div className="flex flex-wrap gap-2 mt-3">
                    {['all', 'new_issue', 'new_comment', 'upvote', 'downvote', 'status_update'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-2 py-1 text-xs rounded-full transition ${filter === f
                                ? 'bg-white text-[#0F172A]'
                                : 'bg-[#1B2D57] text-white hover:bg-blue-400'
                                }`}
                        >
                            {f === 'all' ? 'All' : f.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="divide-y max-h-96 overflow-y-auto">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2">Loading activities...</p>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p>No recent activities</p>
                    </div>
                ) : (
                    activities.map((activity, index) => {
                        // Generate a truly unique key using multiple identifiers
                        const uniqueKey = `${activity._id || 'activity'}-${index}-${activity.createdAt || Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

                        return (
                            <Link
                                key={uniqueKey}
                                to={`/complaint/${activity.issue?._id || '#'}`}
                                className="block p-4 hover:bg-gray-50 transition"
                            >
                                <div className="flex items-start space-x-3">
                                    {getActivityIcon(activity.type)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-800">
                                            <span className="font-semibold">{activity.userName || 'Anonymous'}</span>
                                            {' '}
                                            <span className="text-gray-500">{getActivityText(activity)}</span>
                                            {' '}
                                            <span className="font-medium text-[#3359B2] hover:underline">
                                                {activity.issueTitle || 'Unknown issue'}
                                            </span>
                                        </p>
                                        {activity.content && activity.type === 'new_comment' && (
                                            <p className="text-xs text-gray-600 mt-1 italic">
                                                "{activity.content}"
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            {formatTime(activity.createdAt)}
                                        </p>
                                    </div>
                                    {activity.issueCategory && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full capitalize">
                                            {activity.issueCategory.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>

            {hasMore && !loading && activities.length > 0 && (
                <div className="p-4 border-t text-center">
                    <button
                        onClick={() => fetchActivities(false)}
                        className="text-sm text-[#3359B2] hover:text-blue-800 font-medium"
                    >
                        Load More
                    </button>
                </div>
            )}
        </div>
    );
};

export default LiveActivityFeed;