import React from 'react';

const AdminActivityFilters = ({ filters, onFilterChange, onMarkAllRead, unreadCount }) => {
    const activityTypes = [
        'all',
        'new_issue',
        'new_comment',
        'status_update',
        'upvote',
        'downvote',
        'upvote_removed',
        'downvote_removed'
    ];

    const priorities = ['all', 'low', 'medium', 'high', 'critical'];
    const categories = [
        'all',
        'pothole',
        'broken_light',
        'drainage',
        'flooding',
        'garbage',
        'debris',
        'hazard',
        'other'
    ];

    const sortOptions = [
        { value: 'createdAt', label: 'Date' },
        { value: 'priority', label: 'Priority' }
    ];

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
            {/* Search Bar */}
            <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Search activities, users, issues..."
                        value={filters.search}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            border: '2px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                    {unreadCount > 0 && (
                        <button
                            onClick={onMarkAllRead}
                            style={{
                                padding: '12px 20px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                        >
                            Mark All Read ({unreadCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Filters Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
                alignItems: 'end'
            }}>
                <div>
                    <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px', display: 'block', fontWeight: '500' }}>
                        Type
                    </label>
                    <select
                        value={filters.type}
                        onChange={(e) => onFilterChange('type', e.target.value)}
                        style={selectStyle}
                    >
                        {activityTypes.map(type => (
                            <option key={type} value={type}>
                                {type === 'all' ? 'All Types' : type.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px', display: 'block', fontWeight: '500' }}>
                        Priority
                    </label>
                    <select
                        value={filters.priority}
                        onChange={(e) => onFilterChange('priority', e.target.value)}
                        style={selectStyle}
                    >
                        {priorities.map(p => (
                            <option key={p} value={p}>{p === 'all' ? 'All' : p}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px', display: 'block', fontWeight: '500' }}>
                        Category
                    </label>
                    <select
                        value={filters.category}
                        onChange={(e) => onFilterChange('category', e.target.value)}
                        style={selectStyle}
                    >
                        {categories.map(c => (
                            <option key={c} value={c}>
                                {c === 'all' ? 'All Categories' : c.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px', display: 'block', fontWeight: '500' }}>
                        Read Status
                    </label>
                    <select
                        value={filters.isRead}
                        onChange={(e) => onFilterChange('isRead', e.target.value)}
                        style={selectStyle}
                    >
                        <option value="">All</option>
                        <option value="false">Unread</option>
                        <option value="true">Read</option>
                    </select>
                </div>

                <div>
                    <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px', display: 'block', fontWeight: '500' }}>
                        Flagged
                    </label>
                    <select
                        value={filters.isFlagged}
                        onChange={(e) => onFilterChange('isFlagged', e.target.value)}
                        style={selectStyle}
                    >
                        <option value="">All</option>
                        <option value="true">Flagged Only</option>
                    </select>
                </div>

                <div>
                    <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px', display: 'block', fontWeight: '500' }}>
                        From Date
                    </label>
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                        style={selectStyle}
                    />
                </div>

                <div>
                    <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px', display: 'block', fontWeight: '500' }}>
                        To Date
                    </label>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => onFilterChange('dateTo', e.target.value)}
                        style={selectStyle}
                    />
                </div>

                <div>
                    <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px', display: 'block', fontWeight: '500' }}>
                        Sort By
                    </label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <select
                            value={filters.sortBy}
                            onChange={(e) => onFilterChange('sortBy', e.target.value)}
                            style={{ ...selectStyle, flex: 1 }}
                        >
                            {sortOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => onFilterChange('sortOrder', filters.sortOrder === 'desc' ? 'asc' : 'desc')}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                            title={`Sort ${filters.sortOrder === 'desc' ? 'Ascending' : 'Descending'}`}
                        >
                            {filters.sortOrder === 'desc' ? '↓' : '↑'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const selectStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    backgroundColor: 'white',
    cursor: 'pointer',
    outline: 'none'
};

export default AdminActivityFilters;