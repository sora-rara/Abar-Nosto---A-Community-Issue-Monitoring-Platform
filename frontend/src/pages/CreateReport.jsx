import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Captcha from '../components/Captcha';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Location Picker Component that allows clicking on map to set location
const LocationPicker = ({ position, onPositionChange }) => {
    const map = useMapEvents({
        click(e) {
            onPositionChange([e.latlng.lat, e.latlng.lng]);
        },
    });

    return position ? (
        <Marker
            position={position}
            draggable={true}
            eventHandlers={{
                dragend: (e) => {
                    const marker = e.target;
                    const newPos = marker.getLatLng();
                    onPositionChange([newPos.lat, newPos.lng]);
                }
            }}
        />
    ) : null;
};

const categories = [
    { value: 'pothole', label: 'Potholes', icon: '🕳️', description: 'Road surface damage' },
    { value: 'broken_light', label: 'Broken Street Lights', icon: '💡', description: 'Non-functional lighting' },
    { value: 'drainage', label: 'Drainage Problems', icon: '🌊', description: 'Blocked or broken drains' },
    { value: 'flooding', label: 'Flooding', icon: '💧', description: 'Waterlogging and floods' },
    { value: 'hazard', label: 'Surrounding Hazards', icon: '⚠️', description: 'Safety risks nearby' },
    { value: 'other', label: 'View more', icon: '📌', description: 'Other issues' }
];

