import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const PreferencesPage = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loadingNotifs, setLoadingNotifs] = useState(true);
    const [prefs, setPrefs] = useState({
        enableAll: true,
        onNearbyIssue: true,
        onStatusChange: true,
        onNewComment: true,
        onUpvoteReceived: true,
        onIssueArchived: true,        // ✅ new
        onIssueReactivated: true,
        nearbyRadius: 1000,
        savedLocation: null
    });
    const [saving, setSaving] = useState(false);
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState('');

    const settingsCardRef = useRef(null);
    const notificationCardRef = useRef(null);

    // Fetch recent notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await API.get('/notifications?limit=50');
                setNotifications(res.data.data || []);
            } catch (err) {
                console.error('Failed to fetch notifications:', err);
            } finally {
                setLoadingNotifs(false);
            }
        };
        fetchNotifications();
    }, []);

    // Fetch current preferences
    useEffect(() => {
        const fetchPrefs = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await API.get('/preferences');
                const data = res.data.data;
                setPrefs({
                    enableAll: data.enableAll ?? true,
                    onNearbyIssue: data.onNearbyIssue ?? true,
                    onStatusChange: data.onStatusChange ?? true,
                    onNewComment: data.onNewComment ?? true,
                    onUpvoteReceived: data.onUpvoteReceived ?? true,
                    onIssueArchived: data.onIssueArchived ?? true,
                    onIssueReactivated: data.onIssueReactivated ?? true,
                    nearbyRadius: data.nearbyRadius ?? 1000,
                    savedLocation: data.savedLocation || null
                });
            } catch (err) {
                console.error('Failed to fetch preferences:', err);
            }
        };
        fetchPrefs();
    }, []);

    // Dynamically match notification card height to settings card height
    useEffect(() => {
        const updateHeight = () => {
            if (settingsCardRef.current && notificationCardRef.current) {
                const settingsHeight = settingsCardRef.current.offsetHeight;
                notificationCardRef.current.style.height = `${settingsHeight}px`;
            }
        };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, [notifications, prefs, loadingNotifs]);

    const updatePreference = (key, value) => {
        setPrefs(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await API.put('/preferences', prefs);
            alert('Preferences saved successfully!');
        } catch (err) {
            console.error('Save error:', err);
            alert('Failed to save preferences');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveLocation = () => {
        setLocationError('');
        setLocating(true);
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            setLocating(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const savedLocation = {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                };
                updatePreference('savedLocation', savedLocation);
                setLocating(false);
                alert('Location saved! Click "Save Changes" to keep it.');
            },
            (error) => {
                console.error('Geolocation error:', error);
                setLocationError('Unable to get your location. Please enable location access.');
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // ✅ Mark a single notification as read
    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await API.put(`/notifications/${id}/read`);
            // Update local state
            setNotifications(prev =>
                prev.map(n => (n._id === id ? { ...n, read: true } : n))
            );
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    // ✅ Handle click on a notification
    const handleNotificationClick = (notif) => {
        if (!notif.read) {
            markAsRead(notif._id);
        }
        if (notif.relatedIssue?._id) {
            navigate(`/complaint/${notif.relatedIssue._id}`);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Notifications</h1>
            <p className="text-gray-600 mb-8">Stay updated on issues near you!</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left column – Recent Notifications */}
                <div>
                    <h2 className="text-xl font-semibold mb-3" style={{ color: '#FFA500' }}>Recent Notifications</h2>
                    <div
                        ref={notificationCardRef}
                        className="rounded-xl shadow-md overflow-hidden flex flex-col"
                        style={{ backgroundColor: '#DCE7FF' }}
                    >
                        <div className="px-6 py-3 flex justify-end border-b border-blue-200">
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="text-sm text-blue-700 hover:text-blue-900"
                            >
                                View all →
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {loadingNotifs ? (
                                <div className="p-8 text-center text-gray-500">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No notifications yet</div>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif._id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className="p-4 hover:bg-white/50 transition border-b border-blue-200 cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-gray-800">{notif.title}</h3>
                                                <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                                                <p className="text-xs text-gray-400 mt-2">{formatTime(notif.createdAt)}</p>
                                            </div>
                                            {!notif.read && (
                                                <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">New</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right column – Settings */}
                <div>
                    <h2 className="text-xl font-semibold mb-3" style={{ color: '#FFA500' }}>Settings</h2>
                    <p className="text-sm text-gray-500 mb-3">Customize what alerts you receive</p>
                    <div
                        ref={settingsCardRef}
                        className="rounded-xl shadow-md overflow-hidden flex flex-col"
                        style={{ backgroundColor: '#DCE7FF' }}
                    >
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-800 mb-3">Alert Types</h3>
                                <div className="space-y-3">
                                    <label className="flex items-start space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={prefs.onNearbyIssue}
                                            onChange={(e) => updatePreference('onNearbyIssue', e.target.checked)}
                                            className="mt-1 w-4 h-4 text-blue-600 rounded"
                                        />
                                        <div>
                                            <span className="font-medium text-gray-700">Nearby Issues</span>
                                            <p className="text-sm text-gray-500">Issues reported in your area</p>
                                        </div>
                                    </label>
                                    <label className="flex items-start space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={prefs.onStatusChange}
                                            onChange={(e) => updatePreference('onStatusChange', e.target.checked)}
                                            className="mt-1 w-4 h-4 text-blue-600 rounded"
                                        />
                                        <div>
                                            <span className="font-medium text-gray-700">Status Updates</span>
                                            <p className="text-sm text-gray-500">When your reports change status</p>
                                        </div>
                                    </label>
                                    <label className="flex items-start space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={prefs.onNewComment}
                                            onChange={(e) => updatePreference('onNewComment', e.target.checked)}
                                            className="mt-1 w-4 h-4 text-blue-600 rounded"
                                        />
                                        <div>
                                            <span className="font-medium text-gray-700">Comments</span>
                                            <p className="text-sm text-gray-500">Replies on your reports</p>
                                        </div>
                                    </label>
                                    <label className="flex items-start space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={prefs.onUpvoteReceived}
                                            onChange={(e) => updatePreference('onUpvoteReceived', e.target.checked)}
                                            className="mt-1 w-4 h-4 text-blue-600 rounded"
                                        />
                                        <div>
                                            <span className="font-medium text-gray-700">Upvotes on my reports</span>
                                            <p className="text-sm text-gray-500">When someone upvotes your issue</p>
                                        </div>
                                    </label>
                                    <label className="flex items-start space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={prefs.onIssueArchived}
                                            onChange={(e) => updatePreference('onIssueArchived', e.target.checked)}
                                            className="mt-1 w-4 h-4 text-blue-600 rounded"
                                        />
                                        <div>
                                            <span className="font-medium text-gray-700">Issue Archived</span>
                                            <p className="text-sm text-gray-500">When an issue you follow is archived</p>
                                        </div>
                                    </label>
                                    <label className="flex items-start space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={prefs.onIssueReactivated}
                                            onChange={(e) => updatePreference('onIssueReactivated', e.target.checked)}
                                            className="mt-1 w-4 h-4 text-blue-600 rounded"
                                        />
                                        <div>
                                            <span className="font-medium text-gray-700">Issue Reactivated</span>
                                            <p className="text-sm text-gray-500">When an archived issue is reopened</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="border-t border-blue-200 pt-6">
                                <h3 className="text-lg font-medium text-gray-800 mb-3">Notification Radius</h3>
                                <p className="text-sm text-gray-500 mb-3">Receive alerts for issues within:</p>
                                <select
                                    value={prefs.nearbyRadius}
                                    onChange={(e) => updatePreference('nearbyRadius', parseInt(e.target.value))}
                                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value={500}>500 meters</option>
                                    <option value={1000}>1 km</option>
                                    <option value={2000}>2 km</option>
                                    <option value={5000}>5 km</option>
                                    <option value={10000}>10 km</option>
                                </select>
                            </div>

                            <div className="border-t border-blue-200 pt-6">
                                <h3 className="text-lg font-medium text-gray-800 mb-3">Your Location for Nearby Alerts</h3>
                                <p className="text-sm text-gray-500 mb-3">
                                    {prefs.savedLocation ? '✅ Location saved' : '❌ No location saved'}
                                </p>
                                <button
                                    onClick={handleSaveLocation}
                                    disabled={locating}
                                    className="px-4 py-2 bg-[#FFA500] text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {locating ? 'Getting location...' : '📍 Save my current location'}
                                </button>
                                {locationError && <p className="text-red-500 text-sm mt-2">{locationError}</p>}
                                <p className="text-xs text-gray-400 mt-2">
                                    We'll notify you about issues reported within your chosen radius.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 pb-6 pt-0">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-[#0F172A] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreferencesPage;