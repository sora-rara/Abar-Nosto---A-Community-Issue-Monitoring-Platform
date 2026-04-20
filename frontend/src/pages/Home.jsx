import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import authService from '../services/auth';

const Home = () => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');

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

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = authService.getCurrentUser();

        if (!token || !user) {
            navigate('/login');
        } else {
            setUserName(user.name || localStorage.getItem('userName') || 'User');
        }
    }, [navigate]);

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
                        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                        const address = response.data.display_name || 'Unknown Location';
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
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
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
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const formData = new FormData();
            formData.append('type', newReport.type);
            formData.append('description', newReport.description);
            formData.append('lat', newReport.lat);
            formData.append('lng', newReport.lng);
            formData.append('address', newReport.address);
            if (newReport.imageFile) {
                formData.append('image', newReport.imageFile);
            }

            await axios.post('http://localhost:5000/api/issues', formData, config);

            setShowForm(false);
            alert('Issue reported successfully! Check the Map page to see your new pin.');
        } catch (error) {
            console.error("Error submitting issue:", error);
            alert('Failed to report issue. Please try again.');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            {/* Main Content Area with Image Background */}
            <main
                className="flex flex-col items-center justify-center flex-grow bg-center bg-cover relative"
                style={{ backgroundImage: "url('/pokemon.jpg')" }}
            >
                <div className="p-8 text-center bg-white shadow-xl bg-opacity-90 rounded-lg max-w-lg w-full">
                    <h2 className="text-3xl font-bold text-blue-800 mb-6">Welcome, {userName}!</h2>

                    <div className="flex flex-col gap-4 mt-6">
                        <Link to="/map" className="w-full px-6 py-4 font-bold text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-lg">
                            🗺️ View City Map & Live Issues
                        </Link>

                        {/* Quick Report Button */}
                        <button
                            onClick={handleQuickReport}
                            className="w-full px-6 py-4 font-bold text-white bg-red-500 rounded-lg shadow-lg hover:bg-red-600 transition-colors text-lg flex items-center justify-center gap-2"
                        >
                            🚨 Quick Report an Issue Here
                        </button>
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
            </main>
        </div>
    );
};

export default Home;