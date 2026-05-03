import React, { useState, useEffect } from 'react';
import API from '../services/api';
import authService from '../services/auth';

const UserActivityModal = ({ userId, onClose }) => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserActivity();
    }, [userId]);

    const fetchUserActivity = async () => {
        try {
            setLoading(true);
            const token = authService.getToken();
            const response = await API.get(
                `/admin/users/${userId}/activity`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
                setUserData(response.data);
            }
        } catch (error) {
            console.error('Error fetching user activity:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
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
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '30px',
                maxWidth: '700px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
            }} onClick={(e) => e.stopPropagation()}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
                ) : userData ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>
                                👤 {userData.user?.name}
                            </h3>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                ✕ Close
                            </button>
                        </div>

                        {/* User Info */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '15px',
                            marginBottom: '20px'
                        }}>
                            <InfoCard label="Email" value={userData.user?.email} />
                            <InfoCard label="Reputation" value={userData.user?.reputation || 0} />
                            <InfoCard label="Total Activities" value={userData.analytics?.totalActivities || 0} />
                        </div>

                        {/* Activity Breakdown */}
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '15px', color: '#1e293b', marginBottom: '10px' }}>Activity Breakdown</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {userData.analytics?.byType?.map((item) => (
                                    <span key={item._id} style={{
                                        padding: '6px 12px',
                                        backgroundColor: '#f1f5f9',
                                        borderRadius: '16px',
                                        fontSize: '12px',
                                        color: '#475569'
                                    }}>
                                        {item._id.replace(/_/g, ' ')}: <strong>{item.count}</strong>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Recent Activities */}
                        <div>
                            <h4 style={{ fontSize: '15px', color: '#1e293b', marginBottom: '10px' }}>Recent Activities</h4>
                            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                {userData.activities?.map((activity) => (
                                    <div key={activity._id} style={{
                                        padding: '8px 0',
                                        borderBottom: '1px solid #f1f5f9',
                                        fontSize: '13px'
                                    }}>
                                        <span style={{ color: '#64748b' }}>
                                            {new Date(activity.createdAt).toLocaleString()}
                                        </span>
                                        {' - '}
                                        <span>{activity.type.replace(/_/g, ' ')}</span>
                                        {activity.issueTitle && (
                                            <span style={{ color: '#3b82f6' }}> - {activity.issueTitle}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px' }}>No data found</div>
                )}
            </div>
        </div>
    );
};

const InfoCard = ({ label, value }) => (
    <div style={{
        padding: '15px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        textAlign: 'center'
    }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>{label}</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>{value}</div>
    </div>
);

export default UserActivityModal;