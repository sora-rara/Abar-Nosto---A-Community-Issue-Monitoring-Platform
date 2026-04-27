import { useState, useEffect } from 'react';
import axios from 'axios';

const FollowButton = ({ issueId }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchFollowStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/follows/my-follows', {
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
                await axios.delete(`/api/follows/${issueId}/unfollow`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsFollowing(false);
            } else {
                await axios.post(`/api/follows/${issueId}/follow`, {}, {
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
            style={buttonStyle}
            onMouseEnter={(e) => {
                if (!loading) {
                    e.currentTarget.style.backgroundColor = isFollowing ? '#dc2626' : '#2563eb';
                }
            }}
            onMouseLeave={(e) => {
                if (!loading) {
                    e.currentTarget.style.backgroundColor = isFollowing ? '#ef4444' : '#3b82f6';
                }
            }}
        >
            {loading ? '...' : (isFollowing ? 'Unfollow' : 'Follow')}
        </button>
    );
};

export default FollowButton;