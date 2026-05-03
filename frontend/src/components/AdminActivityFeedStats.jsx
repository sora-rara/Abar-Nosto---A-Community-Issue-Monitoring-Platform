import React from 'react';

const AdminActivityFeedStats = ({ analytics }) => {
    if (!analytics) return null;

    const statCards = [
        {
            label: 'Unread',
            value: analytics.unreadCount || 0,
            color: '#3b82f6',
            bg: '#eff6ff',

        },
        {
            label: 'Flagged',
            value: analytics.flaggedCount || 0,
            color: '#ef4444',
            bg: '#fef2f2',

        },
        {
            label: 'Last 24h',
            value: analytics.recentActivityCount || 0,
            color: '#10b981',
            bg: '#f0fdf4',

        },
        {
            label: 'Total',
            value: analytics.totalActivities || 0,
            color: '#8b5cf6',
            bg: '#f5f3ff',

        }
    ];

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginTop: '15px'
        }}>
            {statCards.map((stat, index) => (
                <div key={index} style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '12px 15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.15)'
                }}>
                    <span style={{ fontSize: '24px' }}>{stat.icon}</span>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stat.value}</div>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>{stat.label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AdminActivityFeedStats;