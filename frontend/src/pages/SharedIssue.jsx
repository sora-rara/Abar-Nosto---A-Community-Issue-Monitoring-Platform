import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';

const SharedIssue = () => {
    const { id } = useParams();
    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSharedIssue();
    }, [id]);

    const fetchSharedIssue = async () => {
        try {
            const response = await API.get(`/search/public/${id}`);
            setIssue(response.data.report);
        } catch (error) {
            console.error('Error fetching shared issue:', error);
            setError('Issue not found or has been removed');
        } finally {
            setLoading(false);
        }
    };

    const getCategoryDetails = (category) => {
        const categories = {
            pothole: { color: 'bg-red-100 text-red-800', icon: '🕳️', label: 'Pothole' },
            broken_light: { color: 'bg-yellow-100 text-yellow-800', icon: '💡', label: 'Broken Light' },
            drainage: { color: 'bg-blue-100 text-blue-800', icon: '🌊', label: 'Drainage' },
            flooding: { color: 'bg-indigo-100 text-indigo-800', icon: '💧', label: 'Flooding' },
            garbage: { color: 'bg-green-100 text-green-800', icon: '🗑️', label: 'Garbage' },
            debris: { color: 'bg-orange-100 text-orange-800', icon: '🌿', label: 'Debris' },
            other: { color: 'bg-gray-100 text-gray-800', icon: '📌', label: 'Other' }
        };
        return categories[category] || categories.other;
    };

    const getStatusDetails = (status) => {
        const statuses = {
            reported: { color: 'bg-blue-500', label: 'Reported', icon: '📌' },
            in_progress: { color: 'bg-yellow-500', label: 'In Progress', icon: '🔄' },
            resolved: { color: 'bg-green-500', label: 'Resolved', icon: '✅' }
        };
        return statuses[status] || statuses.reported;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading issue...</p>
                </div>
            </div>
        );
    }

    if (error || !issue) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{error || 'Issue Not Found'}</h2>
                    <Link to="/" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const category = getCategoryDetails(issue.category);
    const status = getStatusDetails(issue.status);
    const formattedDate = new Date(issue.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-6">
                <Link to="/" className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Abar Nosto
                </Link>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Status Bar */}
                <div className={`h-2 ${status.color}`}></div>
                
                <div className="p-8">
                    {/* Title and Meta */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
                                <span className="mr-1">{category.icon}</span>
                                {category.label}
                            </span>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${status.color}`}>
                                <span className="mr-1">{status.icon}</span>
                                {status.label}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-3">{issue.title}</h1>
                        <p className="text-gray-500 text-sm">
                            Reported on {formattedDate} • {issue.viewCount || 0} views
                        </p>
                    </div>

                    {/* Description */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {issue.description}
                        </p>
                    </div>

                    {/* Location */}
                    {issue.location && (
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Location</h2>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <p className="text-gray-700">{issue.location.address || 'Location not specified'}</p>
                                </div>
                                {issue.location.lat && issue.location.lng && (
                                    <div className="mt-2 text-sm text-gray-500">
                                        Coordinates: {issue.location.lat.toFixed(6)}, {issue.location.lng.toFixed(6)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Photos */}
                    {issue.photos && issue.photos.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Photos</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {issue.photos.map((photo, index) => (
                                    <img
                                        key={index}
                                        src={photo.url}
                                        alt={`Issue photo ${index + 1}`}
                                        className="rounded-lg object-cover w-full h-48 cursor-pointer hover:opacity-90 transition"
                                        onClick={() => window.open(photo.url, '_blank')}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-6 pt-6 border-t">
                        <div className="flex items-center gap-2">
                            <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                            </svg>
                            <span className="font-semibold text-gray-900">{issue.upvoteCount || 0}</span>
                            <span className="text-gray-500">upvotes</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="font-semibold text-gray-900">{issue.commentCount || 0}</span>
                            <span className="text-gray-500">comments</span>
                        </div>
                    </div>

                    {/* Call to Action */}
                    <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">See something like this?</h3>
                        <p className="text-gray-600 mb-4">Join the community to report issues, upvote, and comment</p>
                        <Link
                            to="/register"
                            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                        >
                            Join Abar Nosto
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SharedIssue;