import React, { useState } from 'react';

const BulkActionBar = ({ selectedCount, onAction, onClear }) => {
    const [showPrioritySelect, setShowPrioritySelect] = useState(false);

    return (
        <div style={{
            backgroundColor: '#1e3a5f',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '12px',
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>
                    {selectedCount} selected
                </span>
                <button
                    onClick={onClear}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px'
                    }}
                >
                    Clear Selection
                </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => onAction('markRead')}
                    style={bulkBtnStyle}
                >
                    📬 Mark Read
                </button>
                <button
                    onClick={() => onAction('markUnread')}
                    style={bulkBtnStyle}
                >
                    📪 Mark Unread
                </button>
                <button
                    onClick={() => onAction('flag', { reason: 'Bulk flagged' })}
                    style={{ ...bulkBtnStyle, backgroundColor: '#f59e0b' }}
                >
                    🚩 Flag All
                </button>
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowPrioritySelect(!showPrioritySelect)}
                        style={{ ...bulkBtnStyle, backgroundColor: '#8b5cf6' }}
                    >
                        ⭐ Set Priority
                    </button>
                    {showPrioritySelect && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            padding: '8px',
                            zIndex: 100,
                            marginTop: '5px'
                        }}>
                            {['low', 'medium', 'high', 'critical'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => {
                                        onAction('updatePriority', { priority: p });
                                        setShowPrioritySelect(false);
                                    }}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '8px 16px',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        cursor: 'pointer',
                                        color: '#1e293b',
                                        fontSize: '13px',
                                        textAlign: 'left',
                                        borderRadius: '4px'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => {
                        if (window.confirm(`Delete ${selectedCount} activities?`)) {
                            onAction('delete');
                        }
                    }}
                    style={{ ...bulkBtnStyle, backgroundColor: '#ef4444' }}
                >
                    🗑️ Delete
                </button>
            </div>
        </div>
    );
};

const bulkBtnStyle = {
    padding: '8px 14px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'opacity 0.2s'
};

export default BulkActionBar;