import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import UserReputation from '../components/userReputation';

const UserProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchUserProfile();

        // Set up event listener for reputation updates
        window.addEventListener('reputationUpdated', fetchUserProfile);

        return () => {
            window.removeEventListener('reputationUpdated', fetchUserProfile);
        };
    }, []);

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await API.get('/auth/me');

            if (response.data.success) {
                setUser(response.data.user);
                // Update localStorage
                const userData = JSON.parse(localStorage.getItem('user') || '{}');
                userData.reputation = response.data.user.reputation;
                localStorage.setItem('user', JSON.stringify(userData));

                // Dispatch event for navbar to update
                window.dispatchEvent(new Event('userDataUpdated'));
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleManualRefresh = async () => {
        setRefreshing(true);
        await fetchUserProfile();
    };

    const getReputationLevel = (reputation) => {
        if (reputation >= 100) return { level: 'Gold Contributor', color: 'text-yellow-600', icon: '🏆' };
        if (reputation >= 50) return { level: 'Silver Contributor', color: 'text-gray-500', icon: '⭐' };
        if (reputation >= 20) return { level: 'Bronze Contributor', color: 'text-orange-600', icon: '🌟' };
        if (reputation >= 0) return { level: 'Active Member', color: 'text-blue-600', icon: '🌱' };
        return { level: 'Needs Improvement', color: 'text-red-600', icon: '⚠️' };
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F172A]"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">Failed to load profile</p>
                <button onClick={() => navigate('/dashboard')} className="mt-4 text-[#0F172A] hover:underline">
                    Back to Dashboard
                </button>
            </div>
        );
    }

    const reputationLevel = getReputationLevel(user.reputation);

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-4xl">
                {/* Profile Header */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
                    <div className="bg-[#FFA500] px-6 py-8">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-[#0F172A] text-4xl font-bold mb-4">
                                {user.name?.charAt(0).toUpperCase()}
                            </div>
                            <h1 className="text-2xl font-bold text-[#0F172A]">{user.name}</h1>
                            <p className="text-[#0F172A]">{user.email}</p>
                            <p className="text-[#0F172A] text-sm mt-1 capitalize">Role: {user.role}</p>
                        </div>
                    </div>
                </div>

                {/* Reputation Section */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-800">Reputation Score</h2>
                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            className="text-sm text-[#2c928d] hover:text-[#1E293B] flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-gray-600">Current Score</p>
                                <div className="flex items-center space-x-3 mt-1">
                                    <span className="text-4xl font-bold text-[#0F172A]">{user.reputation}</span>
                                    <span className={`font-semibold ${reputationLevel.color}`}>
                                        {reputationLevel.level}
                                    </span>
                                    <span className="text-xl">{reputationLevel.icon}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-600">Member Since</p>
                                <p className="font-medium text-gray-800">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {/* Reputation Progress Bar */}
                        <div className="mt-6">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Towards Next Level (100 pts)</span>
                                <span>{Math.min(user.reputation, 100)} / 100</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-[#0F172A] rounded-full h-2 transition-all duration-500"
                                    style={{ width: `${Math.min(Math.max(user.reputation, 0), 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* How to Earn */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-semibold text-gray-700 mb-2">How to earn reputation:</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-center justify-between">
                                    <span>Report a valid issue</span>
                                    <span className="text-[#2c928d] font-medium">+10 points</span>
                                </li>
                                <li className="flex items-center justify-between">
                                    <span>Your issue receives an upvote</span>
                                    <span className="text-[#2c928d] font-medium">+1 point per upvote</span>
                                </li>
                                <li className="flex items-center justify-between">
                                    <span>Admin marks your issue as resolved/verified</span>
                                    <span className="text-[#2c928d] font-medium">+20 points</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Reputation History */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b">
                        <h2 className="text-xl font-semibold text-gray-800">Reputation History</h2>
                    </div>
                    <div className="divide-y max-h-96 overflow-y-auto">
                        {user.reputationHistory && user.reputationHistory.length > 0 ? (
                            [...user.reputationHistory].reverse().map((entry, index) => (
                                <div key={index} className="p-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`font-bold ${entry.change > 0 ? 'text-[#2c928d]' : 'text-red-600'}`}>
                                            {entry.change > 0 ? `+${entry.change}` : entry.change}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(entry.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">{entry.reason}</p>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                No reputation history yet. Start by reporting issues!
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-center space-x-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-2 bg-[#0F172A] text-white rounded-lg hover:bg-[#1E293B] transition"
                    >
                        Back to Dashboard
                    </button>
                    <button
                        onClick={() => navigate('/create-report')}
                        className="px-6 py-2 bg-[#2c928d] text-white rounded-lg hover:bg-green-700 transition"
                    >
                        Report New Issue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;