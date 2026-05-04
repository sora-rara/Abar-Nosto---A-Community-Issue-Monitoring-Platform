import React, { useState, useEffect, useRef, useCallback } from 'react';
import API from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminWardStats = () => {
    const [wardStats, setWardStats] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('all');
    const [selectedWard, setSelectedWard] = useState(null);
    const [wardDetails, setWardDetails] = useState(null);
    const [comparisonData, setComparisonData] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [comparisonWards, setComparisonWards] = useState([]);
    const [exporting, setExporting] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Use refs to track mounted state and abort controllers
    const isMounted = useRef(true);
    const abortControllers = useRef([]);
    const refreshInterval = useRef(null);

    // Helper function to format resolution time (days to hours if under 1 day)
    const formatResolutionTime = (days) => {
        if (days === 0 || days === '0' || days === '0.0') return ' 1 hour';

        const numDays = parseFloat(days);
        if (isNaN(numDays)) return 'N/A';

        if (numDays < 1) {
            const hours = Math.round(numDays * 24);
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        }

        // Round to 1 decimal place for days
        return `${numDays.toFixed(1)} day${numDays !== 1 ? 's' : ''}`;
    };

    // Helper function to get the numeric value for sorting
    const getResolutionTimeValue = (days) => {
        const numDays = parseFloat(days);
        if (isNaN(numDays)) return Infinity;
        return numDays;
    };

    // Helper function to get color class based on resolution time
    const getResolutionTimeColorClass = (days) => {
        const numDays = parseFloat(days);
        if (isNaN(numDays)) return 'bg-gray-500';

        if (numDays <= 0.125) return 'bg-green-500'; // <= 3 hours
        if (numDays <= 0.25) return 'bg-green-400'; // <= 6 hours
        if (numDays <= 0.5) return 'bg-green-300'; // <= 12 hours
        if (numDays <= 1) return 'bg-yellow-500'; // <= 24 hours
        if (numDays <= 3) return 'bg-yellow-600'; // <= 3 days
        if (numDays <= 7) return 'bg-orange-500'; // <= 7 days
        return 'bg-red-500';
    };

    // Helper function to get the display text with appropriate unit
    const getResolutionTimeDisplay = (days) => {
        const numDays = parseFloat(days);
        if (isNaN(numDays)) return 'N/A';

        if (numDays < 1) {
            const hours = Math.round(numDays * 24);
            if (hours === 0) return '< 1 hour';
            return `${hours}h`;
        }
        return `${numDays.toFixed(1)}d`;
    };

    // Cleanup function to cancel pending requests
    const cancelPendingRequests = useCallback(() => {
        abortControllers.current.forEach(controller => {
            try {
                controller.abort();
            } catch (e) {
                // Ignore abort errors
            }
        });
        abortControllers.current = [];
    }, []);

    // Fetch ward stats with abort controller
    const fetchWardStats = useCallback(async (showLoading = true) => {
        const controller = new AbortController();
        abortControllers.current.push(controller);

        if (showLoading && isMounted.current) {
            setLoading(true);
        }

        try {
            const token = localStorage.getItem('token');

            // Check if token exists
            if (!token) {
                if (isMounted.current) {
                    setWardStats([]);
                    setSummary(null);
                    setLoading(false);
                }
                return;
            }

            const response = await API.get(`/admin/stats/wards?period=${period}`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal
            });

            if (isMounted.current && response.data.success) {
                setWardStats(response.data.data.wards || []);
                setSummary(response.data.data.summary || null);
                setLastUpdated(new Date());
            }
        } catch (error) {
            if (error.name !== 'AbortError' && isMounted.current) {
                console.error('Error fetching ward stats:', error);
                // Keep existing data on error, don't clear it
            }
        } finally {
            if (isMounted.current && showLoading) {
                setLoading(false);
            }
        }
    }, [period]);

    // Fetch comparison stats with abort controller
    const fetchComparisonStats = useCallback(async () => {
        const controller = new AbortController();
        abortControllers.current.push(controller);

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await API.get(`/admin/stats/comparison?period=${period}`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal
            });

            if (isMounted.current && response.data.success) {
                setComparisonData(response.data.data);
            }
        } catch (error) {
            if (error.name !== 'AbortError' && isMounted.current) {
                console.error('Error fetching comparison stats:', error);
            }
        }
    }, [period]);

    // Auto-refresh function - fetches new data without showing loading
    const autoRefreshData = useCallback(() => {
        if (isMounted.current) {
            fetchWardStats(false); // false = don't show loading spinner
            fetchComparisonStats();
        }
    }, [fetchWardStats, fetchComparisonStats]);

    // Fetch ward details
    const fetchWardDetails = useCallback(async (wardName) => {
        const controller = new AbortController();
        abortControllers.current.push(controller);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Authentication required');
                return;
            }

            const response = await API.get(`/admin/stats/wards/${encodeURIComponent(wardName)}/details`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal
            });

            if (isMounted.current && response.data.success) {
                setWardDetails(response.data.data);
                setSelectedWard(wardName);
            }
        } catch (error) {
            if (error.name !== 'AbortError' && isMounted.current) {
                console.error('Error fetching ward details:', error);
                alert('Failed to fetch ward details');
            }
        }
    }, []);

    // Initial data fetch + auto-refresh every 30s (was 10s — too aggressive for Render free tier)
    useEffect(() => {
        isMounted.current = true;

        fetchWardStats(true);
        fetchComparisonStats();

        refreshInterval.current = setInterval(() => {
            if (isMounted.current) {
                fetchWardStats(false);
                fetchComparisonStats();
            }
        }, 30000);

        return () => {
            isMounted.current = false;
            cancelPendingRequests();
            if (refreshInterval.current) {
                clearInterval(refreshInterval.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount only

    // Handle period change - reset and fetch new data
    useEffect(() => {
        if (!isMounted.current) return;

        cancelPendingRequests();
        fetchWardStats(true);
        fetchComparisonStats();

        return () => {
            cancelPendingRequests();
        };
    }, [period, fetchWardStats, fetchComparisonStats, cancelPendingRequests]);

    // PDF export function
    const handleExportPDF = useCallback(async () => {
        if (exporting) return;

        setExporting(true);

        try {
            // Create new PDF document - landscape A4
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Add title
            doc.setFontSize(20);
            doc.setTextColor(33, 33, 33);
            doc.text('Ward & Area Analytics Report', 14, 20);

            // Add subtitle
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            const dateStr = new Date().toLocaleString();
            doc.text(`Generated on: ${dateStr}`, 14, 30);
            doc.text(`Period: ${period === 'all' ? 'All Time' : period === 'week' ? 'Last 7 Days' : period === 'month' ? 'Last 30 Days' : 'Last 90 Days'}`, 14, 37);

            // Add summary section
            if (summary) {
                doc.setFontSize(14);
                doc.setTextColor(33, 33, 33);
                doc.text('Summary Statistics', 14, 48);

                const summaryBody = [[
                    summary.totalWards?.toString() || '0',
                    summary.totalReports?.toString() || '0',
                    summary.totalResolved?.toString() || '0',
                    `${summary.overallResolutionRate || 0}%`,
                    formatResolutionTime(summary.overallAvgResolutionTime || 0)
                ]];

                autoTable(doc, {
                    startY: 52,
                    head: [['Total Wards', 'Total Reports', 'Resolved Issues', 'Resolution Rate', 'Avg Resolution Time']],
                    body: summaryBody,
                    theme: 'striped',
                    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 10 },
                    bodyStyles: { fontSize: 10 },
                    margin: { left: 14, right: 14 }
                });
            }

            // Add ward statistics table
            let finalY = doc.lastAutoTable?.finalY || 80;

            if (wardStats.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(33, 33, 33);
                doc.text('Ward/Area Performance Metrics', 14, finalY + 10);

                const tableBody = wardStats.map(ward => [
                    ward.ward || 'Unknown',
                    (ward.totalReports || 0).toString(),
                    (ward.activeIssues || 0).toString(),
                    (ward.resolvedCount || 0).toString(),
                    `${ward.resolutionRate || 0}%`,
                    formatResolutionTime(ward.averageResolutionTime || 0),
                    `${ward.engagementScore || 0}/100`
                ]);

                autoTable(doc, {
                    startY: finalY + 15,
                    head: [['Ward/Area', 'Total Reports', 'Active Issues', 'Resolved', 'Resolution Rate', 'Avg Resolution Time', 'Engagement Score']],
                    body: tableBody,
                    theme: 'striped',
                    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9 },
                    bodyStyles: { fontSize: 8 },
                    margin: { left: 14, right: 14 }
                });
            }

            // Save the PDF
            setTimeout(() => {
                doc.save(`ward-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
            }, 100);

        } catch (error) {
            console.error('PDF Export error:', error);
            alert(`Failed to export PDF: ${error.message}`);
        } finally {
            setExporting(false);
        }
    }, [exporting, period, summary, wardStats]);

    // Get resolution time color for status badge
    const getResolutionTimeBadgeClass = (days) => {
        const numDays = parseFloat(days);
        if (isNaN(numDays)) return 'bg-gray-500';

        if (numDays <= 0.125) return 'bg-green-500'; // <= 3 hours
        if (numDays <= 0.25) return 'bg-green-400'; // <= 6 hours
        if (numDays <= 0.5) return 'bg-green-300 text-gray-800'; // <= 12 hours
        if (numDays <= 1) return 'bg-yellow-500'; // <= 24 hours
        if (numDays <= 3) return 'bg-yellow-600'; // <= 3 days
        if (numDays <= 7) return 'bg-orange-500'; // <= 7 days
        return 'bg-red-500';
    };

    // Manual refresh button handler
    const handleManualRefresh = () => {
        fetchWardStats(true);
        fetchComparisonStats();
    };

    // Only show loading state on initial load
    if (loading && wardStats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600">Loading statistics...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Ward & Area Analytics</h1>
                    <p className="text-gray-500 text-sm">Comparative statistics of issue reports across different wards and areas</p>
                    {lastUpdated && (
                        <p className="text-xs text-gray-400 mt-1">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                            <span className="ml-2 text-green-500">● Auto-refresh every 10s</span>
                        </p>
                    )}
                </div>
                <div className="flex gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm cursor-pointer hover:border-gray-400 transition"
                    >
                        <option value="all">All Time</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                        <option value="quarter">Last 90 Days</option>
                    </select>
                    <button
                        onClick={handleManualRefresh}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center gap-2"
                        disabled={loading}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                    <button
                        onClick={handleExportPDF}
                        disabled={exporting || wardStats.length === 0}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${exporting || wardStats.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
                            } text-white`}
                    >
                        {exporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Exporting...
                            </>
                        ) : (
                            <>
                                Export PDF
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && summary.totalReports > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition">

                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{summary.totalWards || 0}</h3>
                            <p className="text-xs text-gray-500">Active Wards/Areas</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition">

                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{summary.totalReports || 0}</h3>
                            <p className="text-xs text-gray-500">Total Reports</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition">

                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{summary.totalResolved || 0}</h3>
                            <p className="text-xs text-gray-500">Resolved Issues</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition">

                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{summary.overallResolutionRate || 0}%</h3>
                            <p className="text-xs text-gray-500">Resolution Rate</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition">

                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{formatResolutionTime(summary.overallAvgResolutionTime || 0)}</h3>
                            <p className="text-xs text-gray-500">Avg Resolution Time</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl p-8 text-center mb-8">
                    <p className="text-gray-500">No data available for the selected period</p>
                </div>
            )}

            {/* Tab Navigation - Only show if there's data */}
            {wardStats.length > 0 && (
                <>
                    <div className="flex gap-2 mb-6 border-b border-gray-200">
                        <button
                            className={`px-6 py-3 text-sm font-medium transition relative ${activeTab === 'overview' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Ward Overview
                            {activeTab === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
                        </button>
                        <button
                            className={`px-6 py-3 text-sm font-medium transition relative ${activeTab === 'comparison' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('comparison')}
                        >
                            Compare Wards
                            {activeTab === 'comparison' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
                        </button>
                        <button
                            className={`px-6 py-3 text-sm font-medium transition relative ${activeTab === 'trends' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('trends')}
                        >
                            Trends & Insights
                            {activeTab === 'trends' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
                        </button>
                    </div>

                    {/* Tab Content - Overview */}
                    {activeTab === 'overview' && (
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left p-4 text-xs font-semibold text-gray-600">Ward/Area</th>
                                            <th className="text-left p-4 text-xs font-semibold text-gray-600">Total Reports</th>
                                            <th className="text-left p-4 text-xs font-semibold text-gray-600">Active Issues</th>
                                            <th className="text-left p-4 text-xs font-semibold text-gray-600">Resolved</th>
                                            <th className="text-left p-4 text-xs font-semibold text-gray-600">Resolution Rate</th>
                                            <th className="text-left p-4 text-xs font-semibold text-gray-600">Avg Resolution Time</th>
                                            <th className="text-left p-4 text-xs font-semibold text-gray-600">Engagement Score</th>
                                            <th className="text-left p-4 text-xs font-semibold text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {wardStats.map((ward, idx) => {
                                            const resolutionTimeValue = parseFloat(ward.averageResolutionTime);
                                            const resolutionTimeDisplay = formatResolutionTime(resolutionTimeValue);
                                            const badgeClass = getResolutionTimeBadgeClass(resolutionTimeValue);

                                            return (
                                                <tr key={ward.ward} className={`border-b border-gray-100 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                    <td className="p-4 text-sm font-semibold text-gray-900">{ward.ward}</td>
                                                    <td className="p-4 text-sm text-gray-700">{ward.totalReports}</td>
                                                    <td className="p-4 text-sm font-semibold text-orange-500">{ward.activeIssues}</td>
                                                    <td className="p-4 text-sm text-gray-700">{ward.resolvedCount}</td>
                                                    <td className="p-4">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${ward.resolutionRate >= 70 ? 'bg-green-500' :
                                                            ward.resolutionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`}>
                                                            {ward.resolutionRate}%
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${badgeClass}`}>
                                                            {resolutionTimeDisplay}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="relative w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className="absolute h-full bg-blue-500 rounded-full transition-all"
                                                                style={{ width: `${Math.min(100, ward.engagementScore * 10)}%` }}
                                                            ></div>
                                                            <span className="absolute -right-7 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                                                {ward.engagementScore}/100
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <button
                                                            className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium hover:bg-blue-600 transition"
                                                            onClick={() => fetchWardDetails(ward.ward)}
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tab Content - Comparison */}
                    {activeTab === 'comparison' && comparisonData && (
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <div className="mb-6 pb-4 border-b border-gray-200">
                                <label className="font-semibold text-gray-900 block mb-3">Select wards to compare:</label>
                                <div className="flex flex-wrap gap-3">
                                    {wardStats.slice(0, 10).map(ward => (
                                        <label key={ward.ward} className="flex items-center gap-2 text-sm cursor-pointer px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                                            <input
                                                type="checkbox"
                                                value={ward.ward}
                                                checked={comparisonWards.includes(ward.ward)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setComparisonWards([...comparisonWards, ward.ward]);
                                                    } else {
                                                        setComparisonWards(comparisonWards.filter(w => w !== ward.ward));
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                            {ward.ward}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {comparisonWards.length > 0 && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 rounded-xl p-5">
                                        <h3 className="text-base font-semibold text-gray-900 mb-5">Resolution Time Comparison</h3>
                                        <div className="space-y-4">
                                            {comparisonData.wards
                                                .filter(w => comparisonWards.includes(w.ward))
                                                .map(ward => {
                                                    const timeValue = parseFloat(ward.avgResolutionTime);
                                                    const timeDisplay = formatResolutionTime(timeValue);
                                                    const barWidth = Math.min(100, (timeValue / 30) * 100);
                                                    const barColor = timeValue <= 0.125 ? 'bg-green-500' :
                                                        timeValue <= 0.25 ? 'bg-green-400' :
                                                            timeValue <= 0.5 ? 'bg-green-300' :
                                                                timeValue <= 1 ? 'bg-yellow-500' :
                                                                    timeValue <= 3 ? 'bg-yellow-600' :
                                                                        timeValue <= 7 ? 'bg-orange-500' : 'bg-red-500';

                                                    return (
                                                        <div key={ward.ward} className="flex items-center gap-3">
                                                            <div className="w-28 text-sm font-medium text-gray-600">{ward.ward}</div>
                                                            <div className="flex-1 h-8 bg-gray-200 rounded-md overflow-hidden">
                                                                <div
                                                                    className={`h-full flex items-center justify-end pr-2 text-white text-xs font-semibold transition-all ${barColor}`}
                                                                    style={{ width: `${barWidth}%` }}
                                                                >
                                                                    {timeDisplay}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-5">
                                        <h3 className="text-base font-semibold text-gray-900 mb-5">Status Breakdown</h3>
                                        <div className="space-y-5">
                                            {comparisonData.wards
                                                .filter(w => comparisonWards.includes(w.ward))
                                                .map(ward => (
                                                    <div key={ward.ward}>
                                                        <h4 className="text-sm font-semibold text-gray-800 mb-2">{ward.ward}</h4>
                                                        <div className="flex h-8 rounded-md overflow-hidden">
                                                            <div className="flex-1 bg-red-500 flex items-center justify-center text-white text-xs font-medium">
                                                                Reported: {ward.statusBreakdown.reported}
                                                            </div>
                                                            <div className="flex-1 bg-yellow-500 flex items-center justify-center text-white text-xs font-medium">
                                                                In Progress: {ward.statusBreakdown.in_progress}
                                                            </div>
                                                            <div className="flex-1 bg-green-500 flex items-center justify-center text-white text-xs font-medium">
                                                                Resolved: {ward.statusBreakdown.resolved}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab Content - Trends */}
                    {activeTab === 'trends' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white rounded-xl p-5 shadow-sm">
                                <h3 className="text-base font-semibold text-gray-900 mb-5">🏆 Top Performing Wards</h3>
                                <div className="space-y-4">
                                    {[...wardStats]
                                        .sort((a, b) => parseFloat(b.resolutionRate) - parseFloat(a.resolutionRate))
                                        .slice(0, 5)
                                        .map((ward, index) => (
                                            <div key={ward.ward} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                <div className="w-8 h-8 bg-blue-500 text-white flex items-center justify-center rounded-full font-bold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-semibold text-gray-900 text-sm">{ward.ward}</div>
                                                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                                        <span>{ward.resolutionRate}% resolved</span>
                                                        <span>{formatResolutionTime(ward.averageResolutionTime)} avg</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-xl p-5 shadow-sm">
                                <h3 className="text-base font-semibold text-gray-900 mb-5">⚠️ Wards Needing Attention</h3>
                                <div className="space-y-4">
                                    {[...wardStats]
                                        .sort((a, b) => b.activeIssues - a.activeIssues)
                                        .slice(0, 5)
                                        .map((ward) => (
                                            <div key={ward.ward} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                <span className="text-2xl">⚠️</span>
                                                <div className="flex-1">
                                                    <div className="font-semibold text-gray-900 text-sm">{ward.ward}</div>
                                                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                                        <span>{ward.activeIssues} active issues</span>
                                                        <span>{ward.resolutionRate}% resolution rate</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-xl p-5 shadow-sm">
                                <h3 className="text-base font-semibold text-gray-900 mb-5">Key Insights</h3>
                                <div className="space-y-4">
                                    <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">

                                        <div>
                                            <strong className="text-sm text-gray-900 block mb-1">Highest Resolution Rate</strong>
                                            <p className="text-xs text-gray-600">
                                                {wardStats.reduce((best, current) =>
                                                    parseFloat(current.resolutionRate) > parseFloat(best.resolutionRate) ? current : best, wardStats[0]
                                                )?.ward} with {
                                                    wardStats.reduce((best, current) =>
                                                        parseFloat(current.resolutionRate) > parseFloat(best.resolutionRate) ? current : best, wardStats[0]
                                                    )?.resolutionRate
                                                }% resolution rate
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">

                                        <div>
                                            <strong className="text-sm text-gray-900 block mb-1">Fastest Resolution</strong>
                                            <p className="text-xs text-gray-600">
                                                {wardStats.reduce((fastest, current) =>
                                                    getResolutionTimeValue(current.averageResolutionTime) < getResolutionTimeValue(fastest.averageResolutionTime) ? current : fastest, wardStats[0]
                                                )?.ward} with {
                                                    formatResolutionTime(wardStats.reduce((fastest, current) =>
                                                        getResolutionTimeValue(current.averageResolutionTime) < getResolutionTimeValue(fastest.averageResolutionTime) ? current : fastest, wardStats[0]
                                                    )?.averageResolutionTime)
                                                } average resolution time
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">

                                        <div>
                                            <strong className="text-sm text-gray-900 block mb-1">Most Active Community</strong>
                                            <p className="text-xs text-gray-600">
                                                {wardStats.reduce((most, current) =>
                                                    parseFloat(current.engagementScore) > parseFloat(most.engagementScore) ? current : most, wardStats[0]
                                                )?.ward} with the highest engagement score
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Ward Details Modal */}
            {selectedWard && wardDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedWard(null)}>
                    <div className="bg-white rounded-2xl w-[90%] max-w-3xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 flex justify-between items-center p-6 border-b border-gray-200 bg-white">
                            <h2 className="text-xl font-bold text-gray-900">{wardDetails.ward} - Detailed Statistics</h2>
                            <button className="text-3xl text-gray-400 hover:text-gray-900 transition" onClick={() => setSelectedWard(null)}>×</button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                                <div className="text-center p-4 bg-gray-50 rounded-xl">
                                    <div className="text-2xl font-bold text-blue-500">{wardDetails.summary.totalReports}</div>
                                    <div className="text-xs text-gray-500 mt-1">Total Reports</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-xl">
                                    <div className="text-2xl font-bold text-blue-500">{wardDetails.summary.resolutionRate}%</div>
                                    <div className="text-xs text-gray-500 mt-1">Resolution Rate</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-xl">
                                    <div className="text-2xl font-bold text-blue-500">{formatResolutionTime(wardDetails.summary.averageResolutionTime)}</div>
                                    <div className="text-xs text-gray-500 mt-1">Avg Resolution Time</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-xl">
                                    <div className="text-2xl font-bold text-blue-500">{wardDetails.summary.totalUpvotes}</div>
                                    <div className="text-xs text-gray-500 mt-1">Total Upvotes</div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-base font-semibold text-gray-900 mb-4">Category Breakdown</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(wardDetails.categoryBreakdown).map(([cat, count]) => (
                                        <div key={cat} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <span className="text-sm text-gray-600 capitalize">{cat.replace('_', ' ')}</span>
                                            <span className="font-semibold text-blue-500">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Reports in {selectedWard}</h3>
                                <div className="space-y-3">
                                    {wardDetails.recentReports.map(report => (
                                        <div key={report.id} className="p-3 bg-gray-50 rounded-lg">
                                            <div className="font-medium text-gray-900 text-sm mb-2">{report.title}</div>
                                            <div className="flex gap-3 text-xs">
                                                <span className={`px-2 py-0.5 rounded text-white ${report.status === 'resolved' ? 'bg-green-500' :
                                                    report.status === 'in_progress' ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}>
                                                    {report.status}
                                                </span>

                                                <span className="text-gray-500">{new Date(report.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminWardStats;