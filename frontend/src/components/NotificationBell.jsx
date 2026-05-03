import { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationPanel from './NotificationPanel';

const NotificationBell = () => {
    const { unreadCount, resetUnreadCount } = useNotifications();
    const [showPanel, setShowPanel] = useState(false);

    const handleClick = () => {
        setShowPanel(!showPanel);
        if (unreadCount > 0) resetUnreadCount();
    };

    const bellStyle = {
        position: 'relative',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        fontSize: '1.25rem',
        padding: '0.25rem',
        transition: 'transform 0.2s',
        marginLeft: '0.5rem'
    };

    const badgeStyle = {
        position: 'absolute',
        top: '-5px',
        right: '-8px',
        backgroundColor: '#ef4444',
        color: 'white',
        fontSize: '0.7rem',
        fontWeight: 'bold',
        borderRadius: '50%',
        minWidth: '18px',
        height: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 4px'
    };

    return (
        <div style={{ position: 'relative' }}>
            <button onClick={handleClick} style={bellStyle}>
                🔔
                {unreadCount > 0 && <span style={badgeStyle}>{unreadCount}</span>}
            </button>
            {showPanel && <NotificationPanel onClose={() => setShowPanel(false)} />}
        </div>
    );
};

export default NotificationBell;