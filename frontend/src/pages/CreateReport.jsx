import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useDropzone } from 'react-dropzone';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Captcha from '../components/Captcha';
import ShareModal from '../components/ShareModal';
import useDraft from '../hooks/useDraft';
import AutoSave from '../components/AutoSave';
import DraftReminder from '../components/DraftReminder';
import SimilarIssuesCard from '../components/SimilarIssuesCard';

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
    const [pendingDuplicates, setPendingDuplicates] = useState([]);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [pendingFormData, setPendingFormData] = useState(null);
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState('');
    const [locationLoading, setLocationLoading] = useState(true);
    const [locationUpdating, setLocationUpdating] = useState(false);
    const [nearbyIssues, setNearbyIssues] = useState([]);
    const [loadingNearby, setLoadingNearby] = useState(false);
    const [submittedReport, setSubmittedReport] = useState(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);
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

    // ========== DRAFT FUNCTIONALITY (from second file) ==========
    const { draftData, showReminder, saveDraft, loadDraft, clearDraft, hasDraft } = useDraft({
        title: '',
        description: '',
        category: '',
        address: '',
        location: null,
        photos: [], // only store URLs? For simplicity we skip file restore
    });

    // Auto-fill form with draft data when loaded
    useEffect(() => {
        if (draftData && draftData.title) {
            setFormData(prev => ({
                ...prev,
                title: draftData.title || '',
                description: draftData.description || '',
                category: draftData.category || '',
                address: draftData.address || prev.address,
            }));
            if (draftData.location) {
                setLocation(draftData.location);
                // Optionally fetch address again, but skip for brevity
            }
            // Photos are not restored from draft (file objects can't be stored in localStorage)
        }
    }, [draftData]);

    const handleAutoSave = () => {
        saveDraft({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            address: formData.address,
            location: location,
        });
    };

    const handleLoadDraft = () => {
        loadDraft();
        // No need to setShowReminder(false) – the hook already clears it
    };

    const handleDismissDraft = () => {
        clearDraft();
    };
    // ========================================

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
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                { headers: { 'User-Agent': 'AbarNosto/1.0' } }
            );
            const data = await response.json();
            const address = data.display_name;
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
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                            { headers: { 'User-Agent': 'AbarNosto/1.0' } }
                        );
                        const data = await response.json();
                        const address = data.display_name;
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

    // Re-fetch nearby issues filtered by the newly selected category
    useEffect(() => {
        if (location && formData.category) {
            fetchNearbyIssues(location.lat, location.lng, formData.category);
        }
    }, [formData.category]);

    // Fetch nearby issues from backend
    const fetchNearbyIssues = async (lat, lng, category = formData.category) => {
        if (!lat || !lng) return;

        setLoadingNearby(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            
            

            // Build URL — include category if one is selected so backend filters it
            let url = `/reports/nearby?lat=${lat}&lng=${lng}&radius=500`;
            if (category) url += `&category=${category}`;
            const response = await API.get(url);

            const RADIUS_M = 500;
            const issuesWithDistance = (response.data.reports || [])
                .map(report => ({
                    ...report,
                    distance: calculateDistance(lat, lng, report.location.lat, report.location.lng)
                }))
                // Post-filter: bounding box can return corner points up to ~580m away; trim to true circle
                .filter(report => report.distance <= RADIUS_M)
                .sort((a, b) => a.distance - b.distance);

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
    // Handle view details for a nearby issue — navigates to the complaint details page
    const handleViewDetails = (issueId) => {
        navigate(`/complaint/${issueId}`);
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

    // Shared logic that actually POSTs the report — called either directly or after duplicate confirmation
    const doSubmit = async (formDataToSend, token) => {
    const response = await API.post('/reports', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
            setSubmittedReport(response.data.report);
            clearDraft();
            resetCaptcha();
            window.scrollTo(0, 0);
        } else {
            throw new Error(response.data.error || 'Failed to submit report');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) { alert('Please enter a title'); return; }
        if (!formData.description.trim()) { alert('Please enter a description'); return; }
        if (!formData.category) { alert('Please select a category'); return; }
        if (!location) { alert('Location not detected. Please enable GPS and try again.'); return; }
        if (!captchaToken) {
            setCaptchaError('Please complete the CAPTCHA verification');
            alert('Please complete the CAPTCHA verification');
            return;
        }

        setSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }

            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title.trim());
            formDataToSend.append('description', formData.description.trim());
            formDataToSend.append('category', formData.category);
            formDataToSend.append('location', JSON.stringify({
                lat: location.lat,
                lng: location.lng,
                address: formData.address
            }));
            formDataToSend.append('captchaToken', captchaToken);
            photos.forEach(photo => formDataToSend.append('photos', photo));

            // Check for active duplicates before submitting
            const dupCheck = await API.post('/reports/check-duplicate', {
                lat: location.lat, lng: location.lng, category: formData.category
            });

            if (dupCheck.data.hasDuplicates) {
                // Store form data and duplicates, show warning modal — don't submit yet
                setPendingFormData({ formDataToSend, token });
                setPendingDuplicates(
                    (dupCheck.data.duplicates || []).map(d => ({
                        ...d,
                        distance: calculateDistance(location.lat, location.lng, d.location.lat, d.location.lng)
                    })).sort((a, b) => a.distance - b.distance)
                );
                setShowDuplicateWarning(true);
                setSubmitting(false);
                return;
            }

            await doSubmit(formDataToSend, token);

        } catch (error) {
            console.error('Submission error:', error);
            if (error.response?.data?.error?.includes('CAPTCHA')) {
                setCaptchaError(error.response.data.error);
                resetCaptcha();
                alert(error.response.data.error);
            } else {
                alert(error.response?.data?.message || error.message || 'Failed to submit report');
            }
            resetCaptcha();
        } finally {
            setSubmitting(false);
        }
    };

    // Called when the user clicks "Submit Anyway" in the duplicate warning modal
    const handleConfirmSubmit = async () => {
        if (!pendingFormData) return;
        setShowDuplicateWarning(false);
        setSubmitting(true);
        try {
            await doSubmit(pendingFormData.formDataToSend, pendingFormData.token);
        } catch (error) {
            console.error('Submission error:', error);
            if (error.response?.data?.error?.includes('CAPTCHA')) {
                setCaptchaError(error.response.data.error);
                resetCaptcha();
                alert(error.response.data.error);
            } else {
                alert(error.response?.data?.message || error.message || 'Failed to submit report');
            }
            resetCaptcha();
        } finally {
            setSubmitting(false);
            setPendingFormData(null);
            setPendingDuplicates([]);
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

    // If report was submitted successfully, show share screen
    if (submittedReport) {
        const shareUrl = `${window.location.origin}/shared-issue/${submittedReport._id}`;

        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-12 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Success Card (unchanged) */}
                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-500">
                        {/* Animated Success Header */}
                        <div className="relative bg-gradient-to-r from-[#EE6B07] to-[#FFA500] px-6 py-8 text-center">
                            <div className="absolute inset-0 bg-white/10"></div>
                            <div className="relative">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                    <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Report Submitted Successfully!</h2>
                                <p className="text-white">
                                    Your issue has been reported and is now visible to the community.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 md:p-8">
                            {/* Report Summary Card */}
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 mb-6 border border-gray-200">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg className="w-6 h-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Report ID</p>
                                        <p className="font-mono text-sm text-gray-700">{submittedReport._id.slice(-8)}</p>
                                        <p className="text-xs text-gray-500 mt-1">{submittedReport.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Status</p>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-900 rounded-full text-xs font-medium">
                                            <span className="w-1.5 h-1.5 bg-blue-800 rounded-full"></span>
                                            Reported
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="group flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                                >
                                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    Go to Dashboard
                                </button>
                                <button
                                    onClick={() => setShowShareModal(true)}
                                    className="group flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#EE6B07] to-[#FFA500] text-white rounded-xl hover:from-[#D95F06] hover:to-[#EE6B07] transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                                >
                                    <svg className="w-5 h-5 group-hover:scale-110 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                    Share This Report
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 py-1 bg-white text-gray-500 rounded-full border border-gray-200">Or share instantly</span>
                                </div>
                            </div>

                            {/* Social Share Buttons - Improved Design */}
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <button
                                        onClick={() => {
                                            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
                                        }}
                                        className="group relative overflow-hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1877F2] text-white rounded-xl hover:bg-[#0C63D4] transition-all duration-200 font-medium"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                                        </svg>
                                        <span className="relative z-10 text-sm">Facebook</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const text = encodeURIComponent(`I just reported an issue: ${submittedReport.title}`);
                                            window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank');
                                        }}
                                        className="group relative overflow-hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1DA1F2] text-white rounded-xl hover:bg-[#1A91DA] transition-all duration-200 font-medium"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                        </svg>
                                        <span className="relative z-10 text-sm">Twitter</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const text = encodeURIComponent(`Check out this issue I reported: ${submittedReport.title}`);
                                            window.open(`https://wa.me/?text=${text}%20${encodeURIComponent(shareUrl)}`, '_blank');
                                        }}
                                        className="group relative overflow-hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl hover:bg-[#20BD5A] transition-all duration-200 font-medium"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12.032 2.003c-5.518 0-10 4.482-10 10 0 1.834.495 3.546 1.357 5.012l-1.357 4.985 5.148-1.33c1.43.785 3.05 1.233 4.852 1.233 5.518 0 10-4.482 10-10s-4.482-10-10-10zm0 18.5c-1.543 0-2.993-.42-4.242-1.148l-.308-.184-3.11.802.85-3.06-.197-.32c-.79-1.267-1.243-2.74-1.243-4.29 0-4.554 3.706-8.26 8.26-8.26s8.26 3.706 8.26 8.26-3.706 8.26-8.26 8.26z" />
                                            <path d="M16.6 13.82c-.253-.126-1.5-.74-1.734-.826-.232-.085-.402-.127-.572.127-.17.253-.66.826-.81.995-.148.17-.297.192-.55.064-.253-.127-1.07-.395-2.037-1.257-.753-.672-1.26-1.5-1.41-1.754-.148-.253-.017-.39.112-.516.116-.116.254-.296.38-.445.127-.148.17-.254.254-.423.085-.17.042-.317-.022-.444-.063-.127-.573-1.38-.785-1.89-.208-.5-.416-.414-.572-.422-.148-.008-.318-.008-.488-.008s-.446.064-.678.317c-.233.254-.89.87-.89 2.122 0 1.252.91 2.462 1.038 2.632.127.17 1.79 2.736 4.34 3.836 2.55 1.1 2.55.733 3.01.687.46-.045 1.485-.607 1.694-1.193.21-.586.21-1.088.148-1.193-.064-.106-.233-.17-.487-.297z" />
                                        </svg>
                                        <span className="relative z-10 text-sm">WhatsApp</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
                                        }}
                                        className="group relative overflow-hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0A66C2] text-white rounded-xl hover:bg-[#094DAE] transition-all duration-200 font-medium"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.979 0 1.771-.773 1.771-1.729V1.729C24 .774 23.222 0 22.225 0z" />
                                        </svg>
                                        <span className="relative z-10 text-sm">LinkedIn</span>
                                    </button>
                                </div>

                                {/* Copy Link Section - Improved */}
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Copy Share Link</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                value={shareUrl}
                                                readOnly
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(shareUrl);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            className="px-5 py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-900 transition-all duration-200 font-medium flex items-center gap-2"
                                        >
                                            {copied ? (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 text-center">
                                        Anyone with this link can view your report
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Share Modal for more options */}
                    <ShareModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        issueId={submittedReport._id}
                        issueTitle={submittedReport.title}
                    />
                </div>
            </div>
        );
    }

    // Otherwise show the normal form
    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            {/* Draft Reminder Modal (new) */}
            {showReminder && (
                <DraftReminder onLoad={handleLoadDraft} onDismiss={handleDismissDraft} />
            )}

            {/* Duplicate Warning Modal */}
            {showDuplicateWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                        <div className="bg-orange-50 border-b border-orange-200 px-6 py-5">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">⚠️</span>
                                <div>
                                    <h2 className="text-lg font-bold text-orange-800">Similar Issues Already Exist</h2>
                                    <p className="text-sm text-orange-600">
                                        {pendingDuplicates.length} active {formData.category.replace('_', ' ')} report{pendingDuplicates.length > 1 ? 's' : ''} found within 500m.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 max-h-64 overflow-y-auto space-y-3">
                            {pendingDuplicates.map(dup => (
                                <div key={dup._id} className="flex items-start justify-between gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{dup.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {Math.round(dup.distance)}m away · {dup.upvoteCount || 0} upvotes
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setShowDuplicateWarning(false); navigate(`/complaint/${dup._id}`); }}
                                        className="text-xs text-blue-600 hover:underline whitespace-nowrap flex-shrink-0"
                                    >
                                        View →
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => { setShowDuplicateWarning(false); setPendingFormData(null); setPendingDuplicates([]); }}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-sm"
                            >
                                Cancel — I'll upvote instead
                            </button>
                            <button
                                onClick={handleConfirmSubmit}
                                disabled={submitting}
                                className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 font-medium text-sm"
                            >
                                {submitting ? 'Submitting…' : 'Submit Anyway'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AutoSave Component (new) */}
            <AutoSave data={{
                title: formData.title,
                description: formData.description,
                category: formData.category,
                address: formData.address,
                location: location,
            }} onSave={handleAutoSave} interval={30000} />

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
                                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-[#0F172A] text-[#FFA500] rounded-lg hover:bg-[#1E293B] disabled:opacity-50 disabled:cursor-not-allowed"
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
                                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
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

                        {/* Submit Button + Manual Draft Save (new) */}
                        <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
                            <button
                                type="button"
                                onClick={handleAutoSave}
                                className="px-6 py-3 bg-[#FFA500] text-[#0F172A] font-medium rounded-lg hover:bg-gray-700 transition-colors duration-200"
                            >
                                Save as Draft
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !location || !formData.category || !captchaToken}
                                className="flex-1 px-6 py-3 bg-[#0F172A] text-[#FFA500] font-medium rounded-lg hover:bg-[#1E293B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
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
                                        ⚠️ These issues may already be reported in your area. Consider upvoting an existing one instead of creating a duplicate.
                                    </p>
                                </div>

                                {/* Scrollable Issues List — all issues, no slice */}
                                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                                    {nearbyIssues.map((issue) => (
                                        <SimilarIssuesCard
                                            key={issue._id}
                                            issue={issue}
                                            onViewDetails={handleViewDetails}
                                        />
                                    ))}
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