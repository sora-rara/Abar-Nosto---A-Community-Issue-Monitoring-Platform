import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- CUSTOM ICONS ---
const iconRoad = new L.Icon({ iconUrl: '/icon-black.png', iconSize: [35, 35], iconAnchor: [17, 35] });
const iconAccident = new L.Icon({ iconUrl: '/icon-red.png', iconSize: [35, 35], iconAnchor: [17, 35] });
const iconDisaster = new L.Icon({ iconUrl: '/icon-yellow.png', iconSize: [35, 35], iconAnchor: [17, 35] });

const dhakaCenter = [23.8103, 90.4125];

const MapPage = () => {
    const navigate = useNavigate();
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [issues, setIssues] = useState([]); 

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [newReport, setNewReport] = useState({
        type: 'road',
        description: '',
        lat: '',
        lng: '',
        address: 'Fetching address...',
        imageFile: null
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        
        fetch('/dhaka-borders.json')
            .then(res => res.json())
            .then(data => setGeoJsonData(data))
            .catch(err => console.error("Error loading GeoJSON:", err));

        fetchIssues();
    }, [navigate]);

    const fetchIssues = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/issues');
            // SAFETY NET 1: Ensure we only set the array if the backend actually sent an array!
            if (Array.isArray(response.data)) {
                setIssues(response.data);
            } else {
                console.error("Backend did not send an array:", response.data);
                setIssues([]);
            }
        } catch (error) {
            console.error("Error fetching issues:", error);
            setIssues([]);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        navigate('/login');
    };

    const getIconForType = (type) => {
        if (type === 'accident') return iconAccident;
        if (type === 'disaster') return iconDisaster;
        return iconRoad; 
    };

    const MapClickHandler = () => {
        useMapEvents({
            click: async (e) => {
                const { lat, lng } = e.latlng;
                setShowForm(true);
                setNewReport({ ...newReport, type: 'road', description: '', lat, lng, address: 'Loading address...' });

                try {
                    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const address = response.data.display_name || 'Unknown Location';
                    setNewReport(prev => ({ ...prev, address }));
                } catch (error) {
                    setNewReport(prev => ({ ...prev, address: 'Could not fetch address' }));
                }
            }
        });
        return null;
    };

    const handleSubmit = async (e) => {
            e.preventDefault();
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } }; // Axios is smart enough to set the multipart header automatically!

                // Create a new FormData object
                const formData = new FormData();
                formData.append('type', newReport.type);
                formData.append('description', newReport.description);
                formData.append('lat', newReport.lat);
                formData.append('lng', newReport.lng);
                formData.append('address', newReport.address);
                if (newReport.imageFile) {
                    formData.append('image', newReport.imageFile);
                }

                // Send the formData instead of the JSON object
                await axios.post('http://localhost:5000/api/issues', formData, config);
                
                setShowForm(false);
                fetchIssues(); 
                alert('Issue reported successfully!');
            } catch (error) {
                console.error("Error submitting issue:", error);
                alert('Failed to report issue. Please try again.');
            }
        };

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            <header className="flex items-center justify-between p-4 text-white bg-blue-600 shadow-md z-20 relative">
                <button onClick={handleLogout} className="px-4 py-2 text-sm bg-blue-800 rounded hover:bg-red-600">Logout</button>
                <h1 className="text-xl font-bold">Abar Nosto!</h1>
                <div className="flex gap-4">
                    <Link to="/dashboard" className="px-4 py-2 text-sm bg-blue-800 rounded hover:bg-blue-900">Home</Link>
                    <button className="px-4 py-2 text-sm font-bold bg-green-500 rounded hover:bg-green-600">🗺️ Map</button>
                </div>
            </header>

            <div className="flex flex-grow overflow-hidden relative">
                <aside className="w-80 bg-slate-800 text-white flex flex-col shadow-lg z-10">
                    <div className="p-5 border-b border-slate-600 flex-shrink-0">
                        <h2 className="text-xl font-bold mb-2 text-center">Indicators</h2>
                        <p className="text-xs text-center text-slate-400 mb-4">(Click anywhere on the map to report an issue!)</p>
                        <div className="flex flex-col gap-4 text-sm">
                            <div className="flex items-center gap-3">
                                <img src="/icon-black.png" alt="Road" className="w-6 h-6" />
                                <span><strong>Black:</strong> Road/Drain Issue</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <img src="/icon-yellow.png" alt="Disaster" className="w-6 h-6" />
                                <span><strong>Yellow:</strong> Natural Disaster</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <img src="/icon-red.png" alt="Accident" className="w-6 h-6" />
                                <span><strong>Red:</strong> Fatal Accident / Fire</span>
                            </div>
                            <div>  
                                <span><strong>N.B.:</strong> TO REPORT CLICK ON THE EXACT LOCATION ON THE MAP. </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 flex-grow overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-center">LIVE REPORTS</h2>
                        <div className="flex flex-col gap-4">
                            {issues.length === 0 ? (
                                <p className="text-center text-gray-400">No issues reported yet.</p>
                            ) : (
                                issues.map((issue) => {
                                    // SAFETY NET 2: Skip rendering if location data is missing
                                    if (!issue.location) return null; 
                                    
                                    return (
                                        <div key={issue._id || Math.random()} className="bg-slate-700 p-4 rounded-lg shadow-md border border-slate-600">
                                            <div className="flex items-center gap-2 mb-2">
                                                <img src={getIconForType(issue.type).options.iconUrl} alt="icon" className="w-5 h-5" />
                                                <h3 className="font-bold capitalize text-blue-300">{issue.type} Issue</h3>
                                            </div>
                                            <p className="text-sm text-gray-200">{issue.description}</p>
                                            {/* RENDER THE IMAGE IF IT EXISTS */}
                                            {issue.image && (
                                                <img 
                                                    src={`http://localhost:5000${issue.image}`} 
                                                    alt="Issue" 
                                                    className="w-full h-32 object-cover rounded mt-3 border border-slate-500"
                                                />
                                            )}
                                            <p className="text-xs text-gray-400 mt-3 font-semibold">📍 {issue.location.address}</p>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </aside>

                <main className="flex-grow relative z-0">
                    <MapContainer center={dhakaCenter} zoom={11} className="w-full h-full cursor-crosshair">
                        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        
                        {geoJsonData && <GeoJSON data={geoJsonData} style={{ color: "#2563EB", weight: 2, fillOpacity: 0.1 }} />}

                        {issues.map((issue) => {
                            // SAFETY NET 3: Skip placing the marker if GPS coordinates are missing
                            if (!issue.location || !issue.location.lat || !issue.location.lng) return null;

                            return (
                                <Marker key={issue._id || Math.random()} position={[issue.location.lat, issue.location.lng]} icon={getIconForType(issue.type)}>
                                    <Popup>
                                        <strong className="capitalize">{issue.type} Issue</strong><br/>
                                        {issue.description}<br/>
                                        <span className="text-xs text-gray-500">{issue.location.address}</span>
                                    </Popup>
                                </Marker>
                            )
                        })}

                        <MapClickHandler />
                    </MapContainer>

                    {showForm && (
                        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                            <div className="bg-white p-6 rounded-lg shadow-2xl w-96">
                                <h2 className="text-2xl font-bold text-blue-800 mb-4">Report an Issue</h2>
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 font-bold mb-2">Location</label>
                                        <p className="text-sm text-gray-600 bg-gray-100 p-2 rounded">{newReport.address}</p>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 font-bold mb-2">Issue Type</label>
                                        <select value={newReport.type} onChange={(e) => setNewReport({...newReport, type: e.target.value})} className="w-full p-2 border rounded">
                                            <option value="road">Road/Drain Issue</option>
                                            <option value="accident">Fatal Accident / Fire</option>
                                            <option value="disaster">Natural Disaster</option>
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 font-bold mb-2">Upload Photo (Optional)</label>
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={(e) => setNewReport({...newReport, imageFile: e.target.files[0]})}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                    </div>
                                    <div className="mb-6">
                                        <label className="block text-gray-700 font-bold mb-2">Description</label>
                                        <textarea required value={newReport.description} onChange={(e) => setNewReport({...newReport, description: e.target.value})} className="w-full p-2 border rounded" rows="3" placeholder="Describe the issue..."></textarea>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
                                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold">Submit Report</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default MapPage;