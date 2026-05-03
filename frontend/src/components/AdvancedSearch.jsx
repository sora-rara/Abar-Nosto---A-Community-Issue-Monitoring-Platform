import { useState, useEffect } from 'react';
import API from '../services/api';
import IssueCard from './IssueCard';

const AdvancedSearch = () => {
    const [searchParams, setSearchParams] = useState({
        query: '',
        category: 'all',
        status: 'all',
        area: '',
        ward: '',
        road: '',
        sortBy: 'relevance',
        dateFrom: '',
        dateTo: '',
        minUpvotes: '',
        hasPhotos: 'false',
        useMyLocation: false
    });

    const [results, setResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
    const [userLocation, setUserLocation] = useState(null);
    const [nearbyRadius, setNearbyRadius] = useState(5000);
    const [searchPerformed, setSearchPerformed] = useState(false);

    const categories = [
        { value: 'all', label: 'All Categories' },
        { value: 'pothole', label: 'Pothole' },
        { value: 'broken_light', label: 'Broken Light' },
        { value: 'drainage', label: 'Drainage' },
        { value: 'flooding', label: 'Flooding' },
        { value: 'garbage', label: 'Garbage' },
        { value: 'debris', label: 'Debris' },
        { value: 'hazard', label: 'Hazard' },
        { value: 'other', label: 'Other' }
    ];

    const statuses = [
        { value: 'all', label: 'All Status' },
        { value: 'reported', label: 'Reported' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'resolved', label: 'Resolved' }
    ];

    const sortOptions = [
        { value: 'relevance', label: 'Relevance' },
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'most_upvoted', label: 'Most Upvoted' },
        { value: 'most_commented', label: 'Most Commented' },
        { value: 'distance', label: 'Nearest First' }
    ];

    const getLocation = () => {
        if (navigator.geolocation) {
            setLocationLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setLocationLoading(false);
                    // Don't auto-search, let user click Apply Filters
                },
                (error) => {
                    console.error('Location error:', error);
                    let errorMessage = 'Unable to get your location. ';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Please enable location access in your browser settings.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            errorMessage += 'Location request timed out. Please try again.';
                            break;
                        default:
                            errorMessage += 'Please search by area/ward instead.';
                    }
                    alert(errorMessage);
                    setLocationLoading(false);
                    setSearchParams(prev => ({ ...prev, useMyLocation: false }));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            alert('Geolocation is not supported by your browser');
        }
    };

    const handleSearch = async (page = 1) => {
        setSearchLoading(true);
        setSearchPerformed(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Please login to search');
                return;
            }

            const params = new URLSearchParams();

            // Add all search parameters
            if (searchParams.query && searchParams.query.trim()) {
                params.append('query', searchParams.query.trim());
            }
            if (searchParams.category && searchParams.category !== 'all') {
                params.append('category', searchParams.category);
            }
            if (searchParams.status && searchParams.status !== 'all') {
                params.append('status', searchParams.status);
            }
            if (searchParams.area && searchParams.area.trim()) {
                params.append('area', searchParams.area.trim());
            }
            if (searchParams.ward && searchParams.ward.trim()) {
                params.append('ward', searchParams.ward.trim());
            }
            if (searchParams.road && searchParams.road.trim()) {
                params.append('road', searchParams.road.trim());
            }
            if (searchParams.sortBy) {
                params.append('sortBy', searchParams.sortBy);
            }
            if (searchParams.dateFrom) {
                params.append('dateFrom', searchParams.dateFrom);
            }
            if (searchParams.dateTo) {
                params.append('dateTo', searchParams.dateTo);
            }
            if (searchParams.minUpvotes) {
                params.append('minUpvotes', searchParams.minUpvotes);
            }
            if (searchParams.hasPhotos === 'true') {
                params.append('hasPhotos', 'true');
            }

            // Add location if using my location
            if (searchParams.useMyLocation && userLocation) {
                params.append('lat', userLocation.lat);
                params.append('lng', userLocation.lng);
                params.append('radius', nearbyRadius);
            }

            params.append('page', page);
            params.append('limit', 20);

            const url = `/search?${params.toString()}`;
            console.log('Search URL:', url);

            const response = await API.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Search response:', response.data);

            setResults(response.data.data || []);
            setPagination({
                page: response.data.pagination.page,
                total: response.data.pagination.total,
                pages: response.data.pagination.pages
            });

            if (response.data.data.length === 0) {
                console.log('No results found for search criteria');
            }

        } catch (error) {
            console.error('Search error:', error);
            if (error.response) {
                console.error('Error response:', error.response.data);
                alert(`Search error: ${error.response.data.message || 'Please try again'}`);
            } else {
                alert('Error performing search. Please try again.');
            }
            setResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSearchParams(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const resetFilters = () => {
        setSearchParams({
            query: '',
            category: 'all',
            status: 'all',
            area: '',
            ward: '',
            road: '',
            sortBy: 'relevance',
            dateFrom: '',
            dateTo: '',
            minUpvotes: '',
            hasPhotos: 'false',
            useMyLocation: false
        });
        setUserLocation(null);
        setResults([]);
        setSearchPerformed(false);
    };

    // Show warning if location is enabled but no location detected
    const showLocationWarning = searchParams.useMyLocation && !userLocation && !locationLoading;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Search Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Issues</h1>
                <p className="text-gray-600">Find and filter issues by location, category, status, and more</p>
            </div>

            {/* Advanced Filters Panel */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Category Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                            name="category"
                            value={searchParams.category}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {categories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                            name="status"
                            value={searchParams.status}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {statuses.map(status => (
                                <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort By */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                        <select
                            name="sortBy"
                            value={searchParams.sortBy}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {sortOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Area Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Area Name</label>
                        <input
                            type="text"
                            name="area"
                            value={searchParams.area}
                            onChange={handleInputChange}
                            placeholder="e.g., Gulshan, Banani"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Ward Number */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ward Number</label>
                        <input
                            type="text"
                            name="ward"
                            value={searchParams.ward}
                            onChange={handleInputChange}
                            placeholder="e.g., Ward 12"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Road Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Road Name</label>
                        <input
                            type="text"
                            name="road"
                            value={searchParams.road}
                            onChange={handleInputChange}
                            placeholder="e.g., Road 45"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                        <input
                            type="date"
                            name="dateFrom"
                            value={searchParams.dateFrom}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                        <input
                            type="date"
                            name="dateTo"
                            value={searchParams.dateTo}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Minimum Upvotes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Upvotes</label>
                        <input
                            type="number"
                            name="minUpvotes"
                            value={searchParams.minUpvotes}
                            onChange={handleInputChange}
                            placeholder="e.g., 10"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Has Photos */}
                    <div className="flex items-center">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="hasPhotos"
                                checked={searchParams.hasPhotos === 'true'}
                                onChange={(e) => setSearchParams(prev => ({ ...prev, hasPhotos: e.target.checked ? 'true' : 'false' }))}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Has Photos Only</span>
                        </label>
                    </div>
                </div>

                {/* Location Based Search */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="useMyLocation"
                                checked={searchParams.useMyLocation}
                                onChange={handleInputChange}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label className="ml-2 text-sm font-medium text-gray-700">Search near my location</label>
                        </div>

                        {searchParams.useMyLocation && (
                            <>
                                {!userLocation && !locationLoading && (
                                    <button
                                        onClick={getLocation}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        </svg>
                                        Get My Location
                                    </button>
                                )}

                                {locationLoading && (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                        <span className="text-sm text-gray-600">Getting location...</span>
                                    </div>
                                )}

                                {userLocation && (
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-green-600 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            Location detected
                                        </span>
                                        <div>
                                            <label className="text-sm text-gray-600 mr-2">Radius:</label>
                                            <select
                                                value={nearbyRadius}
                                                onChange={(e) => setNearbyRadius(parseInt(e.target.value))}
                                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                                            >
                                                <option value={1000}>1 km</option>
                                                <option value={2000}>2 km</option>
                                                <option value={5000}>5 km</option>
                                                <option value={10000}>10 km</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                        >
                            Reset All Filters
                        </button>
                    </div>

                    {/* Warning message */}
                    {showLocationWarning && (
                        <div className="mt-3 text-sm text-orange-600 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Click "Get My Location" to enable nearby search
                        </div>
                    )}
                </div>

                {/* Apply Filters Button */}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => handleSearch(1)}
                        disabled={searchLoading || (searchParams.useMyLocation && !userLocation && !locationLoading)}
                        className="px-6 py-2.5 bg-[#0F172A] text-white rounded-lg hover:bg-blue-900 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    >
                        {searchLoading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Searching...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Apply Filters
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Results Section */}
            {searchLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Searching for issues...</p>
                </div>
            ) : results.length > 0 ? (
                <>
                    <div className="mb-4 flex justify-between items-center">
                        <p className="text-gray-600">Found {pagination.total} issue(s)</p>
                        {searchParams.useMyLocation && userLocation && (
                            <p className="text-sm text-gray-500">Sorted by distance</p>
                        )}
                    </div>

                    <div className="space-y-6">
                        {results.map(issue => (
                            <IssueCard key={issue._id} issue={issue} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="mt-8 flex justify-center gap-2">
                            <button
                                onClick={() => handleSearch(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <span className="px-4 py-2 text-gray-700">
                                Page {pagination.page} of {pagination.pages}
                            </span>
                            <button
                                onClick={() => handleSearch(pagination.page + 1)}
                                disabled={pagination.page === pagination.pages}
                                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            ) : searchPerformed ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No issues found</h3>
                    <p className="text-gray-600">Try adjusting your search filters or check back later</p>
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Start Searching</h3>
                    <p className="text-gray-600">Select filters and click "Apply Filters" to find issues</p>
                </div>
            )}
        </div>
    );
};

export default AdvancedSearch;