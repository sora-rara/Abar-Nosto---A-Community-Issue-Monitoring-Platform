import { useState, useEffect } from 'react';
import API from '../services/api';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

const NotificationPanel = ({ onClose }) => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await API.get('/notifications?limit=20', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data.data || []);
        } catch (err) {
            console.error(err);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        const token = localStorage.getItem('token');
        await API.put(`/notifications/${id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev =>
            prev.map(n => (n._id === id ? { ...n, read: true } : n))
        );
    };

    const markAllRead = async () => {
        const token = localStorage.getItem('token');
        await API.put('/notifications/read-all', {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const goToSettings = () => {
        navigate('/preferences');
        onClose();
    };

    const panelStyle = {
        position: 'absolute',
        top: '40px',
        right: '0',
        width: '340px',
        maxHeight: '420px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        zIndex: 1000,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
    };

    const headerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: '#f3f4f6',
        borderBottom: '1px solid #e5e7eb'
    };

    const headerTitleStyle = {
        margin: 0,
        fontSize: '1rem',
        fontWeight: 600
    };

    const headerButtonStyle = {
        background: 'none',
        border: 'none',
        fontSize: '0.8rem',
        color: '#3b82f6',
        cursor: 'pointer',
        marginLeft: '8px'
    };

    const listStyle = {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        overflowY: 'auto',
        flex: 1
    };

    const itemStyle = (read) => ({
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        transition: 'background 0.2s',
        opacity: read ? 0.6 : 1,
        cursor: 'pointer'
    });

    const titleStyle = {
        display: 'block',
        fontSize: '0.9rem',
        fontWeight: 600,
        marginBottom: '4px'
    };

    const messageStyle = {
        margin: '0 0 4px 0',
        fontSize: '0.8rem',
        color: '#4b5563'
    };

    const timeStyle = {
        fontSize: '0.7rem',
        color: '#9ca3af'
    };

    const readButtonStyle = {
        marginTop: '6px',
        background: 'none',
        border: 'none',
        fontSize: '0.7rem',
        color: '#3b82f6',
        cursor: 'pointer',
        padding: 0
    };

    const emptyStyle = {
        padding: '32px',
        textAlign: 'center',
        color: '#9ca3af'
    };

    if (loading) {
        return (
            <div style={panelStyle}>
                <div style={{ padding: '16px', textAlign: 'center' }}>Loading...</div>
            </div>
        );
    }

    return (
        <div style={panelStyle}>
            <div style={headerStyle}>
                <h3 style={headerTitleStyle}>Notifications</h3>
                <div>
                    <button onClick={markAllRead} style={headerButtonStyle}>Mark all read</button>
                    <button onClick={goToSettings} style={headerButtonStyle}>Settings</button>
                    <button onClick={onClose} style={headerButtonStyle}>Close</button>
                </div>
            </div>
            <ul style={listStyle}>
                {notifications.length === 0 ? (
                    <li style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                        No notifications yet
                    </li>
                ) : (
                    notifications.map(notif => (
                        <li
                            key={notif._id}
                            style={itemStyle(notif.read)}
                            onClick={() => {
                                if (!notif.read) markAsRead(notif._id);
                                if (notif.relatedIssue) {
                                    navigate(`/complaint/${notif.relatedIssue._id}`);
                                    onClose();
                                }
                            }}
                        >
                            <strong style={titleStyle}>{notif.title}</strong>
                            <p style={messageStyle}>{notif.message}</p>
                            <small style={timeStyle}>
                                {new Date(notif.createdAt).toLocaleString()}
                            </small>
                            {!notif.read && (
                                <div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markAsRead(notif._id);
                                        }}
                                        style={readButtonStyle}
                                    >
                                        Mark read
                                    </button>
                                </div>
                            )}
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

export default NotificationPanel;