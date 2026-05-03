import React, { useState, useEffect } from 'react';
import API from '../services/api';
import authService from '../services/auth';

const AnalyticsPanel = ({ onClose }) => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d');

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const token = authService.getToken();
            const response = await API.get(
                `/admin/analytics?period=${period}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
                setAnalytics(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>📈 Activity Analytics</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '13px'
                        }}
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#f1f5f9',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        ✕ Close
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid #e2e8f0',
                        borderTop: '4px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto'
                    }}></div>
                </div>
            ) : analytics ? (
                <div>
                    {/* Summary Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '15px',
                        marginBottom: '25px'
                    }}>
                        <AnalyticsCard label="Total Activities" value={analytics.totalActivities} color="#3b82f6" />
                        <AnalyticsCard label="Flagged" value={analytics.flaggedCount} color="#ef4444" />
                        <AnalyticsCard label="Moderation Actions" value={analytics.moderationActions?.reduce((sum, a) => sum + a.count, 0) || 0} color="#f59e0b" />
                        <AnalyticsCard label="Avg Response (min)" value={Math.round(analytics.avgResponseTime?.[0]?.avgResponse || 0)} color="#10b981" />
                    </div>

                    {/* Activity by Type */}
                    <div style={{ marginBottom: '25px' }}>
                        <h4 style={{ fontSize: '15px', color: '#1e293b', marginBottom: '10px' }}>Activity by Type</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {analytics.activityByType?.map((item) => (
                                <div key={item._id} style={{
                                    padding: '8px 14px',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    color: '#475569',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    {item._id.replace(/_/g, ' ')}: <strong>{item.count}</strong>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Users */}
                    <div style={{ marginBottom: '25px' }}>
                        <h4 style={{ fontSize: '15px', color: '#1e293b', marginBottom: '10px' }}>Most Active Users</h4>
                        <div style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            overflow: 'hidden'
                        }}>
                            {analytics.mostActiveUsers?.map((user, index) => (
                                <div key={user._id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '10px 15px',
                                    borderBottom: '1px solid #e2e8f0',
                                    fontSize: '13px',
                                    backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc'
                                }}>
                                    <div>
                                        <strong>{index + 1}.</strong> {user.userName}
                                    </div>
                                    <div style={{ color: '#3b82f6', fontWeight: '600' }}>
                                        {user.activityCount} activities
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Priority Distribution */}
                    <div>
                        <h4 style={{ fontSize: '15px', color: '#1e293b', marginBottom: '10px' }}>Priority Distribution</h4>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {analytics.priorityDistribution?.map((item) => (
                                <div key={item._id} style={{
                                    flex: 1,
                                    padding: '15px',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{item.count}</div>
                                    <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'capitalize' }}>{item._id}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No analytics data available
                </div>
            )}
        </div>
    );
};

const AnalyticsCard = ({ label, value, color }) => (
    <div style={{
        padding: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        borderLeft: `4px solid ${color}`
    }}>
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>{label}</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>{value}</div>
    </div>
);

export default AnalyticsPanel;