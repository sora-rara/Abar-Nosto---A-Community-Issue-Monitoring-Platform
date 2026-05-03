import { useState, useEffect } from 'react';
import API from '../services/api';

const FollowButton = ({ issueId }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchFollowStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await API.get('/follows/my-follows', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const follows = response.data.data;
                setIsFollowing(follows.some(f => f.issue._id === issueId));
            } catch (error) {
                console.error('Error fetching follow status:', error);
            }
        };
        if (issueId) fetchFollowStatus();
    }, [issueId]);

    const toggleFollow = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (isFollowing) {
                await API.delete(`/follows/${issueId}/unfollow`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsFollowing(false);
            } else {
                await API.post(`/follows/${issueId}/follow`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsFollowing(true);
            }
        } catch (err) {
            console.error('Follow error:', err);
            alert(err.response?.data?.message || 'Failed to update follow status');
        } finally {
            setLoading(false);
        }
    };

    // ✅ Visible button styles
    const buttonStyle = {
        backgroundColor: isFollowing ? '#ef4444' : '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 20px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'background-color 0.2s',
        width: '100%',
        marginTop: '8px'
    };

    return (
        <button
            onClick={toggleFollow}
            disabled={loading}
            className={`px-3 py-2 rounded-lg text-white font-medium transition-colors duration-200 disabled:opacity-50
        ${isFollowing
                    ? 'bg-[#FFA500] hover:bg-[#e69500]'
                    : 'bg-[#0F172A] hover:bg-[#1E293B]'
                }`}
        >
            {loading ? '...' : (isFollowing ? 'Unfollow' : 'Follow')}
        </button>
    );
};

export default FollowButton;