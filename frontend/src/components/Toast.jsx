import { useEffect, useState } from 'react';
import { FaRegCommentAlt } from 'react-icons/fa';
import { FaRegChartBar } from 'react-icons/fa6';
import { FaLocationDot } from 'react-icons/fa6';
import { FaBell } from 'react-icons/fa';
import { FaArchive } from 'react-icons/fa';
import { FaUndoAlt } from 'react-icons/fa';

const Toast = ({ notification, onClose }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    if (!visible) return null;



    const getIcon = () => {
        switch (notification.type) {
            case 'new_comment':
                return <FaRegCommentAlt size={20} style={{ flexShrink: 0 }} />;
            case 'status_change':
                return <FaRegChartBar size={20} style={{ flexShrink: 0 }} />;
            case 'nearby_issue':
                return <FaLocationDot size={20} style={{ flexShrink: 0 }} />;
            case 'issue_archived':           // ✅ moved before default
                return <FaArchive size={20} style={{ flexShrink: 0 }} />;
            case 'issue_reactivated':        // ✅ moved before default
                return <FaUndoAlt size={20} style={{ flexShrink: 0 }} />;
            default:
                return <FaBell size={20} style={{ flexShrink: 0 }} />;
        }
    };

    const toastStyle = {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        padding: '16px',
        minWidth: '280px',
        maxWidth: '350px',
        borderLeft: `4px solid ${notification.type === 'nearby_issue' ? '#f59e0b' : '#3b82f6'}`,
        animation: 'slideIn 0.3s ease-out',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
    };

    const contentStyle = {
        flex: 1
    };

    const titleStyle = {
        fontWeight: 'bold',
        fontSize: '14px',
        marginBottom: '4px',
        color: '#1f2937'
    };

    const messageStyle = {
        fontSize: '13px',
        color: '#4b5563',
        marginBottom: '4px'
    };

    const locationStyle = {
        fontSize: '11px',
        color: '#9ca3af',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '4px'
    };

    const closeButtonStyle = {
        background: 'none',
        border: 'none',
        fontSize: '16px',
        cursor: 'pointer',
        color: '#9ca3af',
        padding: 0,
        marginLeft: '8px'
    };

    return (
        <div style={toastStyle}>
            <div style={{ flexShrink: 0 }}>{getIcon()}</div>  {/* ✅ fixed: removed undefined iconStyle */}
            <div style={contentStyle}>
                <div style={titleStyle}>{notification.title}</div>
                <div style={messageStyle}>{notification.message}</div>
                {notification.metadata?.distance && (
                    <div style={locationStyle}>
                        <span>📍</span> {Math.round(notification.metadata.distance)}m away
                    </div>
                )}
            </div>
            <button onClick={onClose} style={closeButtonStyle}>✕</button>
            <style>
                {`
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                `}
            </style>
        </div>
    );
};

export default Toast;