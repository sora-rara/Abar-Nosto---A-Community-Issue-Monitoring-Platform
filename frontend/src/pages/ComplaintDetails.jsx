import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import VoteButton from '../components/VoteButton';
import CommentSection from '../components/CommentSection';
import FollowButton from '../components/FollowButton';

const ComplaintDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [upvoteCount, setUpvoteCount] = useState(0);
    const [downvoteCount, setDownvoteCount] = useState(0);
    const [userVote, setUserVote] = useState(null);
    // Admin specific states
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminIssueId, setAdminIssueId] = useState(null);
    const [statusUpdate, setStatusUpdate] = useState({ status: '', comment: '' });
    const [updating, setUpdating] = useState(false);
    const [reopenRequested, setReopenRequested] = useState(false); // existing

    // ---- Added from second file ----
    const [requestingUpdate, setRequestingUpdate] = useState(false);
    const [updateRequestMessage, setUpdateRequestMessage] = useState('');
    // -------------------------------

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && (user.isAdmin || user.role === 'admin')) {
            setIsAdmin(true);
        }
        fetchComplaintDetails();
    }, [id]);

    const fetchComplaintDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await API.get(`/issues/${id}`);

            const data = response.data;

            const upvotes = data.upvotes?.length || 0;
            const downvotes = data.downvotes?.length || 0;

            const currentUserId = localStorage.getItem('userId');
            let userVoteStatus = null;

            if (currentUserId) {
                const hasUpvoted = data.upvotes?.some(v => v.user?.toString() === currentUserId) || false;
                const hasDownvoted = data.downvotes?.some(v => v.user?.toString() === currentUserId) || false;

                if (hasUpvoted) userVoteStatus = 'up';
                else if (hasDownvoted) userVoteStatus = 'down';
            }

            setUpvoteCount(upvotes);
            setDownvoteCount(downvotes);
            setUserVote(userVoteStatus);

            setComplaint({
                ...data,
                upvoteCount: upvotes,
                downvoteCount: downvotes,
                userVote: userVoteStatus
            });

            setReopenRequested(data.reopenRequested || false); // existing

            // If admin, fetch the admin issue ID for status updates
            if (isAdmin) {
                await fetchAdminIssueId(data._id);
            }
        } catch (error) {
            console.error('Error fetching complaint:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAdminIssueId = async (reportId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await API.get(`/admin/issues/by-report/${reportId}`);
            if (res.data.success) {
                setAdminIssueId(res.data.data._id);
            }
        } catch (err) {
            console.error('Failed to fetch admin issue:', err);
        }
    };

    const handleAdminStatusUpdate = async () => {
        if (!statusUpdate.status || !statusUpdate.comment) {
            alert('Please select a status and enter a comment');
            return;
        }
        setUpdating(true);
        try {
            const token = localStorage.getItem('token');
            await API.put(`/admin/issues/${adminIssueId}/status`, {
                status: statusUpdate.status, comment: statusUpdate.comment
            });
            alert('Status updated successfully');
            fetchComplaintDetails();
            setStatusUpdate({ status: '', comment: '' });
        } catch (err) {
            alert(err.response?.data?.message || 'Update failed');
        } finally {
            setUpdating(false);
        }
    };

    const handleReactivate = async () => {
        if (!window.confirm('Reactivate this archived issue? It will become active again.')) return;
        setUpdating(true);
        try {
            const token = localStorage.getItem('token');
            await API.patch(`/admin/issues/${adminIssueId}/reactivate`);
            alert('Issue reactivated');
            fetchComplaintDetails();
        } catch (err) {
            alert(err.response?.data?.message || 'Reactivate failed');
        } finally {
            setUpdating(false);
        }
    };

    const handleRequestReopen = async () => {
        if (reopenRequested) return;
        if (!window.confirm('Request to reopen this issue? Admins will be notified.')) return;
        try {
            const token = localStorage.getItem('token');
            await API.post(`/issues/${id}/request-reopen`);
            alert('Reopen request sent to admin');
            setReopenRequested(true);
            fetchComplaintDetails(); // refresh to update any backend state
        } catch (err) {
            alert(err.response?.data?.message || 'Request failed');
        }
    };

    // ---- Added from second file ----
    const handleRequestUpdate = async () => {
        setRequestingUpdate(true);
        setUpdateRequestMessage('');
        try {
            const token = localStorage.getItem('token');
            const response = await API.post(`/issues/${id}/request-update`);
            setUpdateRequestMessage(response.data.message);
            setTimeout(() => setUpdateRequestMessage(''), 5000);
        } catch (error) {
            console.error('Failed to request update:', error);
            setUpdateRequestMessage('Failed to send request. Please try again later.');
            setTimeout(() => setUpdateRequestMessage(''), 5000);
        } finally {
            setRequestingUpdate(false);
        }
    };
    // -------------------------------

    const formatStatusLabel = (status) => {
        switch (status) {
            case 'reopen_requested': return 'Reopen Requested';
            default: return status?.replace('_', ' ')?.replace(/\b\w/g, l => l.toUpperCase());
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!complaint) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Complaint Not Found</h2>
                    <Link to="/dashboard" className="text-blue-600 hover:underline">Return to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">COMPLAINT DETAILS</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Complaint Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Complaint Header */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="bg-blue-600 px-6 py-4">
                                <h2 className="text-xl font-semibold text-white">
                                    Complaint ID No. : {complaint.complaintNumber || id}
                                </h2>
                            </div>
                            <div className="p-6">
                                {/* Location Section */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Complaint Location</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-gray-700">{complaint.location?.address}</p>
                                        <div className="flex items-center mt-2 text-sm text-gray-500">
                                            <span>Uploaded by: {complaint.reporterName}</span>
                                            <span className="mx-2">•</span>
                                            <span>Upload Time: {new Date(complaint.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                {complaint.contactInfo && (complaint.contactInfo.email || complaint.contactInfo.phone) && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Contact Info</h3>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            {complaint.contactInfo.phone && <p className="text-gray-700">📞 {complaint.contactInfo.phone}</p>}
                                            {complaint.contactInfo.email && <p className="text-gray-700 mt-1">✉️ {complaint.contactInfo.email}</p>}
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Description</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-gray-700 leading-relaxed">{complaint.description}</p>
                                    </div>
                                </div>

                                {/* Uploaded Files */}
                                {complaint.photos && complaint.photos.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Uploaded Files</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {complaint.photos.map((photo, index) => (
                                                <div key={index} className="relative group">
                                                    <img
                                                        src={photo.url}
                                                        alt={`Upload ${index + 1}`}
                                                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-400 transition cursor-pointer"
                                                        onClick={() => window.open(photo.url, '_blank')}
                                                    />
                                                    <span className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                                        jpg/jpeg/png
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Discussion Section */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="bg-blue-600 px-6 py-4">
                                <h2 className="text-xl font-semibold text-white">Discussion</h2>
                            </div>
                            <div className="p-6">
                                <CommentSection
                                    issueId={complaint._id}
                                    initialComments={complaint.comments || []}
                                    onCommentAdded={fetchComplaintDetails}
                                    onCommentUpdated={fetchComplaintDetails}
                                    onCommentDeleted={fetchComplaintDetails}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Status & Meta Info */}
                    <div className="space-y-6">
                        {/* Complaint Type Card */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="bg-blue-600 px-6 py-4">
                                <h2 className="text-xl font-semibold text-white">Complaint Type</h2>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-700 font-medium">Type:</span>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                        {complaint.category?.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-gray-700 font-medium">Year:</span>
                                    <span className="text-gray-800 font-semibold">
                                        {new Date(complaint.createdAt).getFullYear()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Status Card with Follow Button & Reopen Request & Update Request */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="bg-blue-600 px-6 py-4">
                                <h2 className="text-xl font-semibold text-white">Status</h2>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-gray-700">Current Status:</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${complaint.status === 'resolved' ? 'bg-green-500' :
                                        complaint.status === 'in_progress' ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}>
                                        {complaint.status === 'in_progress' ? 'In Progress' :
                                            complaint.status?.charAt(0).toUpperCase() + complaint.status?.slice(1)}
                                    </span>
                                </div>

                                <div className="mb-4">
                                    <FollowButton issueId={complaint._id} />
                                </div>

                                <div className="pt-4 border-t">
                                    <h3 className="text-sm font-medium text-gray-600 mb-3">Community Vote</h3>
                                    <VoteButton
                                        issueId={complaint._id}
                                        initialUpvotes={upvoteCount}
                                        initialDownvotes={downvoteCount}
                                        initialUserVote={userVote}
                                        onUpdate={fetchComplaintDetails}
                                    />
                                </div>

                                {/* ---- Added Request Update Button ---- */}
                                <div className="mt-4 pt-4 border-t">
                                    <button
                                        onClick={handleRequestUpdate}
                                        disabled={requestingUpdate}
                                        className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
                                    >
                                        {requestingUpdate ? 'Sending...' : 'Request Latest Update'}
                                    </button>
                                    {updateRequestMessage && (
                                        <p className="text-sm text-green-600 mt-2 text-center">{updateRequestMessage}</p>
                                    )}
                                </div>
                                {/* ------------------------------------ */}

                                {/* User Reopen Request Button - only for archived issues and non-admin */}
                                {complaint.status === 'archived' && !isAdmin && (
                                    <div className="mt-4 pt-4 border-t">
                                        <button
                                            onClick={handleRequestReopen}
                                            disabled={reopenRequested}
                                            className={`w-full py-2 rounded font-medium ${reopenRequested
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-yellow-500 text-white hover:bg-yellow-600'
                                                }`}
                                        >
                                            {reopenRequested ? 'Reopen Requested ✓' : '⚠️ Request Reopen'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ADMIN CONTROLS – only when admin and issue NOT archived */}
                        {isAdmin && adminIssueId && complaint.status !== 'archived' && (
                            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                                <div className="bg-orange-600 px-6 py-4">
                                    <h2 className="text-xl font-semibold text-white">Admin Status Control</h2>
                                </div>
                                <div className="p-6">
                                    <select
                                        value={statusUpdate.status}
                                        onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                                        className="w-full px-3 py-2 border rounded mb-3 focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="">Select new status</option>
                                        <option value="reported">Reported</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                    </select>
                                    <textarea
                                        value={statusUpdate.comment}
                                        onChange={(e) => setStatusUpdate({ ...statusUpdate, comment: e.target.value })}
                                        placeholder="Comment about this status change..."
                                        className="w-full px-3 py-2 border rounded mb-3 focus:ring-2 focus:ring-orange-500"
                                        rows="2"
                                    />
                                    <button
                                        onClick={handleAdminStatusUpdate}
                                        disabled={updating}
                                        className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700 disabled:opacity-50"
                                    >
                                        {updating ? 'Updating...' : 'Update Status'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ADMIN REACTIVATE BUTTON – only when admin and issue IS archived */}
                        {isAdmin && adminIssueId && complaint.status === 'archived' && (
                            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                                <div className="bg-purple-600 px-6 py-4">
                                    <h2 className="text-xl font-semibold text-white">Archived Issue</h2>
                                </div>
                                <div className="p-6">
                                    <button
                                        onClick={handleReactivate}
                                        disabled={updating}
                                        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {updating ? 'Processing...' : 'Reactivate Issue'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Status History (for everyone – transparency) */}
                        {complaint.statusHistory && complaint.statusHistory.length > 0 && (
                            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                                <div className="bg-gray-100 px-6 py-4">
                                    <h2 className="text-xl font-semibold text-gray-800">Status History</h2>
                                </div>
                                <div className="p-6 max-h-60 overflow-y-auto">
                                    <ul className="space-y-3">
                                        {complaint.statusHistory.slice().reverse().map((h, idx) => (
                                            <li key={idx} className="text-sm border-l-2 border-blue-300 pl-3">
                                                <span className="font-medium">{formatStatusLabel(h.status)}</span> – {new Date(h.at).toLocaleString()}
                                                {h.updatedBy && <span className="text-gray-500 text-xs ml-2">by {h.updatedByName || 'Admin'}</span>}
                                                {h.comment && <div className="text-gray-600 text-xs mt-1">{h.comment}</div>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Under Review / Duplicate Status */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="bg-blue-600 px-6 py-4">
                                <h2 className="text-xl font-semibold text-white">Under Review</h2>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-700">Duplication Status:</span>
                                    {complaint.similarIssues && complaint.similarIssues.length > 0 ? (
                                        <span className="text-yellow-600 font-medium">⚠️ Duplicate Found</span>
                                    ) : (
                                        <span className="text-green-600 font-medium">✓ Unique Issue</span>
                                    )}
                                </div>
                                {complaint.similarIssues && complaint.similarIssues.length > 0 && (
                                    <div className="mt-3 text-sm text-gray-600">
                                        <p>Similar issues reported nearby:</p>
                                        <ul className="list-disc list-inside mt-2">
                                            {complaint.similarIssues.slice(0, 2).map((similar, idx) => (
                                                <li key={idx} className="text-blue-600 hover:underline cursor-pointer">
                                                    <Link to={`/complaint/${similar.issue?._id}`}>
                                                        {similar.issue?.title}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Activity Stats */}
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <div className="flex items-center justify-between text-gray-600">
                                <div className="text-center">
                                    <span className="text-2xl font-bold text-blue-600">{upvoteCount}</span>
                                    <p className="text-xs mt-1">Upvotes</p>
                                </div>
                                <div className="text-center">
                                    <span className="text-2xl font-bold text-blue-600">{downvoteCount}</span>
                                    <p className="text-xs mt-1">Downvotes</p>
                                </div>
                                <div className="text-center">
                                    <span className="text-2xl font-bold text-blue-600">{complaint.commentCount || 0}</span>
                                    <p className="text-xs mt-1">Comments</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ComplaintDetails;