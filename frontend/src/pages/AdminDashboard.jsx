import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth';
import axios from 'axios';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [issues, setIssues] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        reported: 0,
        inProgress: 0,
        resolved: 0,
        archived: 0
    });
    const [filters, setFilters] = useState({
        status: 'all',
        category: 'all'
    });
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [statusUpdate, setStatusUpdate] = useState({
        status: '',
        comment: ''
    });
    const [finalUpdate, setFinalUpdate] = useState('');
    const [updating, setUpdating] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        const token = authService.getToken();
        const currentUser = authService.getCurrentUser();

        if (!token || !currentUser) {
            navigate('/login');
            return;
        }

        if (!(currentUser.isAdmin || currentUser.role === 'admin')) {
            alert('Access denied. Admin only.');
            authService.logout();
            navigate('/login');
            return;
        }

        setUser(currentUser);
        fetchStats();
    }, [navigate]);

    useEffect(() => {
        if (user) {
            fetchIssues();
        }
    }, [filters.status, filters.category, showArchived]);

    const fetchIssues = async () => {
        try {
            const token = authService.getToken();
            const params = new URLSearchParams();

            if (showArchived) {
                params.append('status', 'archived');
            } else if (filters.status !== 'all') {
                params.append('status', filters.status);
            }

            if (filters.category !== 'all') {
                params.append('category', filters.category);
            }

            const url = `http://localhost:5000/api/admin/issues${params.toString() ? `?${params.toString()}` : ''}`;
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setIssues(response.data.data || []);
            } else {
                setIssues([]);
            }
        } catch (error) {
            console.error('Error fetching issues:', error);
            if (error.response?.status === 403) {
                alert('Admin access required.');
                navigate('/home');
            }
        }
    };

    const fetchStats = async () => {
        try {
            const token = authService.getToken();
            const response = await axios.get('http://localhost:5000/api/admin/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setStats({
                    total: response.data.data.total,
                    reported: response.data.data.reported,
                    inProgress: response.data.data.inProgress,
                    resolved: response.data.data.resolved,
                    archived: response.data.data.archived || 0
                });
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewIssue = (issue) => {
        setSelectedIssue(issue);
        setShowModal(true);
        setStatusUpdate({ status: '', comment: '' });
        setFinalUpdate('');
    };

    const handleUpdateStatus = async () => {
        if (!statusUpdate.status || !statusUpdate.comment) {
            alert('Please select status and add a comment');
            return;
        }

        setUpdating(true);
        try {
            const token = authService.getToken();
            const response = await axios.put(
                `http://localhost:5000/api/admin/issues/${selectedIssue._id}/status`,
                statusUpdate,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                alert('Status updated successfully!');
                setShowModal(false);
                fetchIssues();
                fetchStats();
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert(error.response?.data?.message || 'Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const handlePublishFinalUpdate = async () => {
        if (!finalUpdate.trim()) {
            alert('Please enter a final update statement');
            return;
        }

        setUpdating(true);
        try {
            const token = authService.getToken();
            const response = await axios.post(
                `http://localhost:5000/api/admin/issues/${selectedIssue._id}/final-update`,
                { statement: finalUpdate },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                alert('Final update published successfully!');
                setShowModal(false);
                fetchIssues();
                fetchStats();
            }
        } catch (error) {
            console.error('Error publishing final update:', error);
            alert(error.response?.data?.message || 'Failed to publish final update');
        } finally {
            setUpdating(false);
        }
    };

    const handleViewAllIssues = () => {
        setFilters({ status: 'all', category: 'all' });
        setShowArchived(false);
    };

    const handleGenerateReport = async () => {
        try {
            const token = authService.getToken();
            // Fetch the CSV file from our new backend route
            const response = await axios.get('http://localhost:5000/api/admin/export', {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob' // Tells Axios we are downloading a file
            });
            
            // Create a temporary link to download the file
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `database-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Failed to export data from server.');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'reported':
                return <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Reported</span>;
            case 'in_progress':
                return <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>In Progress</span>;
            case 'resolved':
                return <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Resolved</span>;
            case 'archived':
                return <span style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Archived</span>;
            default:
                return <span style={{ backgroundColor: '#f3f4f6', color: '#4b5563', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{status}</span>;
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleArchive = async (issue) => {
        if (!window.confirm(`Archive issue "${issue.title}"? It will be hidden from the active dashboard.`)) return;
        try {
            const token = authService.getToken();
            await axios.patch(`/api/admin/issues/${issue._id}/archive`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Issue archived');
            fetchIssues();
            fetchStats();
        } catch (err) {
            alert(err.response?.data?.message || 'Archive failed');
        }
    };

    const handleReactivate = async (issue) => {
        if (!window.confirm(`Reactivate issue "${issue.title}"? It will reappear on the active dashboard.`)) return;
        try {
            const token = authService.getToken();
            await axios.patch(`/api/admin/issues/${issue._id}/reactivate`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Issue reactivated');
            fetchIssues();
            fetchStats();
        } catch (err) {
            alert(err.response?.data?.message || 'Reactivate failed');
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '30px',
                    borderRadius: '10px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '5px solid #f3f3f3',
                        borderTop: '5px solid #667eea',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    <p>Loading dashboard...</p>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f5f5f5',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
                <div style={{ marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>
                        Admin Dashboard
                    </h1>
                    <p style={{ color: '#666' }}>
                        Welcome back, <span style={{ color: '#667eea', fontWeight: 'bold' }}>{user?.name}</span>
                    </p>
                </div>

                {/* Stats Cards - 5 columns including Archived */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '20px',
                    marginBottom: '30px'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        borderLeft: '4px solid #667eea'
                    }}>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Issues</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>{stats.total}</div>
                    </div>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        borderLeft: '4px solid #f59e0b'
                    }}>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Reported</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>{stats.reported}</div>
                    </div>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        borderLeft: '4px solid #3b82f6'
                    }}>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>In Progress</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>{stats.inProgress}</div>
                    </div>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        borderLeft: '4px solid #10b981'
                    }}>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Resolved</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>{stats.resolved}</div>
                    </div>
                    {/* Archived Card */}
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        borderLeft: '4px solid #9ca3af'
                    }}>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Archived</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>{stats.archived}</div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    marginBottom: '30px'
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '15px' }}>Quick Actions</h3>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleViewAllIssues}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            View All Issues
                        </button>

                        <button
                            onClick={() => navigate('/admin/activity-feed')}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            📊 Activity Feed
                        </button>

                        <button
                            onClick={() => window.location.href = '/admin/stats'}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            📊 Ward Statistics
                        </button>

                        <button
                            onClick={handleGenerateReport}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#9f7aea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Generate Report
                        </button>

                        <button
                            onClick={() => setShowArchived(false)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: !showArchived ? '#3b82f6' : '#e5e7eb',
                                color: !showArchived ? 'white' : '#333',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Active Issues
                        </button>
                        <button
                            onClick={() => setShowArchived(true)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: showArchived ? '#3b82f6' : '#e5e7eb',
                                color: showArchived ? 'white' : '#333',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Archived Issues
                        </button>
                    </div>
                </div>

                {/* Filters (only for active issues) */}
                {!showArchived && (
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        marginBottom: '20px'
                    }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div>
                                <label style={{ fontSize: '14px', color: '#666', marginRight: '10px' }}>Status:</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    style={{
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '5px',
                                        fontSize: '14px',
                                        width: '150px'
                                    }}
                                >
                                    <option value="all">All Status</option>
                                    <option value="reported">Reported</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '14px', color: '#666', marginRight: '10px' }}>Category:</label>
                                <select
                                    value={filters.category}
                                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                    style={{
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '5px',
                                        fontSize: '14px',
                                        width: '150px'
                                    }}
                                >
                                    <option value="all">All Categories</option>
                                    <option value="pothole">Pothole</option>
                                    <option value="broken_light">Broken Light</option>
                                    <option value="drainage">Drainage</option>
                                    <option value="flooding">Flooding</option>
                                    <option value="garbage">Garbage</option>
                                    <option value="debris">Debris</option>
                                    <option value="hazard">Hazard</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Issues Table */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '15px' }}>
                        {showArchived ? 'Archived Issues' : 'Active Issues'} {issues.length > 0 && `(${issues.length})`}
                    </h3>

                    {issues.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📭</div>
                            <p>No {showArchived ? 'archived' : 'active'} issues found</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Title</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Category</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Status</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Reported By</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Date</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {issues.map((issue, index) => {
                                        const reporterName = issue.reporterName || (issue.user && issue.user.name) || 'Unknown';
                                        return (
                                            <tr key={issue._id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? 'white' : '#fafafa' }}>
                                                <td style={{ padding: '12px', fontSize: '14px' }}>
                                                    <div style={{ fontWeight: '500', color: '#333' }}>{issue.title}</div>
                                                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                                        {issue.description?.substring(0, 60)}...
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                                                    {issue.category?.replace('_', ' ')}
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    {getStatusBadge(issue.status)}
                                                    {issue.reopenRequested && (
                                                        <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '12px' }}>
                                                            Reopen requested
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                                                    {reporterName}
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                                                    {formatDate(issue.createdAt)}
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <button
                                                        onClick={() => handleViewIssue(issue)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: '#667eea',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            marginRight: '8px'
                                                        }}
                                                    >
                                                        Manage
                                                    </button>
                                                    {!showArchived && issue.status === 'resolved' && (
                                                        <button
                                                            onClick={() => handleArchive(issue)}
                                                            style={{
                                                                padding: '6px 12px',
                                                                backgroundColor: '#eab308',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            Archive
                                                        </button>
                                                    )}
                                                    {showArchived && issue.status === 'archived' && (
                                                        <button
                                                            onClick={() => handleReactivate(issue)}
                                                            style={{
                                                                padding: '6px 12px',
                                                                backgroundColor: '#10b981',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            Reactivate
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Issue Management Modal */}
            {showModal && selectedIssue && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }} onClick={() => setShowModal(false)}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '10px',
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflowY: 'auto'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>
                            Manage Issue: {selectedIssue.title}
                        </h3>

                        {/* Issue Details */}
                        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f7fafc', borderRadius: '5px' }}>
                            <p><strong>Description:</strong> {selectedIssue.description}</p>
                            <p><strong>Category:</strong> {selectedIssue.category}</p>
                            <p><strong>Current Status:</strong> {getStatusBadge(selectedIssue.status)}</p>
                            <p><strong>Reported By:</strong> {selectedIssue.reporterName || (selectedIssue.user && selectedIssue.user.name) || 'Unknown'}</p>
                            <p><strong>Reported On:</strong> {formatDate(selectedIssue.createdAt)}</p>
                            {selectedIssue.location?.address && (
                                <p><strong>Location:</strong> {selectedIssue.location.address}</p>
                            )}
                        </div>

                        {/* Status History */}
                        {selectedIssue.statusHistory && selectedIssue.statusHistory.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Status History</h4>
                                {selectedIssue.statusHistory.map((history, index) => (
                                    <div key={index} style={{ padding: '10px', backgroundColor: '#f7fafc', borderRadius: '5px', marginBottom: '5px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            {getStatusBadge(history.status)}
                                            <span style={{ fontSize: '12px', color: '#666' }}>{formatDate(history.updatedAt)}</span>
                                        </div>
                                        <p style={{ fontSize: '14px', color: '#333' }}>{history.comment}</p>
                                        <p style={{ fontSize: '12px', color: '#666' }}>By: {history.updatedByName}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Final Update */}
                        {selectedIssue.finalUpdate && (
                            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#d1fae5', borderRadius: '5px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#065f46', marginBottom: '10px' }}>Final Update</h4>
                                <p style={{ fontSize: '14px', color: '#333' }}>{selectedIssue.finalUpdate.statement}</p>
                                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                    Published by {selectedIssue.finalUpdate.publishedByName} on {formatDate(selectedIssue.finalUpdate.publishedAt)}
                                </p>
                            </div>
                        )}

                        {/* Status Update Form */}
                        {selectedIssue.status !== 'resolved' && (
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>
                                    Update Status
                                </h4>
                                <select
                                    value={statusUpdate.status}
                                    onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '5px',
                                        marginBottom: '10px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">Select Status</option>
                                    <option value="reported">Reported</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                </select>
                                <textarea
                                    value={statusUpdate.comment}
                                    onChange={(e) => setStatusUpdate({ ...statusUpdate, comment: e.target.value })}
                                    placeholder="Add a comment about this status update..."
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '5px',
                                        marginBottom: '10px',
                                        fontSize: '14px',
                                        minHeight: '80px'
                                    }}
                                />
                                <button
                                    onClick={handleUpdateStatus}
                                    disabled={updating}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        backgroundColor: '#667eea',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: updating ? 'not-allowed' : 'pointer',
                                        opacity: updating ? 0.7 : 1
                                    }}
                                >
                                    {updating ? 'Updating...' : 'Update Status'}
                                </button>
                            </div>
                        )}

                        {/* Final Update Form */}
                        {selectedIssue.status === 'resolved' && !selectedIssue.finalUpdate && (
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>
                                    Publish Final Update
                                </h4>
                                <textarea
                                    value={finalUpdate}
                                    onChange={(e) => setFinalUpdate(e.target.value)}
                                    placeholder="Enter final statement about the resolution..."
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '5px',
                                        marginBottom: '10px',
                                        fontSize: '14px',
                                        minHeight: '100px'
                                    }}
                                />
                                <button
                                    onClick={handlePublishFinalUpdate}
                                    disabled={updating}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: updating ? 'not-allowed' : 'pointer',
                                        opacity: updating ? 0.7 : 1
                                    }}
                                >
                                    {updating ? 'Publishing...' : 'Publish Final Update'}
                                </button>
                            </div>
                        )}

                        {/* Close Button */}
                        <button
                            onClick={() => setShowModal(false)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                backgroundColor: '#f3f4f6',
                                color: '#333',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;