import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

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
    const [userName, setUserName] = useState('');
    const [nearbyIssues, setNearbyIssues] = useState([]);
    const [loadingLocation, setLoadingLocation] = useState(true);
    const [locationError, setLocationError] = useState('');

    useEffect(() => {
        const name = localStorage.getItem('userName') || 'User';
        setUserName(name);

        // Ask the browser for the user's current location
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
    }, []);

    const fetchAndFilterNearbyIssues = async (userLat, userLng) => {
        try {
            const token = localStorage.getItem('token');
            // Fetch issues, excluding resolved ones (thanks to the backend update we did earlier!)
            const response = await axios.get('http://localhost:5000/api/issues?exclude_resolved=true', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (Array.isArray(response.data)) {
                // Filter issues to only include those within a 5km radius
                const nearby = response.data.filter(issue => {
                    if (!issue.location || !issue.location.lat || !issue.location.lng) return false;
                    
                    const dist = calculateDistance(userLat, userLng, issue.location.lat, issue.location.lng);
                    issue.distance = dist; // Save the distance so we can display it
                    
                    return dist <= 3005; // Maximum radius in kilometers
                });

                // Sort them so the closest issues appear at the top of the list
                nearby.sort((a, b) => a.distance - b.distance);
                setNearbyIssues(nearby);
            }
        } catch (error) {
            console.error("Error fetching nearby issues:", error);
            setLocationError('Failed to load nearby issues.');
        } finally {
            setLoadingLocation(false);
        }
    };

    return (
        <div 
            className="h-screen overflow-hidden bg-cover bg-center flex items-stretch"
            style={{ 
                // CHANGE THIS FILENAME TO MATCH YOUR ACTUAL IMAGE IN THE PUBLIC FOLDER
                backgroundImage: "url('/pokemon.jpg')" 
            }}
        >
            {/* LEFT SIDE - Welcome Modal */}
            <div className="flex-grow flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center transform transition-all hover:scale-105">
                    <h1 className="text-3xl font-extrabold text-blue-900 mb-6">
                        Welcome, {userName}!
                    </h1>
                    
                    <div className="flex flex-col gap-4">
                        <Link 
                            to="/dashboard" 
                            className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 flex items-center justify-center gap-2"
                        >
                            📊 See All Current Reports
                        </Link>
                        
                        <Link 
                            to="/create-report" 
                            className="w-full py-3 px-4 bg-red-500 text-white font-bold rounded-lg shadow-md hover:bg-red-600 transition duration-300 flex items-center justify-center gap-2"
                        >
                            🚨 Report an Issue
                        </Link>
                        
                        <Link 
                            to="/map" 
                            className="w-full py-3 px-4 bg-green-500 text-white font-bold rounded-lg shadow-md hover:bg-green-600 transition duration-300 flex items-center justify-center gap-2"
                        >
                            🗺️ Go to MAP
                        </Link>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE - Nearby Issues Sidebar */}
            <div className="w-96 bg-white bg-opacity-95 shadow-2xl flex flex-col border-l border-gray-200">
                <div className="p-5 border-b border-gray-200 bg-blue-900 text-white flex-shrink-0">
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
                                    <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                        {issue.distance.toFixed(1)} km away
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{issue.description}</p>
                                <p className="text-[10px] text-gray-400 mb-3 block truncate">
                                    {issue.location.address}
                                </p>
                                <Link 
                                    to={`/dashboard?highlight=${issue._id}`} 
                                    className="block w-full py-2 bg-blue-50 text-blue-700 text-xs font-bold text-center rounded hover:bg-blue-100 transition-colors"
                                >
                                    View in Dashboard
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Home;