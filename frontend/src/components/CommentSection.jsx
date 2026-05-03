import { useState, useEffect } from 'react';
import API from '../services/api';
// Helper function to decode JWT token
const decodeToken = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

const CommentSection = ({ issueId, initialComments, onCommentAdded, onCommentUpdated, onCommentDeleted }) => {
    const [comments, setComments] = useState(initialComments || []);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);

    // Get current user ID from token on component mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded = decodeToken(token);
            // The user ID might be under different names depending on your JWT payload
            // Common names: id, userId, sub, _id
            const userId = decoded?.id || decoded?.userId || decoded?.sub || decoded?._id;
            setCurrentUserId(userId);
            console.log('Current User ID from token:', userId);
            console.log('Full decoded token:', decoded);
        }
    }, []);

    // Update comments when initialComments changes
    useEffect(() => {
        setComments(initialComments || []);
        console.log('Comments loaded:', initialComments);

        // Log each comment's user ID for debugging
        if (initialComments && initialComments.length > 0) {
            initialComments.forEach((comment, index) => {
                console.log(`Comment ${index} - ID: ${comment._id}, User:`, comment.user);
            });
        }
    }, [initialComments]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await API.post(
                `/issues/${issueId}/comments`,
                { text: newComment },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                const newCommentObj = {
                    ...response.data.comment,
                    user: response.data.comment.user || currentUserId
                };

                setComments(prev => [newCommentObj, ...prev]);
                setNewComment('');

                if (onCommentAdded) {
                    onCommentAdded(newCommentObj);
                }
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            setError('Failed to post comment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = async (commentId) => {
        if (!editText.trim()) return;

        try {
            const token = localStorage.getItem('token');
            console.log('Editing comment:', { issueId, commentId, editText });

            const response = await API.put(
                `/issues/${issueId}/comments/${commentId}`,
                { text: editText },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setComments(prev => prev.map(c =>
                    c._id === commentId ? response.data.comment : c
                ));
                setEditingId(null);
                setEditText('');

                if (onCommentUpdated) {
                    onCommentUpdated(response.data.comment);
                }
            }
        } catch (error) {
            console.error('Error editing comment:', error);
            console.error('Error response:', error.response?.data);
            setError(error.response?.data?.message || 'Failed to edit comment. Please try again.');
        }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;

        setDeletingId(commentId);

        try {
            const token = localStorage.getItem('token');
            console.log('Deleting comment:', { issueId, commentId });

            await API.delete(
                `/issues/${issueId}/comments/${commentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setComments(prev => prev.filter(c => c._id !== commentId));

            if (onCommentDeleted) {
                onCommentDeleted(commentId);
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            console.error('Error response:', error.response?.data);
            setError('Failed to delete comment. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    const startEditing = (comment) => {
        setEditingId(comment._id);
        setEditText(comment.text);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditText('');
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    };

    // Check if user owns the comment
    const isCommentOwner = (comment) => {
        if (!currentUserId || !comment.user) {
            console.log('Missing data:', { currentUserId, commentUser: comment.user });
            return false;
        }

        // Handle both string and object formats
        let commentUserId;
        if (typeof comment.user === 'object') {
            commentUserId = comment.user._id || comment.user.id;
        } else {
            commentUserId = comment.user;
        }

        // Convert both to strings for comparison
        const commentIdStr = commentUserId?.toString();
        const currentIdStr = currentUserId?.toString();

        console.log('Ownership check:', {
            commentUserId: commentIdStr,
            currentUserId: currentIdStr,
            isMatch: commentIdStr === currentIdStr
        });

        return commentIdStr === currentIdStr;
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800">
                    Discussion ({comments.length})
                </h3>
            </div>

            {/* Add Comment Form */}
            <div className="p-4 border-b">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your thoughts here..."
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                        rows="3"
                        maxLength="1000"
                    />
                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting || !newComment.trim()}
                            className="px-6 py-2 bg-[#1B2D57] text-white rounded-lg hover:bg-[#0F172A] disabled:bg-blue-300 transition"
                        >
                            {submitting ? 'Posting...' : 'Post Comment'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Comments List */}
            <div className="divide-y max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p>No comments yet. Be the first to share your thoughts!</p>
                    </div>
                ) : (
                    comments.map((comment) => {
                        const isOwner = isCommentOwner(comment);

                        return (
                            <div key={comment._id} className="p-4 hover:bg-gray-50 transition group">
                                {editingId === comment._id ? (
                                    /* Edit Mode */
                                    <div className="space-y-3">
                                        <textarea
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            rows="3"
                                            maxLength="1000"
                                        />
                                        <div className="flex space-x-2 justify-end">
                                            <button
                                                onClick={() => handleEdit(comment._id)}
                                                disabled={!editText.trim()}
                                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* View Mode */
                                    <div>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                    {comment.userName?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-800">
                                                        {comment.userName || 'Anonymous'}
                                                    </span>
                                                    <span className="text-xs text-gray-400 ml-2">
                                                        {formatDate(comment.createdAt)}
                                                    </span>
                                                    {comment.isEdited && (
                                                        <span className="text-xs text-gray-400 ml-2 italic">
                                                            (edited)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Comment Actions - Only for comment owner */}
                                            {isOwner && (
                                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEditing(comment)}
                                                        className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50"
                                                        title="Edit comment"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(comment._id)}
                                                        disabled={deletingId === comment._id}
                                                        className="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                                                        title="Delete comment"
                                                    >
                                                        {deletingId === comment._id ? (
                                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <p className="mt-2 text-gray-700 whitespace-pre-wrap">
                                            {comment.text}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default CommentSection;