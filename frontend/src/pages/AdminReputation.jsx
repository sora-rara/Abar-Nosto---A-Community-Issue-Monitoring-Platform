import { useState, useEffect } from 'react';
import API from '../services/api';
import UserReputation from '../components/userReputation';

const AdminReputation = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [adjustPoints, setAdjustPoints] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [history, setHistory] = useState([]);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    // ========== AUTO-SYNC STATE ==========
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
    const [syncStatus, setSyncStatus] = useState({ syncing: false, lastSync: null });

    useEffect(() => {
        fetchUsers();
        // Load auto-sync preference from localStorage
        const savedSyncPref = localStorage.getItem('adminAutoSync');
        if (savedSyncPref !== null) {
            setAutoSyncEnabled(savedSyncPref === 'true');
        }
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await API.get('/admin/users');
            setUsers(response.data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
            setMessage({ type: 'error', text: 'Failed to load users' });
        } finally {
            setLoading(false);
        }
    };

    const fetchUserHistory = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await API.get(`/admin/users/${userId}/history`);
            setHistory(response.data.history);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    // ========== AUTO-SYNC FUNCTION ==========
    const syncWithDatabase = async () => {
        if (!autoSyncEnabled) return;

        setSyncStatus({ syncing: true, lastSync: syncStatus.lastSync });
        try {
            const token = localStorage.getItem('token');
            // Fetch latest users data from database
            const response = await API.get('/admin/users');


            // Update local state with database data
            setUsers(response.data.users);

            // If a user is selected, update their data and history
            if (selectedUser) {
                const updatedUser = response.data.users.find(u => u._id === selectedUser._id);
                if (updatedUser) {
                    setSelectedUser(updatedUser);
                    // Refresh history
                    const historyResponse = await API.get(`/admin/users/${selectedUser._id}/history`);
                    setHistory(historyResponse.data.history);
                }
            }

            setSyncStatus({ syncing: false, lastSync: new Date() });
            setMessage({ type: 'success', text: 'Auto-sync completed successfully!' });

            // Clear success message after 3 seconds
            setTimeout(() => {
                if (message.type === 'success') {
                    setMessage({ type: '', text: '' });
                }
            }, 3000);

        } catch (error) {
            console.error('Auto-sync error:', error);
            setSyncStatus({ syncing: false, lastSync: syncStatus.lastSync });
            setMessage({ type: 'error', text: 'Auto-sync failed. Check your connection.' });
        }
    };

    // ========== MANUAL SYNC FUNCTION ==========
    const handleManualSync = async () => {
        setMessage({ type: '', text: '' });
        await syncWithDatabase();
    };

    // ========== TOGGLE AUTO-SYNC ==========
    const toggleAutoSync = () => {
        const newSyncState = !autoSyncEnabled;
        setAutoSyncEnabled(newSyncState);
        localStorage.setItem('adminAutoSync', newSyncState.toString());
        setMessage({
            type: 'info',
            text: newSyncState ? 'Auto-sync enabled' : 'Auto-sync disabled'
        });

        // Clear message after 2 seconds
        setTimeout(() => {
            if (message.type === 'info') {
                setMessage({ type: '', text: '' });
            }
        }, 2000);
    };

    // ========== AUTO-SYNC INTERVAL (every 30 seconds) ==========
    useEffect(() => {
        let intervalId;

        if (autoSyncEnabled) {
            intervalId = setInterval(() => {
                syncWithDatabase();
            }, 30000); // Sync every 30 seconds
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [autoSyncEnabled, selectedUser]); // Re-run when selectedUser changes

    const handleAdjustReputation = async () => {
        if (!adjustPoints || !adjustReason) {
            setMessage({ type: 'error', text: 'Points and reason are required' });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await API.post(
                `/admin/users/${selectedUser._id}/reputation`,
                { points: parseInt(adjustPoints), reason: adjustReason }
            );
            setMessage({ type: 'success', text: 'Reputation updated successfully' });

            // ========== FORCE SYNC AFTER UPDATE ==========
            await fetchUsers();
            await fetchUserHistory(selectedUser._id);

            // Trigger auto-sync immediately after update
            if (autoSyncEnabled) {
                await syncWithDatabase();
            }

            setAdjustPoints('');
            setAdjustReason('');
        } catch (error) {
            console.error('Error adjusting reputation:', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to adjust reputation' });
        }
    };

    const selectUser = (user) => {
        setSelectedUser(user);
        fetchUserHistory(user._id);
        setMessage({ type: '', text: '' });
    };

    const getReputationColor = (reputation) => {
        if (reputation >= 100) return 'text-green-600 font-bold';
        if (reputation >= 50) return 'text-blue-600';
        if (reputation < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    // Filter users based on search and role
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    // Sort users by reputation (highest first)
    const sortedUsers = [...filteredUsers].sort((a, b) => b.reputation - a.reputation);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <div className="mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Admin: Reputation Management</h1>
                            <p className="text-gray-600 mt-2">Manage user reputations, view history, and make manual adjustments</p>
                        </div>

                        {/* ========== AUTO-SYNC CONTROLS ========== */}
                        <div className="flex items-center gap-3 bg-white rounded-lg shadow-md p-3">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">Auto-Sync:</label>
                                <button
                                    onClick={toggleAutoSync}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${autoSyncEnabled ? 'bg-blue-600' : 'bg-gray-300'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                                <span className={`text-sm ${autoSyncEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                                    {autoSyncEnabled ? 'ON' : 'OFF'}
                                </span>
                            </div>

                            <button
                                onClick={handleManualSync}
                                disabled={syncStatus.syncing}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition ${syncStatus.syncing
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                            >
                                {syncStatus.syncing ? (
                                    <span className="flex items-center gap-1">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Syncing...
                                    </span>
                                ) : (
                                    'Sync Now'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ========== SYNC STATUS INDICATOR ========== */}
                    {syncStatus.lastSync && (
                        <div className="mt-2 text-xs text-gray-500">
                            Last sync: {syncStatus.lastSync.toLocaleTimeString()}
                            {autoSyncEnabled && ' (Auto-sync every 30 seconds)'}
                        </div>
                    )}
                </div>

                {message.text && (
                    <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
                            message.type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
                                'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Users List */}
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
                            <h2 className="text-xl font-semibold text-white">All Users</h2>
                        </div>

                        {/* Search and Filter Bar */}
                        <div className="p-4 border-b bg-gray-50">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                                <select
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value)}
                                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    <option value="all">All Roles</option>
                                    <option value="user">Users</option>
                                    <option value="admin">Admins</option>
                                </select>
                            </div>
                        </div>

                        {/* Users List */}
                        <div className="divide-y max-h-[500px] overflow-y-auto">
                            {sortedUsers.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No users found
                                </div>
                            ) : (
                                sortedUsers.map((user) => (
                                    <div
                                        key={user._id}
                                        onClick={() => selectUser(user)}
                                        className={`p-4 cursor-pointer transition hover:bg-gray-50 ${selectedUser?._id === user._id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-gray-800">{user.name}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500">{user.email}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <UserReputation reputation={user.reputation} size="large" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column - User Details and Reputation Adjustment */}
                    <div>
                        {selectedUser ? (
                            <div className="space-y-6">
                                {/* User Info Card */}
                                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
                                        <h2 className="text-xl font-semibold text-white">User Details</h2>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <p className="text-gray-500 text-sm">Name</p>
                                                <p className="font-semibold text-gray-800">{selectedUser.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-sm">Email</p>
                                                <p className="font-semibold text-gray-800">{selectedUser.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-sm">Role</p>
                                                <p className="font-semibold text-gray-800 capitalize">{selectedUser.role}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-sm">Member Since</p>
                                                <p className="font-semibold text-gray-800">
                                                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="border-t pt-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-gray-600">Current Reputation</p>
                                                <p className={`text-3xl font-bold ${getReputationColor(selectedUser.reputation)}`}>
                                                    {selectedUser.reputation}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Adjust Reputation Card */}
                                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
                                        <h2 className="text-xl font-semibold text-white">Adjust Reputation</h2>
                                    </div>
                                    <div className="p-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-gray-700 font-medium mb-2">Points to Add/Remove</label>
                                                <input
                                                    type="number"
                                                    value={adjustPoints}
                                                    onChange={(e) => setAdjustPoints(e.target.value)}
                                                    placeholder="e.g., 10 or -5"
                                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Positive value adds points, negative value deducts points</p>
                                            </div>
                                            <div>
                                                <label className="block text-gray-700 font-medium mb-2">Reason for Adjustment</label>
                                                <input
                                                    type="text"
                                                    value={adjustReason}
                                                    onChange={(e) => setAdjustReason(e.target.value)}
                                                    placeholder="e.g., 'Award for helpful report' or 'Spam content'"
                                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                />
                                            </div>
                                            <button
                                                onClick={handleAdjustReputation}
                                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                                            >
                                                Apply Reputation Change
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Reputation History Card */}
                                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
                                        <h2 className="text-xl font-semibold text-white">Reputation History</h2>
                                    </div>
                                    <div className="divide-y max-h-80 overflow-y-auto">
                                        {history.length === 0 ? (
                                            <div className="p-6 text-center text-gray-500">
                                                No reputation history available
                                            </div>
                                        ) : (
                                            history.map((entry, index) => (
                                                <div key={index} className="p-4 hover:bg-gray-50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`font-bold ${entry.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {entry.change > 0 ? `+${entry.change}` : entry.change}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(entry.createdAt).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600">{entry.reason}</p>
                                                    {entry.issueId && (
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            Related Issue ID: {entry.issueId}
                                                        </p>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-md p-8 text-center">
                                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <p className="text-gray-500 mb-2">No user selected</p>
                                <p className="text-sm text-gray-400">Select a user from the list to manage their reputation</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminReputation;