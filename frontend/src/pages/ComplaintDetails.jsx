import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import VoteButton from '../components/VoteButton';
import CommentSection from '../components/CommentSection';

const ComplaintDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [upvoteCount, setUpvoteCount] = useState(0);
    const [downvoteCount, setDownvoteCount] = useState(0);
    const [userVote, setUserVote] = useState(null);

    useEffect(() => {
        fetchComplaintDetails();
    }, [id]);

    const fetchComplaintDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `http://localhost:5000/api/issues/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const data = response.data;
            
            // Calculate vote counts
            const upvotes = data.upvotes?.length || 0;
            const downvotes = data.downvotes?.length || 0;
            
            // Calculate user vote status
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
            
            console.log('ComplaintDetails vote data:', {
                upvotes,
                downvotes,
                userVote: userVoteStatus
            });
            
        } catch (error) {
            console.error('Error fetching complaint:', error);
        } finally {
            setLoading(false);
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
            {/* Header */}
            <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Link to="/" className="text-2xl font-bold tracking-tight">
                                ABAR NOSTO!
                            </Link>
                            <span className="text-blue-200 text-sm hidden md:inline">
                                Community Issue Monitoring Platform
                            </span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Link
                                to="/dashboard"
                                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                            >
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
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
                                            {complaint.contactInfo.phone && (
                                                <p className="text-gray-700">📞 {complaint.contactInfo.phone}</p>
                                            )}
                                            {complaint.contactInfo.email && (
                                                <p className="text-gray-700 mt-1">✉️ {complaint.contactInfo.email}</p>
                                            )}
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

                        {/* Status Card */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="bg-blue-600 px-6 py-4">
                                <h2 className="text-xl font-semibold text-white">Status</h2>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-gray-700">Current Status:</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${
                                        complaint.status === 'resolved' ? 'bg-green-500' :
                                        complaint.status === 'in_progress' ? 'bg-yellow-500' :
                                        'bg-red-500'
                                    }`}>
                                        {complaint.status === 'in_progress' ? 'In Progress' : 
                                         complaint.status?.charAt(0).toUpperCase() + complaint.status?.slice(1)}
                                    </span>
                                </div>
                                
                                {/* Vote Section */}
                                <div className="mt-6 pt-4 border-t">
                                    <h3 className="text-sm font-medium text-gray-600 mb-3">Community Vote</h3>
                                    <VoteButton
                                        issueId={complaint._id}
                                        initialUpvotes={upvoteCount}
                                        initialDownvotes={downvoteCount}
                                        initialUserVote={userVote}
                                        onUpdate={fetchComplaintDetails}
                                    />
                                </div>
                            </div>
                        </div>

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