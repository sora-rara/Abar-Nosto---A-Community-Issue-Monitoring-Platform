import { Link } from 'react-router-dom';

const SimilarIssuesCard = ({ issue, onViewDetails }) => {
    // Function to get status color and icon
    const getStatusInfo = (status) => {
        switch (status) {
            case 'in_progress':
                return {
                    bg: 'bg-yellow-100',
                    text: 'text-yellow-800',
                    border: 'border-yellow-200',
                    label: 'In Progress',
                    icon: '🔄'
                };
            case 'resolved':
                return {
                    bg: 'bg-green-100',
                    text: 'text-green-800',
                    border: 'border-green-200',
                    label: 'Resolved',
                    icon: '✅'
                };
            default:
                return {
                    bg: 'bg-blue-100',
                    text: 'text-blue-800',
                    border: 'border-blue-200',
                    label: 'Reported',
                    icon: '📌'
                };
        }
    };

    // Format distance
    const formatDistance = (meters) => {
        if (meters < 1000) {
            return `${Math.round(meters)}m away`;
        } else {
            return `${(meters / 1000).toFixed(1)}km away`;
        }
    };

    // Format time ago
    const timeAgo = (date) => {
        const now = new Date();
        const past = new Date(date);
        const diffInSeconds = Math.floor((now - past) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        return past.toLocaleDateString();
    };

    const statusInfo = getStatusInfo(issue.status);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="p-5">
                {/* Header with upvotes and status */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        {/* Upvotes */}
                        <div className="flex items-center space-x-1">
                            <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                            </svg>
                            <span className="font-medium text-gray-900">{issue.upvoteCount || 0}</span>
                        </div>

                        {/* Status Badge */}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                            <span className="mr-1">{statusInfo.icon}</span>
                            {statusInfo.label}
                        </span>
                    </div>
                </div>

                {/* Issue Title */}
                <h3 className="text-base font-semibold text-gray-900 mb-3 line-clamp-2">
                    {issue.title}
                </h3>

                {/* Location and Time Info - Grid layout as in image */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    <div className="flex items-center text-gray-600">
                        <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{issue.distance ? formatDistance(issue.distance) : 'Location nearby'}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                        <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{timeAgo(issue.createdAt)}</span>
                    </div>
                </div>

                {/* View Details Button - Exactly as in image */}
                <button
                    onClick={() => onViewDetails(issue._id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 group border border-gray-100"
                >
                    <span className="text-sm font-medium text-blue-600">View details</span>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default SimilarIssuesCard;