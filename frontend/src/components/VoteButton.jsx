import { useState, useEffect } from 'react';
import API from '../services/api';

const VoteButton = ({ issueId, initialUpvotes, initialDownvotes, initialUserVote, onUpdate }) => {
    const [upvotes, setUpvotes] = useState(0);
    const [downvotes, setDownvotes] = useState(0);
    const [userVote, setUserVote] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Initialize state when props change
    useEffect(() => {
        console.log('VoteButton received props:', {
            issueId,
            initialUpvotes,
            initialDownvotes,
            initialUserVote
        });

        setUpvotes(initialUpvotes || 0);
        setDownvotes(initialDownvotes || 0);
        setUserVote(initialUserVote || null);
    }, [initialUpvotes, initialDownvotes, initialUserVote, issueId]);

    const handleUpvote = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please login to vote');
                return;
            }

            const response = await API.post(
                `/issues/${issueId}/upvote`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                console.log('Upvote response:', response.data);
                setUpvotes(response.data.upvoteCount);
                setDownvotes(response.data.downvoteCount);
                setUserVote(response.data.hasUpvoted ? 'up' : null);

                if (onUpdate) {
                    onUpdate(response.data);
                }
            }
        } catch (error) {
            console.error('Upvote error:', error);
            setError(error.response?.data?.message || 'Failed to upvote');
        } finally {
            setLoading(false);
        }
    };

    const handleDownvote = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please login to vote');
                return;
            }

            const response = await API.post(
                `/issues/${issueId}/downvote`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                console.log('Downvote response:', response.data);
                setUpvotes(response.data.upvoteCount);
                setDownvotes(response.data.downvoteCount);
                setUserVote(response.data.hasDownvoted ? 'down' : null);

                if (onUpdate) {
                    onUpdate(response.data);
                }
            }
        } catch (error) {
            console.error('Downvote error:', error);
            setError(error.response?.data?.message || 'Failed to downvote');
        } finally {
            setLoading(false);
        }
    };

    const netVotes = upvotes - downvotes;

    return (
        <div className="flex flex-col items-center">
            <div className="flex items-center w-full">
                {/* Upvote Button */}
                <button
                    onClick={handleUpvote}
                    disabled={loading}
                    className={`
                        flex-1 flex items-center justify-center space-x-2
                        px-4 py-2 rounded-l-lg
                        transition-all duration-200
                        ${userVote === 'up'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'
                        }
                        ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        border-2 border-r-0 border-gray-200
                        focus:outline-none focus:ring-2 focus:ring-green-200
                    `}
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    <span className="font-bold">{upvotes}</span>
                </button>

                {/* Net Vote Display */}
                <div className="px-4 py-2 bg-[#0F172A] text-white font-bold text-lg min-w-[70px] text-center">
                    {netVotes > 0 ? `+${netVotes}` : netVotes}
                </div>

                {/* Downvote Button */}
                <button
                    onClick={handleDownvote}
                    disabled={loading}
                    className={`
                        flex-1 flex items-center justify-center space-x-2
                        px-4 py-2 rounded-r-lg
                        transition-all duration-200
                        ${userVote === 'down'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700'
                        }
                        ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        border-2 border-l-0 border-gray-200
                        focus:outline-none focus:ring-2 focus:ring-red-200
                    `}
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                    </svg>
                    <span className="font-bold">{downvotes}</span>
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
            )}

            {/* Vote Status */}
            <p className="text-sm text-gray-500 mt-2">
                {userVote === 'up' && 'You upvoted this issue'}
                {userVote === 'down' && 'You downvoted this issue'}
                {!userVote && 'Click to vote'}
            </p>
        </div>
    );
};

export default VoteButton;