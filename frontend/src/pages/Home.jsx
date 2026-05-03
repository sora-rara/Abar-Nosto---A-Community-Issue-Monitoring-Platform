import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import authService from '../services/auth';

// The Haversine formula calculates the straight-line distance between two GPS coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
};

const Home = () => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');

    // --- SIDEBAR STATE ---
    const [nearbyIssues, setNearbyIssues] = useState([]);
    const [loadingLocation, setLoadingLocation] = useState(true);
    const [locationError, setLocationError] = useState('');

    // --- FORM STATE ---
    const [showForm, setShowForm] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [newReport, setNewReport] = useState({
        type: 'road',
        description: '',
        lat: '',
        lng: '',
        address: '',
        imageFile: null
    });

    // --- INITIAL LOAD & AUTH CHECK ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = authService.getCurrentUser();

        if (!token || !user) {
            navigate('/login');
            return;
        } else {
            setUserName(user.name || localStorage.getItem('userName') || 'User');
        }

        // Ask the browser for the user's current location for the sidebar
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    fetchAndFilterNearbyIssues(userLat, userLng);
                },
                (error) => {
                    console.error("Location error:", error);
                    setLocationError('Please enable location permissions to see nearby issues.');
                    setLoadingLocation(false);
                }
            );
        } else {
            setLocationError('Geolocation is not supported by your browser.');
            setLoadingLocation(false);
        }
    }, [navigate]);

    // --- FETCH SIDEBAR ISSUES ---
    const fetchAndFilterNearbyIssues = async (userLat, userLng) => {
        try {
            const response = await API.get('/issues?exclude_resolved=true');

            const allIssues = Array.isArray(response.data.data)
                ? response.data.data
                : Array.isArray(response.data)
                    ? response.data
                    : [];

            const nearby = allIssues.filter(issue => {
                if (!issue.location || !issue.location.lat || !issue.location.lng) return false;

                const dist = calculateDistance(userLat, userLng, issue.location.lat, issue.location.lng);
                issue.distance = dist;

                // NOTE: Currently set to 3005km for your testing! Change to 5 when deploying.
                return dist <= 3005;
            });

            nearby.sort((a, b) => a.distance - b.distance);
            setNearbyIssues(nearby);
        } catch (error) {
            console.error("Error fetching nearby issues:", error);
            setLocationError('Failed to load nearby issues.');
        } finally {
            setLoadingLocation(false);
        }
    };

    // --- QUICK REPORT GPS LOGIC ---
    const handleQuickReport = () => {
        if (navigator.geolocation) {
            setIsLocating(true);
            setShowForm(true);
            setNewReport({ type: 'road', description: '', lat: '', lng: '', address: 'Pinpointing your location...', imageFile: null });

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    setNewReport(prev => ({ ...prev, lat, lng, address: 'Fetching street name...' }));

                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                        {
                            headers: {
                                'User-Agent': 'AbarNosto/1.0'
                            }
                        }
                    );
                    const data = await response.json();
                    const address = data.display_name || 'Unknown Location';
                    setNewReport(prev => ({ ...prev, address }));
                    setIsLocating(false);
                } catch (error) {
                    setNewReport(prev => ({ ...prev, address: 'Could not fetch address' }));
                    setIsLocating(false);
                }
                },
                (error) => {
                    console.error("GPS Error Details:", error);
                    setIsLocating(false);
                    setNewReport(prev => ({
                        ...prev,
                        lat: 23.8103,
                        lng: 90.4125,
                        address: 'Location blocked. Please describe the area in your description!'
                    }));
                    alert(`We couldn't grab your exact GPS (Browser error code: ${error.code}). We've opened the form anyway so you can still report!`);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };

    // --- SUBMIT THE FORM ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');


            const formData = new FormData();
            formData.append('type', newReport.type);
            formData.append('description', newReport.description);
            formData.append('lat', newReport.lat);
            formData.append('lng', newReport.lng);
            formData.append('address', newReport.address);
            if (newReport.imageFile) {
                formData.append('image', newReport.imageFile);
            }

            await API.post('/issues', formData);

            setShowForm(false);
            alert('Issue reported successfully! Check the Map page to see your new pin.');

            // Optional: Refresh the nearby issues sidebar after submitting
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    fetchAndFilterNearbyIssues(pos.coords.latitude, pos.coords.longitude);
                });
            }

        } catch (error) {
            console.error("Error submitting issue:", error);
            alert('Failed to report issue. Please try again.');
        }
    };

    return (
        <div
            className="h-screen overflow-hidden bg-cover bg-center flex items-stretch relative"
            style={{ backgroundImage: "url('/ginyard.jpg')" }}
        >
            {/* LEFT SIDE - Welcome Modal */}
            <div className="flex-grow flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center transform transition-all hover:scale-105">
                    <h1 className="text-3xl font-bold text-[#0F172A] mb-6">
                        Welcome, {userName}!
                    </h1>

                    <div className="flex flex-col gap-4">
                        <Link
                            to="/dashboard"
                            className="w-full py-3 px-4 bg-[#DCE7FF] text-[#0F172A] font-bold rounded-lg shadow-md hover:bg-[#B8C8F0] transition duration-300 flex items-center justify-center gap-2"
                        >
                            See All Current Issues
                        </Link>

                        {/* <button
                            onClick={handleQuickReport}
                            className="w-full py-3 px-4 bg-[#DCE7FF] text-[#0F172A] font-bold rounded-lg shadow-md hover:bg-[#B8C8F0] transition duration-300 flex items-center justify-center gap-2"
                        >
                            Quick Report an Issue Here
                        </button> */}

                        <Link
                            to="/map"
                            className="w-full py-3 px-4 bg-[#DCE7FF] text-[#0F172A] font-bold rounded-lg shadow-md hover:bg-[#B8C8F0] transition duration-300 flex items-center justify-center gap-2"
                        >
                            Go to MAP
                        </Link>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE - Nearby Issues Sidebar */}
            <div className="w-70 bg-white bg-opacity-95 shadow-2xl flex flex-col border-l border-gray-200">
                <div className="p-5 border-b border-gray-200 bg-[#0F172A] text-white flex-shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        📍 Issues Near You
                    </h2>
                    <p className="text-sm text-blue-200 mt-1">Within a 5km radius</p>
                </div>

                <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-4">
                    {loadingLocation ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900 mb-3"></div>
                            <p>Finding your location...</p>
                        </div>
                    ) : locationError ? (
                        <div className="text-center text-red-500 p-4 bg-red-50 rounded-lg border border-red-100">
                            {locationError}
                        </div>
                    ) : nearbyIssues.length === 0 ? (
                        <div className="text-center text-gray-500 p-4">
                            <span className="text-4xl mb-2 block">🌿</span>
                            <p>All clear! No reported issues within 5km of your current location.</p>
                        </div>
                    ) : (
                        nearbyIssues.map((issue) => (
                            <div key={issue._id} className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:border-blue-400 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-800 capitalize text-sm">{issue.type} Issue</h3>
                                    <span className="text-xs font-bold bg-orange-100 px-2 py-1 rounded" style={{ color: '#FFA500' }}>
                                        {issue.distance.toFixed(1)} km away
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{issue.description}</p>
                                <p className="text-[10px] text-gray-400 mb-3 block truncate">
                                    {issue.location.address}
                                </p>
                                <Link
                                    to={`/dashboard?highlight=${issue._id}`}
                                    className="block w-full py-2 bg-[#DCE7FF] text-[#0F172A] text-xs font-bold text-center rounded hover:bg-[#B8C8F0] transition-colors"
                                >
                                    View in Dashboard
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* --- REPORT FORM MODAL OVERLAY --- */}
            {showForm && (
                <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-60 flex items-center justify-center z-[1000] p-4">
                    <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md">
                        <h2 className="text-2xl font-bold text-blue-800 mb-4">Report an Issue</h2>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-bold mb-2">Your Current Location</label>
                                <p className="text-sm text-gray-800 bg-gray-200 p-3 rounded border border-gray-300 font-medium">
                                    {newReport.address}
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 font-bold mb-2">Issue Type</label>
                                <select
                                    value={newReport.type}
                                    onChange={(e) => setNewReport({ ...newReport, type: e.target.value })}
                                    className="w-full p-2 border rounded focus:outline-none focus:border-blue-500 bg-gray-50"
                                >
                                    <option value="road">Road/Drain Issue</option>
                                    <option value="accident">Fatal Accident / Fire</option>
                                    <option value="disaster">Natural Disaster</option>
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 font-bold mb-2">Description</label>
                                <textarea
                                    required
                                    value={newReport.description}
                                    onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                                    className="w-full p-2 border rounded focus:outline-none focus:border-blue-500 bg-gray-50"
                                    rows="3"
                                    placeholder="Describe the issue..."
                                ></textarea>
                            </div>

                            <div className="mb-6">
                                <label className="block text-gray-700 font-bold mb-2">Upload Photo (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setNewReport({ ...newReport, imageFile: e.target.files[0] })}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 font-bold rounded hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLocating}
                                    className={`px-4 py-2 font-bold text-white rounded ${isLocating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    {isLocating ? 'Locating...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;