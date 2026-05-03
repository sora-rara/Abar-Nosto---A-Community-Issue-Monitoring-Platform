import { useState, useEffect } from 'react';
import API from '../services/api';

const AuthorityDirectory = () => {
    const [authorities, setAuthorities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('authorities');
    const [govServices, setGovServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(false);
    const [selectedAuthority, setSelectedAuthority] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [applicationForm, setApplicationForm] = useState({
        subject: '',
        message: '',
        contactName: '',
        contactEmail: '',
        contactPhone: ''
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [draftSaved, setDraftSaved] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [draftLoaded, setDraftLoaded] = useState(false);

    // Filter state – only used for input binding
    const [filterInputs, setFilterInputs] = useState({
        cityCorporation: '',
        ward: '',
        zone: '',
        designation: ''
    });
    // Applied filters – used for actual filtering
    const [appliedFilters, setAppliedFilters] = useState({
        cityCorporation: '',
        ward: '',
        zone: '',
        designation: ''
    });

    // Fetch all authorities once on mount
    useEffect(() => {
        fetchAuthorities();
        fetchGovServices();
    }, []);

    useEffect(() => {
        if (activeTab === 'services') {
            fetchGovServices();
        }
    }, [activeTab]);

    const fetchAuthorities = async () => {
        setLoading(true);
        try {
            const response = await API.get('/authorities');
            setAuthorities(response.data.data);
        } catch (error) {
            console.error('Failed to fetch authorities:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGovServices = async () => {
        setLoadingServices(true);
        try {
            const response = await API.get('/gov-services');
            setGovServices(response.data.data);
        } catch (error) {
            console.error('Failed to fetch government services:', error);
        } finally {
            setLoadingServices(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilterInputs(prev => ({ ...prev, [field]: value }));
    };

    const applyFilters = () => {
        setAppliedFilters({ ...filterInputs });
    };

    const clearFilters = () => {
        const empty = { cityCorporation: '', ward: '', zone: '', designation: '' };
        setFilterInputs(empty);
        setAppliedFilters(empty);
    };

    // Filter authorities based on applied filters (case‑insensitive, partial match)
    const getFilteredAuthorities = () => {
        let filtered = [...authorities];

        if (appliedFilters.cityCorporation) {
            filtered = filtered.filter(a =>
                a.cityCorporation &&
                a.cityCorporation.toLowerCase() === appliedFilters.cityCorporation.toLowerCase()
            );
        }
        if (appliedFilters.ward) {
            filtered = filtered.filter(a =>
                a.ward &&
                a.ward.toString().toLowerCase().includes(appliedFilters.ward.toLowerCase())
            );
        }
        if (appliedFilters.zone) {
            filtered = filtered.filter(a =>
                a.zone &&
                a.zone.toLowerCase().includes(appliedFilters.zone.toLowerCase())
            );
        }
        if (appliedFilters.designation) {
            filtered = filtered.filter(a =>
                a.designation &&
                a.designation.toLowerCase().includes(appliedFilters.designation.toLowerCase())
            );
        }
        return filtered;
    };

    const filteredAuthorities = getFilteredAuthorities();

    // Split into standard (DNCC/DSCC) and other/special
    const standardAuthorities = filteredAuthorities.filter(a =>
        a.cityCorporation === 'DNCC' || a.cityCorporation === 'DSCC'
    );
    const otherAuthorities = filteredAuthorities.filter(a =>
        !a.cityCorporation || (a.cityCorporation !== 'DNCC' && a.cityCorporation !== 'DSCC')
    );

    const hasActiveFilters = appliedFilters.cityCorporation || appliedFilters.ward || appliedFilters.zone || appliedFilters.designation;

    // Draft and application logic (unchanged, keep as is)
    useEffect(() => {
        if (selectedAuthority && !draftLoaded) {
            loadDraft();
            setDraftLoaded(true);
        }
    }, [selectedAuthority]);

    const loadDraft = async () => {
        if (!selectedAuthority) return;
        try {
            const token = localStorage.getItem('token');
            const response = await API.get(`/applications/draft?authorityId=${selectedAuthority._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.data) {
                setApplicationForm({
                    subject: response.data.data.subject || '',
                    message: response.data.data.message || '',
                    contactName: response.data.data.contactName || '',
                    contactEmail: response.data.data.contactEmail || '',
                    contactPhone: response.data.data.contactPhone || ''
                });
            } else {
                resetForm();
            }
        } catch (error) {
            console.error('Failed to load draft:', error);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!applicationForm.subject.trim()) newErrors.subject = 'Subject is required';
        if (!applicationForm.message.trim()) newErrors.message = 'Message is required';
        if (!applicationForm.contactName.trim()) newErrors.contactName = 'Your name is required';
        if (!applicationForm.contactEmail.trim()) newErrors.contactEmail = 'Email is required';
        else if (!/^\S+@\S+\.\S+$/.test(applicationForm.contactEmail)) newErrors.contactEmail = 'Invalid email address';
        if (!applicationForm.contactPhone.trim()) newErrors.contactPhone = 'Phone number is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const saveDraft = async () => {
        if (!selectedAuthority) return;
        setSavingDraft(true);
        try {
            const token = localStorage.getItem('token');
            await API.post('/applications/draft', {
                authorityId: selectedAuthority._id,
                ...applicationForm
            }, { headers: { Authorization: `Bearer ${token}` } });
            setDraftSaved(true);
            setTimeout(() => setDraftSaved(false), 3000);
        } catch (error) {
            console.error('Failed to save draft:', error);
            alert('Failed to save draft');
        } finally {
            setSavingDraft(false);
        }
    };

    const resetForm = () => {
        setApplicationForm({
            subject: '',
            message: '',
            contactName: '',
            contactEmail: '',
            contactPhone: ''
        });
        setErrors({});
        setSuccessMessage('');
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            await API.post(`/applications/${selectedAuthority._id}/submit`, applicationForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccessMessage('Application submitted successfully! An email has been sent to the authority.');
            setTimeout(() => {
                setShowModal(false);
                resetForm();
                setDraftLoaded(false);
                setSuccessMessage('');
            }, 2000);
        } catch (error) {
            console.error('Submission failed:', error);
            alert(error.response?.data?.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && activeTab === 'authorities') {
        return <div className="flex justify-center py-12">Loading directory...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Authority Directory & Services</h1>
                    <p className="text-gray-500 mt-1">Find contact details of local authorities and useful government links</p>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('authorities')}
                            className={`pb-3 px-1 font-medium text-sm transition-colors ${activeTab === 'authorities'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Authorities
                        </button>
                        <button
                            onClick={() => setActiveTab('services')}
                            className={`pb-3 px-1 font-medium text-sm transition-colors ${activeTab === 'services'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Government Services
                        </button>
                    </div>
                </div>

                {activeTab === 'authorities' ? (
                    <>
                        {/* Filter Card with Search Button */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-8">
                            <h3 className="font-semibold text-gray-700 mb-3">Filter Authorities</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                <select
                                    value={filterInputs.cityCorporation}
                                    onChange={(e) => handleFilterChange('cityCorporation', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Cities</option>
                                    <option value="DNCC">DNCC</option>
                                    <option value="DSCC">DSCC</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Ward Number"
                                    value={filterInputs.ward}
                                    onChange={(e) => handleFilterChange('ward', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                <input
                                    type="text"
                                    placeholder="Zone (e.g., Zone-3, Executive Officer)"
                                    value={filterInputs.zone}
                                    onChange={(e) => handleFilterChange('zone', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                <select
                                    value={filterInputs.designation}
                                    onChange={(e) => handleFilterChange('designation', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="">All Designations</option>
                                    <option value="Mayor">Mayor</option>
                                    <option value="Councillor">Councillor</option>
                                    <option value="Ward Secretary">Ward Secretary</option>
                                    <option value="Zonal Executive Officer">Zonal Executive Officer</option>
                                </select>
                            </div>
                            <div className="flex justify-between items-center">
                                <button
                                    onClick={applyFilters}
                                    className="px-5 py-2 bg-[#FFA500] text-[#0F172A] rounded-lg hover:bg-[#e59400] transition"
                                >
                                    Search
                                </button>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="text-sm text-blue-600 hover:underline"
                                    >
                                        Clear all filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Results Section */}
                        {filteredAuthorities.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="mt-2 text-lg font-medium text-gray-900">No authorities found</h3>
                                <p className="mt-1 text-gray-500">Try adjusting your search criteria.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {standardAuthorities.length > 0 && (
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-800 mb-3">City Corporation Authorities</h2>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                            {standardAuthorities.map(authority => (
                                                <AuthorityCard
                                                    key={authority._id}
                                                    authority={authority}
                                                    onApply={() => {
                                                        setSelectedAuthority(authority);
                                                        setDraftLoaded(false);
                                                        setShowModal(true);
                                                        setSuccessMessage('');
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {otherAuthorities.length > 0 && (
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Other / Special Authorities</h2>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                            {otherAuthorities.map(authority => (
                                                <AuthorityCard
                                                    key={authority._id}
                                                    authority={authority}
                                                    onApply={() => {
                                                        setSelectedAuthority(authority);
                                                        setDraftLoaded(false);
                                                        setShowModal(true);
                                                        setSuccessMessage('');
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    // Government Services Tab (unchanged)
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        {loadingServices ? (
                            <div className="flex justify-center py-12">Loading services...</div>
                        ) : govServices.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">No government services available.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {govServices.map(service => (
                                    <a
                                        key={service._id}
                                        href={service.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group block p-5 border border-gray-200 rounded-xl hover:shadow-md transition hover:border-blue-200"
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-3xl">{service.icon}</span>
                                            <div>
                                                <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition">
                                                    {service.title}
                                                </h3>
                                                {service.description && (
                                                    <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Application Modal (unchanged) */}
            {showModal && selectedAuthority && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Send Application</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-500 mb-4">
                                To: <span className="font-medium">{selectedAuthority.name}</span> ({selectedAuthority.designation})
                            </p>
                            {successMessage && (
                                <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-sm">
                                    {successMessage}
                                </div>
                            )}
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                                    <input
                                        value={applicationForm.subject}
                                        onChange={(e) => setApplicationForm({ ...applicationForm, subject: e.target.value })}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.subject ? 'border-red-500' : 'border-gray-300'}`}
                                        placeholder="Brief subject of your application"
                                    />
                                    {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                                    <textarea
                                        rows="5"
                                        value={applicationForm.message}
                                        onChange={(e) => setApplicationForm({ ...applicationForm, message: e.target.value })}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.message ? 'border-red-500' : 'border-gray-300'}`}
                                        placeholder="Describe your issue or request in detail..."
                                    />
                                    {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                                        <input
                                            value={applicationForm.contactName}
                                            onChange={(e) => setApplicationForm({ ...applicationForm, contactName: e.target.value })}
                                            className={`w-full px-4 py-2 border rounded-lg ${errors.contactName ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {errors.contactName && <p className="text-red-500 text-xs mt-1">{errors.contactName}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Email *</label>
                                        <input
                                            type="email"
                                            value={applicationForm.contactEmail}
                                            onChange={(e) => setApplicationForm({ ...applicationForm, contactEmail: e.target.value })}
                                            className={`w-full px-4 py-2 border rounded-lg ${errors.contactEmail ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {errors.contactEmail && <p className="text-red-500 text-xs mt-1">{errors.contactEmail}</p>}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Phone Number *</label>
                                    <input
                                        value={applicationForm.contactPhone}
                                        onChange={(e) => setApplicationForm({ ...applicationForm, contactPhone: e.target.value })}
                                        className={`w-full px-4 py-2 border rounded-lg ${errors.contactPhone ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                    {errors.contactPhone && <p className="text-red-500 text-xs mt-1">{errors.contactPhone}</p>}
                                </div>
                            </div>
                            <div className="flex flex-wrap justify-end gap-3 mt-8">
                                <button
                                    onClick={saveDraft}
                                    disabled={savingDraft}
                                    className="flex items-center gap-2 px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
                                >
                                    {savingDraft ? 'Saving...' : 'Save Draft'}
                                    {draftSaved && <span className="text-green-300 text-sm">✓</span>}
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Application'}
                                </button>
                                <button onClick={() => setShowModal(false)} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper component for authority card
const AuthorityCard = ({ authority, onApply }) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
            <div className="flex flex-col h-full">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">{authority.name}</h3>
                    <p className="text-sm text-gray-600">{authority.designation}</p>
                    {authority.department && <p className="text-sm text-gray-500">{authority.department}</p>}
                    {(authority.ward || authority.zone) && (
                        <div className="text-xs text-gray-500 mt-1 flex gap-2">
                            {authority.ward && <span>Ward: {authority.ward}</span>}
                            {authority.zone && <span>Zone: {authority.zone}</span>}
                        </div>
                    )}
                    {authority.address && <p className="text-sm text-gray-500 mt-1">{authority.address}</p>}
                    {authority.website && (
                        <a href={authority.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline inline-block mt-2">
                            🌐 Website
                        </a>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3">
                        {authority.phone && authority.phone.map((phone, idx) => (
                            <a key={idx} href={`tel:${phone}`} className="text-blue-600 text-sm hover:underline">{phone}</a>
                        ))}
                        {authority.email && authority.email.map((email, idx) => (
                            <a key={idx} href={`mailto:${email}`} className="text-blue-600 text-sm hover:underline">{email}</a>
                        ))}
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                    <button onClick={onApply} className="w-full px-4 py-2 bg-[#FFA500] text-[#0F172A] rounded-lg hover:bg-[#e59400] transition text-sm font-medium">
                        Contact / Apply
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthorityDirectory;