import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

    // Form State (Updated to match teammate's schema)
    const [showForm, setShowForm] = useState(false);
    const [newReport, setNewReport] = useState({
        title: '',
        category: 'pothole',
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
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/issues', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (Array.isArray(response.data)) {
                setIssues(response.data);
            } else {
                setIssues([]);
            }
        } catch (error) {
            console.error("Error fetching issues:", error);
            setIssues([]);
        }
    };

    // Updated icon logic to match teammate's new categories
    const getIconForCategory = (category) => {
        if (['flooding', 'drainage'].includes(category)) return iconDisaster;
        if (['broken_light', 'other'].includes(category)) return iconAccident;
        return iconRoad; // pothole, garbage, debris
    };

    const MapClickHandler = () => {
        useMapEvents({
            click: async (e) => {
                const { lat, lng } = e.latlng;
                setShowForm(true);
                setNewReport({ ...newReport, title: '', category: 'pothole', description: '', lat, lng, address: 'Loading address...' });

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
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const formData = new FormData();
            formData.append('title', newReport.title);
            formData.append('category', newReport.category);
            formData.append('description', newReport.description);
            formData.append('lat', newReport.lat);
            formData.append('lng', newReport.lng);
            formData.append('address', newReport.address);
            if (newReport.imageFile) {
                // Your teammate's uploader might use a different key, but we'll try 'image' or 'photos'
                formData.append('image', newReport.imageFile); 
            }

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
        <div className="flex flex-col min-h-[calc(100vh-64px)] bg-gray-100">
            <div className="flex flex-grow overflow-hidden relative">
                <aside className="w-80 bg-slate-800 text-white flex flex-col shadow-lg z-10">
                    <div className="p-5 border-b border-slate-600 flex-shrink-0">
                        <h2 className="text-xl font-bold mb-2 text-center">Indicators</h2>
                        <p className="text-xs text-center text-slate-400 mb-4">(Click anywhere on the map to report an issue!)</p>
                        <div className="flex flex-col gap-4 text-sm">
                            <div className="flex items-center gap-3">
                                <img src="/icon-black.png" alt="Road" className="w-6 h-6" />
                                <span><strong>Black:</strong> Pothole / Garbage / Debris</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <img src="/icon-yellow.png" alt="Disaster" className="w-6 h-6" />
                                <span><strong>Yellow:</strong> Flooding / Drainage</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <img src="/icon-red.png" alt="Accident" className="w-6 h-6" />
                                <span><strong>Red:</strong> Broken Light / Other</span>
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
                                    if (!issue.location) return null; 
                                    
                                    return (
                                        <div key={issue._id || Math.random()} className="bg-slate-700 p-4 rounded-lg shadow-md border border-slate-600">
                                            <div className="flex items-center gap-2 mb-2">
                                                <img src={getIconForCategory(issue.category).options.iconUrl} alt="icon" className="w-5 h-5" />
                                                <h3 className="font-bold capitalize text-blue-300">
                                                    {issue.title || issue.category?.replace('_', ' ')}
                                                </h3>
                                            </div>
                                            <p className="text-sm text-gray-200">{issue.description}</p>
                                            
                                            {/* --- THE IMAGE FIX --- */}
                                            {issue.photos && issue.photos.length > 0 && (
                                                <img 
                                                    src={issue.photos[0].url} 
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
                            if (!issue.location || !issue.location.lat || !issue.location.lng) return null;

                            return (
                                <Marker key={issue._id || Math.random()} position={[issue.location.lat, issue.location.lng]} icon={getIconForCategory(issue.category)}>
                                    <Popup>
                                        <strong className="capitalize">{issue.title || issue.category?.replace('_', ' ')}</strong><br/>
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

                                    {/* --- NEW TITLE INPUT --- */}
                                    <div className="mb-4">
                                        <label className="block text-gray-700 font-bold mb-2">Issue Title</label>
                                        <input 
                                            required 
                                            type="text"
                                            value={newReport.title} 
                                            onChange={(e) => setNewReport({...newReport, title: e.target.value})} 
                                            className="w-full p-2 border rounded" 
                                            placeholder="e.g., Massive Pothole on Main St"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-gray-700 font-bold mb-2">Category</label>
                                        <select value={newReport.category} onChange={(e) => setNewReport({...newReport, category: e.target.value})} className="w-full p-2 border rounded">
                                            <option value="pothole">Pothole</option>
                                            <option value="broken_light">Broken Light</option>
                                            <option value="drainage">Drainage</option>
                                            <option value="flooding">Flooding</option>
                                            <option value="garbage">Garbage</option>
                                            <option value="debris">Debris</option>
                                            <option value="other">Other</option>
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