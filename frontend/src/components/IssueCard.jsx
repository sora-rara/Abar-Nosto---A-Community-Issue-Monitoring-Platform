import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import VoteButton from './VoteButton';
import CommentSection from './CommentSection';
import FollowButton from './FollowButton';
import ShareModal from './ShareModal';

const IssueCard = ({ issue, onUpdate }) => {
    const [expanded, setExpanded] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [userVote, setUserVote] = useState(null);
    const [upvoteCount, setUpvoteCount] = useState(0);
    const [downvoteCount, setDownvoteCount] = useState(0);
    const [showShareModal, setShowShareModal] = useState(false);


    // Calculate vote data when issue changes
    useEffect(() => {
        const currentUserId = localStorage.getItem('userId');

        // Set vote counts
        setUpvoteCount(issue.upvoteCount || issue.upvotes?.length || 0);
        setDownvoteCount(issue.downvoteCount || issue.downvotes?.length || 0);

        // Set user vote status
        if (!currentUserId || !issue) {
            setUserVote(null);
            return;
        }

        const hasUpvoted = issue.upvotes?.some(v => v.user?.toString() === currentUserId) || false;
        const hasDownvoted = issue.downvotes?.some(v => v.user?.toString() === currentUserId) || false;

        if (hasUpvoted) {
            setUserVote('up');
        } else if (hasDownvoted) {
            setUserVote('down');
        } else {
            setUserVote(null);
        }

        console.log('IssueCard vote data:', {
            upvoteCount: issue.upvoteCount,
            upvotesLength: issue.upvotes?.length,
            downvoteCount: issue.downvoteCount,
            downvotesLength: issue.downvotes?.length,
            userVote: hasUpvoted ? 'up' : (hasDownvoted ? 'down' : null)
        });
    }, [issue]);

    const getCategoryDetails = (category) => {
        const categories = {
            pothole: { color: 'bg-red-100 text-red-800', label: 'Pothole' },
            broken_light: { color: 'bg-yellow-100 text-yellow-800', label: 'Broken Light' },
            drainage: { color: 'bg-blue-100 text-blue-800', label: 'Drainage' },
            flooding: { color: 'bg-indigo-100 text-indigo-800', label: 'Flooding' },
            garbage: { color: 'bg-green-100 text-green-800', label: 'Garbage' },
            debris: { color: 'bg-orange-100 text-orange-800', label: 'Debris' },
            other: { color: 'bg-gray-100 text-gray-800', label: 'Other' }
        };
        return categories[category] || categories.other;
    };

    const getStatusDetails = (status) => {
        const statuses = {
            reported: { color: 'bg-red-500', label: 'Reported' },
            in_progress: { color: 'bg-yellow-500', label: 'In Progress' },
            resolved: { color: 'bg-green-500', label: 'Resolved' },
            archived: { color: 'bg-gray-500', label: 'Archived' }
        };
        return statuses[status] || statuses.reported;
    };

    const category = getCategoryDetails(issue.category);
    const status = getStatusDetails(issue.status);
    const formattedDate = new Date(issue.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const handleVoteUpdate = (data) => {
        console.log('Vote update received:', data);

        // Update local state based on vote result
        if (data.hasUpvoted) {
            setUserVote('up');
        } else if (data.hasDownvoted) {
            setUserVote('down');
        } else {
            setUserVote(null);
        }

        setUpvoteCount(data.upvoteCount);
        setDownvoteCount(data.downvoteCount);

        // Call parent update if needed
        if (onUpdate) {
            onUpdate();
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 hover:shadow-lg transition-shadow duration-300">
            {/* Header with Status Bar */}
            <div className={`h-2 ${status.color}`}></div>

            <div className="p-6">
                {/* Title and Category */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {issue.title}
                        </h3>
                        <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
                                {category.label}
                            </span>
                            <span className="text-sm text-gray-500">
                                Reported {formattedDate}
                            </span>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`px-3 py-1 rounded-full text-sm font-medium text-white ${status.color}`}>

                        {status.label}
                    </div>
                </div>

                {/* Description */}
                <p className="text-gray-700 mb-4 leading-relaxed">
                    {expanded ? issue.description : `${issue.description.substring(0, 200)}${issue.description.length > 200 ? '...' : ''}`}
                    {issue.description.length > 200 && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="ml-2 text-blue-600 hover:text-blue-800 font-medium"
                        >
                            {expanded ? 'Show less' : 'Read more'}
                        </button>
                    )}
                </p>

                {/* Location */}
                <div className="flex items-start space-x-2 mb-4 text-gray-600">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                    <span className="text-sm">{issue.location?.address || 'Location not specified'}</span>
                </div>

                {/* Photos if any */}
                {issue.photos && issue.photos.length > 0 && (
                    <div className="mb-4">
                        <div className="flex space-x-2 overflow-x-auto pb-2">
                            {issue.photos.map((photo, index) => (
                                <img
                                    key={index}
                                    src={photo.url}
                                    alt={`Issue ${index + 1}`}
                                    className="h-24 w-24 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400 transition cursor-pointer"
                                    onClick={() => window.open(photo.url, '_blank')}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-stretch space-x-4">
                        {/* Vote Button */}
                        <VoteButton
                            issueId={issue._id}
                            initialUpvotes={upvoteCount}
                            initialDownvotes={downvoteCount}
                            initialUserVote={userVote}
                            onUpdate={handleVoteUpdate}
                        />

                        {/* Comments Button */}
                        <button
                            onClick={() => setShowComments(!showComments)}
                            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#1B2D57] transition rounded-lg hover:bg-blue-50"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="font-medium">{issue.commentCount || issue.comments?.length || 0}</span>
                            <span className="text-sm hidden sm:inline">Comments</span>
                        </button>

                        {/* Share Button */}
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#1B2D57] transition rounded-lg hover:bg-blue-50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            <span className="text-sm">Share</span>
                        </button>

                        {/* ✅ Follow Button */}
                        <FollowButton issueId={issue._id} />
                    </div>

                    {/* View Details Link */}
                    <Link
                        to={`/complaint/${issue._id}`}
                        className="text-[#0F172A] hover:text-blue-900 font-medium flex items-center space-x-1"
                    >
                        <span>View Details</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

                {/* Comments Section */}
                {showComments && (
                    <div className="mt-6">
                        <CommentSection
                            issueId={issue._id}
                            initialComments={issue.comments || []}
                            onCommentAdded={() => {
                                if (onUpdate) onUpdate();
                            }}
                            onCommentUpdated={() => {
                                if (onUpdate) onUpdate();
                            }}
                            onCommentDeleted={() => {
                                if (onUpdate) onUpdate();
                            }}
                        />
                    </div>
                )}
                {/* 👈 ADD SHARE MODAL RIGHT HERE */}
                <ShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    issueId={issue._id}
                    issueTitle={issue.title}
                />
            </div>
        </div>
    );
};

export default IssueCard;