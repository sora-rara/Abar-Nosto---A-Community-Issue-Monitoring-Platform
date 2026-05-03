import React from 'react';

const LocationInfo = ({ location, address }) => {
    if (!location) return null;

    // Parse address if it's a string
    const addressParts = address ? address.split(',') : [];

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detected Location</h3>

                {/* Address Grid - Matching your image */}
                <div className="space-y-3 mb-4">
                    {addressParts.length > 0 ? (
                        <>
                            <div className="flex items-start">
                                <span className="w-20 text-sm font-medium text-gray-500">Ward</span>
                                <span className="text-sm text-gray-900">{addressParts[0] || 'Unknown'}</span>
                            </div>
                            <div className="flex items-start">
                                <span className="w-20 text-sm font-medium text-gray-500">Area</span>
                                <span className="text-sm text-gray-900">{addressParts[1] || 'Unknown'}</span>
                            </div>
                            <div className="flex items-start">
                                <span className="w-20 text-sm font-medium text-gray-500">Road No.</span>
                                <span className="text-sm text-gray-900">{addressParts[2] || 'Unknown'}</span>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-gray-600">{address || 'Location detected'}</p>
                    )}
                </div>

                {/* Live Location Button */}
                <button className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors mb-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium">Live Location</span>
                </button>

                {/* View All Nearby Issues Link */}
                <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium text-center">
                    View all nearby issues →
                </button>
            </div>
        </div>
    );
};

export default LocationInfo;