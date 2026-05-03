import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminActivityItem = ({
    activity,
    isSelected,
    onSelect,
    onFlag,
    onUpdatePriority,
    onMarkRead,
    onViewUser
}) => {
    const [showActions, setShowActions] = useState(false);
    const navigate = useNavigate();

    // const getTypeIcon = (type) => {
    //     const icons = {
    //         new_issue: '🆕',
    //         new_comment: '💬',
    //         status_update: '📊',
    //         issue_resolved: '✅',
    //         upvote: '👍',
    //         downvote: '👎',
    //         upvote_removed: '👍',
    //         downvote_removed: '👎',
    //         user_registered: '👤',
    //         report_flagged: '🚩',
    //         bulk_action: '📦',
    //         comment_moderated: '🛡️',
    //         issue_prioritized: '⭐',
    //         user_warning: '⚠️',
    //         system_alert: '🔔'
    //     };
    //     return icons[type] || '📌';
    // };

    const getPriorityColor = (priority) => {
        const colors = {
            low: { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
            medium: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
            high: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
            critical: { bg: '#fecaca', text: '#7f1d1d', border: '#dc2626' }
        };
        return colors[priority] || colors.low;
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const priorityStyle = getPriorityColor(activity.priority);

    // Navigate to the issue/complaint page
    const handleIssueClick = (e) => {
        e.stopPropagation();
        if (activity.issue) {
            navigate(`/complaint/${activity.issue}`);
        }
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 100px 100px 120px 80px 120px',
            padding: '12px 20px',
            borderBottom: '1px solid #f1f5f9',
            alignItems: 'center',
            backgroundColor: isSelected ? '#f0f9ff' :
                !activity.isRead ? '#fafbff' : 'white',
            transition: 'background-color 0.2s',
            cursor: 'pointer'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                setShowActions(true);
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isSelected ? '#f0f9ff' :
                    !activity.isRead ? '#fafbff' : 'white';
                setShowActions(false);
            }}
            onClick={handleIssueClick}
        >
            {/* Checkbox */}
            <div>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onSelect}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
            </div>

            {/* Activity Content */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>
                            {activity.userName}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>
                            {activity.type.replace(/_/g, ' ')}
                        </span>
                        {!activity.isRead && (
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#3b82f6',
                                display: 'inline-block'
                            }}></span>
                        )}
                    </div>
                    {activity.issueTitle && (
                        <div
                            style={{
                                fontSize: '13px',
                                color: '#3b82f6',
                                fontWeight: '500',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                            onClick={handleIssueClick}
                        >
                            {activity.issueTitle}
                        </div>
                    )}
                    {activity.content && (
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                            {activity.content.substring(0, 150)}
                        </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                        {formatTime(activity.createdAt)}
                    </div>
                </div>
            </div>

            {/* Priority Badge */}
            <div>
                <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: priorityStyle.bg,
                    color: priorityStyle.text,
                    border: `1px solid ${priorityStyle.border}`
                }}>
                    {activity.priority.toUpperCase()}
                </span>
            </div>

            {/* Read Status */}
            <div>
                <span style={{
                    fontSize: '12px',
                    color: activity.isRead ? '#94a3b8' : '#3b82f6',
                    fontWeight: '500'
                }}>
                    {activity.isRead ? '✓ Read' : '● New'}
                </span>
            </div>

            {/* User Info */}
            <div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onViewUser(activity.user?._id);
                    }}
                    style={{
                        border: 'none',
                        background: 'none',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500',
                        textDecoration: 'underline'
                    }}
                >
                    {activity.userName}
                </button>
            </div>

            {/* Flagged Status */}
            <div>
                {activity.isFlagged && (
                    <span style={{
                        color: '#ef4444',
                        fontSize: '12px',
                        fontWeight: '600'
                    }}>
                        🚩 Flagged
                    </span>
                )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {showActions && (
                    <>
                        {!activity.isRead && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkRead(activity._id);
                                }}
                                title="Mark as read"
                                style={actionBtnStyle}
                            >
                                ✓
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onFlag(activity._id, 'Flagged for review');
                            }}
                            title={activity.isFlagged ? 'Unflag' : 'Flag'}
                            style={{
                                ...actionBtnStyle,
                                color: activity.isFlagged ? '#10b981' : '#ef4444'
                            }}
                        >
                            {activity.isFlagged ? '🏳️' : '🚩'}
                        </button>
                        <select
                            value={activity.priority}
                            onChange={(e) => {
                                e.stopPropagation();
                                onUpdatePriority(activity._id, e.target.value);
                            }}
                            style={{
                                ...actionBtnStyle,
                                width: 'auto',
                                fontSize: '11px',
                                padding: '2px 5px'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </>
                )}
            </div>
        </div>
    );
};

const actionBtnStyle = {
    padding: '4px 8px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#64748b',
    transition: 'all 0.2s'
};

export default AdminActivityItem;