import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import API from '../services/api';
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
            const response = await API.get('/issues?exclude_resolved=true');
            const raw = Array.isArray(response.data.data)
                ? response.data.data
                : Array.isArray(response.data)
                    ? response.data
                    : [];
            // Extra safety: strip any resolved/archived that slipped through
            setIssues(raw.filter(issue => issue.status !== 'resolved' && issue.status !== 'archived'));
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

    const trendingIssues = [...issues]
        .sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0))
        .slice(0, 3);

    // Group issues by identical address (Fixes the precise map-click variation issue)
    const groupedIssues = issues.reduce((acc, issue) => {
        // Check if location and address exist
        if (!issue.location || !issue.location.address) return acc;

        // Create a unique key based on the EXACT text address instead of numbers
        const key = issue.location.address;

        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(issue);
        return acc;
    }, {});

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            <div className="flex flex-grow overflow-hidden relative">

                {/* SIDEBAR */}
                <aside className="w-80 bg-slate-800 text-white flex flex-col shadow-lg z-10">
                    {/* <div className="p-5 border-b border-slate-600 flex-shrink-0">
                        <h2 className="text-xl font-bold mb-2 text-center">Indicators</h2>
                        <div className="flex flex-col gap-4 text-sm mt-4">
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
                        </div>
                    </div> */}
                    {/* TRENDING REPORTS SECTION */}
                    <div className="p-5 border-b border-slate-600 bg-slate-900/50">
                        <h2 className="text-xl font-bold mb-4 text-center text-orange-400">🔥 Trending</h2>
                        <div className="flex flex-col gap-3">
                            {trendingIssues.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm">No trending issues.</p>
                            ) : (
                                trendingIssues.map((issue, idx) => (
                                    <div key={`trend-${issue._id}`} className="bg-slate-800 p-3 rounded shadow border border-orange-500/50 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl">
                                            #{idx + 1}
                                        </div>
                                        <div className="flex items-center gap-2 mb-1 pr-6">
                                            <span className="text-orange-400 font-bold text-sm">👍 {issue.upvoteCount || 0}</span>
                                            <h3 className="font-bold capitalize text-blue-300 text-sm truncate">{issue.type} Issue</h3>
                                        </div>
                                        <p className="text-xs text-gray-300 line-clamp-2">{issue.description}</p>
                                        <Link
                                            to={`/dashboard?highlight=${issue._id}`}
                                            className="text-[10px] text-orange-400 hover:text-orange-300 mt-2 inline-block font-semibold"
                                        >
                                            View in Dashboard →
                                        </Link>
                                    </div>
                                ))
                            )}
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
                                                <img src={getIconForType(issue.type).options.iconUrl} alt="icon" className="w-5 h-5" />
                                                <h3 className="font-bold capitalize text-blue-300">{issue.type} Issue</h3>
                                            </div>
                                            <p className="text-sm text-gray-200">{issue.description}</p>

                                            {issue.image && (
                                                <img
                                                    src={`${import.meta.env.VITE_BACKEND_URL}${issue.image}`}
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

                {/* MAP AREA */}
                <main className="flex-grow relative z-0">
                    <MapContainer center={dhakaCenter} zoom={11} className="w-full h-full">
                        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {geoJsonData && <GeoJSON data={geoJsonData} style={{ color: "#2563EB", weight: 2, fillOpacity: 0.1 }} />}

                        {Object.values(groupedIssues).map((group) => {
                            // We use the first issue in the group to determine the coordinate and icon
                            const firstIssue = group[0];

                            // Create a unique key for the marker
                            const markerKey = `group-${firstIssue.location.lat}-${firstIssue.location.lng}`;

                            return (
                                <Marker
                                    key={markerKey}
                                    position={[firstIssue.location.lat, firstIssue.location.lng]}
                                    icon={getIconForType(firstIssue.type)}
                                >
                                    <Popup>
                                        {/* Scrollable container for multiple issues */}
                                        <div className="max-h-[250px] overflow-y-auto pr-2 w-48">
                                            <div className="mb-2 pb-2 border-b border-gray-300 sticky top-0 bg-white z-10">
                                                <strong className="text-blue-800">
                                                    {group.length} Issue{group.length > 1 ? 's' : ''} Here
                                                </strong>
                                                <div className="text-[10px] text-gray-500 leading-tight mt-1">
                                                    {firstIssue.location.address}
                                                </div>
                                            </div>

                                            {/* List out every issue at this location */}
                                            <div className="flex flex-col gap-3">
                                                {group.map((issue) => (
                                                    <div key={issue._id} className="bg-gray-50 p-2 rounded border border-gray-200">
                                                        <strong className="capitalize text-sm text-gray-800 flex items-center gap-1">
                                                            <span className="text-[10px]">{issue.type === 'accident' ? '🔴' : issue.type === 'disaster' ? '🟡' : '⚫'}</span>
                                                            {issue.type}
                                                        </strong>
                                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                                            {issue.description}
                                                        </p>
                                                        <Link
                                                            to={`/dashboard?highlight=${issue._id}`}
                                                            className="mt-2 block w-full py-1 bg-orange-500 text-white text-[10px] uppercase tracking-wider font-bold rounded hover:bg-orange-600 text-center transition-colors"
                                                        >
                                                            View in Dashboard
                                                        </Link>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </main>
            </div>
        </div>
    );
};

export default MapPage;