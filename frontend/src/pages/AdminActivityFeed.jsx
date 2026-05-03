import React, { useState, useEffect, useCallback, useRef } from 'react';
import API from '../services/api';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth';
import AdminActivityFeedStats from '../components/AdminActivityFeedStats';
import AdminActivityFilters from '../components/AdminActivityFilters';
import AdminActivityItem from '../components/AdminActivityItem';
import BulkActionBar from '../components/BulkActionBar';
import AnalyticsPanel from '../components/AnalyticsPanel';
import UserActivityModal from '../components/UserActivityModal';

const AdminActivityFeed = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [filters, setFilters] = useState({
        type: 'all',
        priority: 'all',
        isRead: '',
        isFlagged: '',
        dateFrom: '',
        dateTo: '',
        category: 'all',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });
    const [analytics, setAnalytics] = useState(null);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [toast, setToast] = useState(null);
    const pollingInterval = useRef(null);
    const [selectAll, setSelectAll] = useState(false);

    // Auto-refresh every 15 seconds
    useEffect(() => {
        fetchActivities();
        pollingInterval.current = setInterval(() => {
            fetchActivities(false);
        }, 15000);

        return () => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
        };
    }, [filters, pagination.page]);

    const fetchActivities = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            setError(null);

            const token = authService.getToken();
            const params = new URLSearchParams();

            Object.entries(filters).forEach(([key, value]) => {
                if (value && value !== 'all') {
                    params.append(key, value);
                }
            });
            params.append('page', pagination.page);
            params.append('limit', pagination.limit);

            const response = await API.get(`/admin/activities?${params.toString()}`);

            if (response.data.success) {
                setActivities(response.data.data);
                setAnalytics(response.data.analytics);
                setPagination(prev => ({
                    ...prev,
                    total: response.data.pagination.total,
                    pages: response.data.pagination.pages
                }));
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
            setError('Failed to load activities');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.page]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleSelectAll = (checked) => {
        setSelectAll(checked);
        if (checked) {
            setSelectedIds(new Set(activities.map(a => a._id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
        setSelectAll(newSet.size === activities.length);
    };

    const handleMarkAsRead = async (ids = null) => {
        try {
            const token = authService.getToken();
            const idsToMark = ids || Array.from(selectedIds);

            await API.put('/admin/activities/read', 
                ids ? { activityIds: idsToMark } : { markAll: true }
            );

            showToast('Activities marked as read', 'success');
            fetchActivities();
            setSelectedIds(new Set());
            setSelectAll(false);
        } catch (error) {
            showToast('Failed to mark as read', 'error');
        }
    };

    const handleFlag = async (id, reason) => {
        try {
            const token = authService.getToken();
            await API.put(`/admin/activities/${id}/flag`, { reason });
            showToast('Activity flagged', 'success');
            fetchActivities();
        } catch (error) {
            showToast('Failed to flag activity', 'error');
        }
    };

    const handleUpdatePriority = async (id, priority) => {
        try {
            const token = authService.getToken();
            await API.put(`/admin/activities/${id}/priority`, { priority });
            showToast(`Priority updated to ${priority}`, 'success');
            fetchActivities();
        } catch (error) {
            showToast('Failed to update priority', 'error');
        }
    };

    const handleBulkAction = async (action, data = {}) => {
        try {
            const token = authService.getToken();
            await API.post('/admin/activities/bulk', {
                action, activityIds: Array.from(selectedIds), data
            });
            showToast(`Bulk ${action} completed`, 'success');
            fetchActivities();
            setSelectedIds(new Set());
            setSelectAll(false);
        } catch (error) {
            showToast(`Bulk ${action} failed`, 'error');
        }
    };

    const handleViewUser = (userId) => {
        setSelectedUser(userId);
    };

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f0f2f5',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)',
                padding: '25px 30px',
                color: 'white'
            }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
                                Admin Activity Feed
                            </h1>
                            <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                                Real-time monitoring, moderation, and analytics
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setShowAnalytics(!showAnalytics)}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: showAnalytics ? '#10b981' : 'rgba(255,255,255,0.15)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Analytics
                            </button>
                            <button
                                onClick={() => navigate('/admin')}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                ← Dashboard
                            </button>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    {analytics && (
                        <AdminActivityFeedStats analytics={analytics} />
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div style={{ maxWidth: '1400px', margin: '20px auto', padding: '0 20px' }}>
                {/* Filters */}
                <AdminActivityFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onMarkAllRead={() => handleMarkAsRead(null)}
                    unreadCount={analytics?.unreadCount || 0}
                />

                {/* Analytics Panel */}
                {showAnalytics && (
                    <AnalyticsPanel
                        onClose={() => setShowAnalytics(false)}
                    />
                )}

                {/* Bulk Action Bar */}
                {selectedIds.size > 0 && (
                    <BulkActionBar
                        selectedCount={selectedIds.size}
                        onAction={handleBulkAction}
                        onClear={() => {
                            setSelectedIds(new Set());
                            setSelectAll(false);
                        }}
                    />
                )}

                {/* Activity List */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    overflow: 'hidden'
                }}>
                    {/* Table Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr 100px 100px 120px 80px 120px',
                        padding: '15px 20px',
                        backgroundColor: '#f8fafc',
                        borderBottom: '2px solid #e2e8f0',
                        fontWeight: '600',
                        fontSize: '13px',
                        color: '#4a5568'
                    }}>
                        <div>
                            <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                        </div>
                        <div>Activity</div>
                        <div>Priority</div>
                        <div>Status</div>
                        <div>User</div>
                        <div>Flagged</div>
                        <div>Actions</div>
                    </div>

                    {/* Activity Items */}
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                border: '4px solid #e2e8f0',
                                borderTop: '4px solid #3b82f6',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                                margin: '0 auto 15px'
                            }}></div>
                            <p style={{ color: '#64748b' }}>Loading activities...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <p style={{ color: '#ef4444', marginBottom: '15px' }}>{error}</p>
                            <button
                                onClick={fetchActivities}
                                style={{
                                    padding: '8px 20px',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    ) : activities.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📭</div>
                            <p style={{ color: '#64748b', fontSize: '16px' }}>No activities found</p>
                            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Adjust filters to see more results</p>
                        </div>
                    ) : (
                        activities.map((activity) => (
                            <AdminActivityItem
                                key={activity._id}
                                activity={activity}
                                isSelected={selectedIds.has(activity._id)}
                                onSelect={() => handleSelect(activity._id)}
                                onFlag={handleFlag}
                                onUpdatePriority={handleUpdatePriority}
                                onMarkRead={(id) => handleMarkAsRead([id])}
                                onViewUser={handleViewUser}
                            />
                        ))
                    )}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '10px',
                        marginTop: '20px',
                        padding: '15px 0'
                    }}>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            disabled={pagination.page === 1}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: pagination.page === 1 ? '#e2e8f0' : '#3b82f6',
                                color: pagination.page === 1 ? '#94a3b8' : 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: pagination.page === 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            ← Previous
                        </button>
                        <span style={{ color: '#64748b', fontSize: '14px' }}>
                            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                        </span>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={pagination.page === pagination.pages}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: pagination.page === pagination.pages ? '#e2e8f0' : '#3b82f6',
                                color: pagination.page === pagination.pages ? '#94a3b8' : 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>

            {/* User Activity Modal */}
            {selectedUser && (
                <UserActivityModal
                    userId={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    padding: '12px 24px',
                    backgroundColor: toast.type === 'success' ? '#10b981' :
                        toast.type === 'error' ? '#ef4444' : '#3b82f6',
                    color: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    animation: 'slideIn 0.3s ease',
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    {toast.message}
                </div>
            )}

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes slideIn {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default AdminActivityFeed;