const CreateReport = () => {
    const navigate = useNavigate();
    const captchaRef = useRef(null);
    
    const [submitting, setSubmitting] = useState(false);
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState('');
    const [locationLoading, setLocationLoading] = useState(true);
    const [locationUpdating, setLocationUpdating] = useState(false);
    const [nearbyIssues, setNearbyIssues] = useState([]);
    const [loadingNearby, setLoadingNearby] = useState(false);

    // Map is now always visible, no need for showMap state
    const [isUpdatingFromMap, setIsUpdatingFromMap] = useState(false);
    
    // New state for captcha
    const [captchaToken, setCaptchaToken] = useState(null);
    const [captchaError, setCaptchaError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        address: 'Detecting your location...',
        ward: 'Detecting...',
        area: 'Detecting...',
        road: 'Detecting...'
    });

    const [photos, setPhotos] = useState([]);
    const [previews, setPreviews] = useState([]);

    // Calculate distance between two points
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    // Parse address into components
    const parseAddress = (addressString) => {
        if (!addressString) return { ward: 'Unknown', area: 'Unknown', road: 'Unknown' };

        const parts = addressString.split(',').map(p => p.trim());
        return {
            ward: parts[0] || 'Unknown',
            area: parts[1] || 'Unknown',
            road: parts[2] || 'Unknown'
        };
    };

    // Handle location selection from map (now updates immediately)
    const handleMapLocationSelect = async (newPos) => {
        const [lat, lng] = newPos;
        setIsUpdatingFromMap(true);

        try {
            // Update location immediately
            setLocation({ lat, lng });

            // Get address for the selected location
            const response = await axios.get(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const address = response.data.display_name;
            const parsed = parseAddress(address);

            setFormData(prev => ({
                ...prev,
                address: address,
                ward: parsed.ward,
                area: parsed.area,
                road: parsed.road
            }));

            // Fetch nearby issues for new location
            await fetchNearbyIssues(lat, lng);

        } catch (error) {
            const coordAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            setFormData(prev => ({
                ...prev,
                address: coordAddress,
                ward: 'Unknown',
                area: 'Unknown',
                road: 'Unknown'
            }));

            await fetchNearbyIssues(lat, lng);
        } finally {
            setIsUpdatingFromMap(false);
        }
    };

    // Main function to get location and update everything
    const getCurrentLocation = async (showLoading = true) => {
        if (showLoading) setLocationUpdating(true);

        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                setLocationError('Geolocation is not supported by your browser');
                if (showLoading) setLocationUpdating(false);
                reject('Geolocation not supported');
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocation({ lat: latitude, lng: longitude });

                    try {
                        // Get address from coordinates
                        const response = await axios.get(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                        );
                        const address = response.data.display_name;
                        const parsed = parseAddress(address);

                        setFormData(prev => ({
                            ...prev,
                            address: address,
                            ward: parsed.ward,
                            area: parsed.area,
                            road: parsed.road
                        }));

                        // Fetch nearby issues with new location
                        await fetchNearbyIssues(latitude, longitude);

                        resolve({ lat: latitude, lng: longitude, address });

                    } catch (error) {
                        const coordAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                        setFormData(prev => ({
                            ...prev,
                            address: coordAddress,
                            ward: 'Unknown',
                            area: 'Unknown',
                            road: 'Unknown'
                        }));

                        await fetchNearbyIssues(latitude, longitude);
                        resolve({ lat: latitude, lng: longitude, address: coordAddress });
                    } finally {
                        if (showLoading) setLocationUpdating(false);
                        setLocationLoading(false);
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    setLocationError('Please enable location access to report issues');
                    if (showLoading) setLocationUpdating(false);
                    setLocationLoading(false);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    };

    // Initial location fetch on mount
    useEffect(() => {
        getCurrentLocation(true);
    }, []);

    // Fetch nearby issues from backend
    const fetchNearbyIssues = async (lat, lng) => {
        if (!lat || !lng) return;

        setLoadingNearby(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await axios.get(
                `http://localhost:5000/api/reports/nearby?lat=${lat}&lng=${lng}&radius=500`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const issuesWithDistance = (response.data.reports || []).map(report => ({
                ...report,
                distance: calculateDistance(
                    lat,
                    lng,
                    report.location.lat,
                    report.location.lng
                )
            })).sort((a, b) => a.distance - b.distance);

            setNearbyIssues(issuesWithDistance);

        } catch (error) {
            console.error('Error fetching nearby issues:', error);
            if (error.response?.status === 401) {
                alert('Session expired. Please login again.');
                localStorage.removeItem('token');
                localStorage.removeItem('userName');
                navigate('/login');
            }
        } finally {
            setLoadingNearby(false);
        }
    };

    // Handle live location button click
    const handleLiveLocation = async () => {
        try {
            await getCurrentLocation(true);
            alert('📍 Location updated successfully!');
        } catch (error) {
            alert('Failed to update location. Please try again.');
        }
    };

    // Handle view all nearby issues
    const handleViewAllNearby = () => {
        console.log('View all nearby issues:', nearbyIssues);
        alert(`Found ${nearbyIssues.length} nearby issues`);
    };

    // Handle file drop
    const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
        if (rejectedFiles && rejectedFiles.length > 0) {
            alert('Some files were rejected. Please upload images only (max 5MB)');
            return;
        }

        if (photos.length + acceptedFiles.length > 5) {
            alert('Maximum 5 photos allowed');
            return;
        }

        const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...newPreviews]);
        setPhotos(prev => [...prev, ...acceptedFiles]);
    }, [photos.length]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
        },
        maxSize: 5 * 1024 * 1024,
        maxFiles: 5
    });

    const removePhoto = (index) => {
        if (previews[index]) {
            URL.revokeObjectURL(previews[index]);
        }
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    // Handle captcha verification
    const handleCaptchaVerify = (token) => {
        setCaptchaToken(token);
        setCaptchaError('');
        if (token) {
            console.log('CAPTCHA verified successfully');
        }
    };

    // Reset captcha
    const resetCaptcha = () => {
        if (captchaRef.current) {
            captchaRef.current.reset();
        }
        setCaptchaToken(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation checks
        if (!formData.title.trim()) {
            alert('Please enter a title');
            return;
        }
        if (!formData.description.trim()) {
            alert('Please enter a description');
            return;
        }
        if (!formData.category) {
            alert('Please select a category');
            return;
        }
        if (!location) {
            alert('Location not detected. Please enable GPS and try again.');
            return;
        }
        if (!captchaToken) {
            setCaptchaError('Please complete the CAPTCHA verification');
            alert('Please complete the CAPTCHA verification');
            return;
        }

        setSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title.trim());
            formDataToSend.append('description', formData.description.trim());
            formDataToSend.append('category', formData.category);
            formDataToSend.append('location', JSON.stringify({
                lat: location.lat,
                lng: location.lng,
                address: formData.address
            }));
            
            // Add captcha token to form data
            formDataToSend.append('captchaToken', captchaToken);

            photos.forEach(photo => {
                formDataToSend.append('photos', photo);
            });

            const response = await axios.post(
                'http://localhost:5000/api/reports',
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            if (response.data.success) {
                alert('✅ Report submitted successfully!');
                // Reset captcha after successful submission
                resetCaptcha();
                navigate('/dashboard');
            } else {
                throw new Error(response.data.error || 'Failed to submit report');
            }

        } catch (error) {
            console.error('Submission error:', error);
            
            // Handle captcha specific errors
            if (error.response?.data?.error?.includes('CAPTCHA')) {
                setCaptchaError(error.response.data.error);
                resetCaptcha(); // Reset captcha on error
                alert(error.response.data.error);
            } else {
                alert(error.response?.data?.message || error.message || 'Failed to submit report');
            }
            
            // Reset captcha on any error to force new verification
            resetCaptcha();
        } finally {
            setSubmitting(false);
        }
    };

    // Cleanup previews
    useEffect(() => {
        return () => {
            previews.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    // Format time ago
    const timeAgo = (date) => {
        const now = new Date();
        const past = new Date(date);
        const diffInSeconds = Math.floor((now - past) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return past.toLocaleDateString();
    };

    // Get status badge
    const getStatusBadge = (status) => {
        switch (status) {
            case 'in_progress':
                return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">In Progress</span>;
            case 'resolved':
                return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Resolved</span>;
            default:
                return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Reported</span>;
        }
    };

    if (locationLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Getting your location...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Report a New Issue</h1>
                <p className="mt-2 text-gray-600">
                    Help improve your community by reporting issues in your area.
                </p>
            </div>

            {/* Two Column Layout - Map now in left column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Map */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-900">
                                📍 Select Location on Map
                            </h3>
                            <p className="text-sm text-gray-600">
                                Click anywhere on the map or drag the marker to set your location
                            </p>
                        </div>
                        <div className="h-[400px] w-full">
                            <MapContainer
                                center={location ? [location.lat, location.lng] : [23.8103, 90.4125]}
                                zoom={15}
                                className="h-full w-full"
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                {location && (
                                    <LocationPicker
                                        position={[location.lat, location.lng]}
                                        onPositionChange={handleMapLocationSelect}
                                    />
                                )}
                            </MapContainer>
                        </div>

                        {/* Live Location Button under map */}
                        <div className="p-4 border-t bg-gray-50">
                            <button
                                onClick={handleLiveLocation}
                                disabled={locationUpdating}
                                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {locationUpdating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Updating location...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        </svg>
                                        <span>Use My Current Location</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column - Form */}
                <div className="space-y-6">
                    {locationError && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                            <p className="text-sm text-yellow-700">{locationError}</p>
                        </div>
                    )}

                    {/* Location Info Card */}
                    {location && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <h4 className="font-medium text-blue-800 mb-2">Selected Location</h4>
                            <p className="text-sm text-blue-600 mb-1">
                                <span className="font-medium">Coordinates:</span> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                            </p>
                            <p className="text-sm text-blue-600">
                                <span className="font-medium">Address:</span> {formData.address}
                            </p>
                            {isUpdatingFromMap && (
                                <p className="text-xs text-blue-500 mt-2">Updating address...</p>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl overflow-hidden">
                        <div className="p-6 space-y-6">
                            {/* Category Selection */}
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">SELECT CATEGORY</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, category: cat.value })}
                                            className={`
                                                p-4 rounded-xl border-2 transition-all duration-200 text-left
                                                ${formData.category === cat.value
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <span className="text-2xl">{cat.icon}</span>
                                                <div>
                                                    <div className="font-medium text-gray-900">{cat.label}</div>
                                                    <div className="text-sm text-gray-500">{cat.description}</div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Brief title of the issue"
                                />
                            </div>

                            {/* Description Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                    rows="4"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Describe the issue in detail..."
                                />
                            </div>

                            {/* Photo Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Photos <span className="text-gray-500 text-xs">(Max 5, optional)</span>
                                </label>

                                <div
                                    {...getRootProps()}
                                    className={`
                                        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                                        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
                                    `}
                                >
                                    <input {...getInputProps()} />
                                    <div className="text-5xl mb-2">📸</div>
                                    <p>Drag & drop photos here, or click to select</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {photos.length}/5 photos selected
                                    </p>
                                </div>

                                {previews.length > 0 && (
                                    <div className="grid grid-cols-5 gap-2 mt-4">
                                        {previews.map((preview, i) => (
                                            <div key={i} className="relative">
                                                <img src={preview} className="w-full h-20 object-cover rounded" />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(i)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* CAPTCHA Section */}
                            <div className="border-t pt-6">
                                <div className="flex flex-col items-center space-y-3">
                                    <Captcha
                                        ref={captchaRef}
                                        onVerify={handleCaptchaVerify}
                                    />
                                    
                                    {captchaError && (
                                        <p className="text-sm text-red-600 text-center">
                                            {captchaError}
                                        </p>
                                    )}
                                    
                                    {captchaToken ? (
                                        <p className="text-sm text-green-600 flex items-center">
                                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            CAPTCHA verified
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-500 text-center">
                                            Please complete the CAPTCHA to verify you're human
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="px-6 py-4 bg-gray-50 border-t">
                            <button
                                type="submit"
                                disabled={submitting || !location || !formData.category || !captchaToken}
                                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                {submitting ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Submitting...
                                    </span>
                                ) : 'Submit Report'}
                            </button>
                        </div>
                    </form>

                    {/* Nearby Issues Section - Moved below form */}
                    {loadingNearby ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-sm text-gray-500">Loading nearby issues...</p>
                        </div>
                    ) : nearbyIssues.length > 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Similar Issues Nearby
                                    </h3>
                                    <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">
                                        {nearbyIssues.length}
                                    </span>
                                </div>

                                {/* Warning Message */}
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                                    <p className="text-xs text-orange-700">
                                        These issues may already be reported in your area.
                                    </p>
                                </div>

                                {/* Issues List */}
                                <div className="space-y-4">
                                    {nearbyIssues.slice(0, 3).map((issue) => (
                                        <div key={issue._id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-medium">{issue.upvoteCount || 0} upvotes</span>
                                                    {getStatusBadge(issue.status)}
                                                </div>
                                            </div>
                                            <h4 className="font-medium text-gray-900 mb-2">{issue.title}</h4>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                                                <div>{Math.round(issue.distance)}m away</div>
                                                <div>{timeAgo(issue.createdAt)}</div>
                                            </div>
                                            <button
                                                onClick={() => handleViewAllNearby()}
                                                className="text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                View details →
                                            </button>
                                        </div>
                                    ))}

                                    {nearbyIssues.length > 3 && (
                                        <button
                                            onClick={handleViewAllNearby}
                                            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium pt-2"
                                        >
                                            View all {nearbyIssues.length} nearby issues →
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default CreateReport;