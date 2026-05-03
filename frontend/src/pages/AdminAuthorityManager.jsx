import { useState, useEffect } from 'react';
import API from '../services/api';

const AdminAuthorityManager = () => {
    const [activeTab, setActiveTab] = useState('authorities');
    const [authorities, setAuthorities] = useState([]);
    const [services, setServices] = useState([]);
    const [issues, setIssues] = useState([]);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [summary, setSummary] = useState('');
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingServices, setLoadingServices] = useState(false);
    const [loadingIssues, setLoadingIssues] = useState(false);

    // Authority form state
    const [authForm, setAuthForm] = useState({
        name: '', designation: '', department: '', cityCorporation: 'DNCC',
        ward: '', zone: '', address: '', phone: [], email: [], website: '', officeHours: ''
    });
    const [editingAuthId, setEditingAuthId] = useState(null);
    const [phoneInput, setPhoneInput] = useState('');
    const [emailInput, setEmailInput] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    // Service form state
    const [serviceForm, setServiceForm] = useState({ title: '', url: '', description: '', icon: '🔗', order: 0 });
    const [editingServiceId, setEditingServiceId] = useState(null);

    useEffect(() => {
        fetchAuthorities();
        fetchServices();
        fetchIssues();
    }, []);

    const fetchAuthorities = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await API.get('/authorities');
            setAuthorities(res.data.data);
        } catch (error) {
            console.error('Failed to fetch authorities:', error);
            setMessage({ type: 'error', text: 'Could not load authorities' });
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async () => {
        setLoadingServices(true);
        try {
            const token = localStorage.getItem('token');
            const res = await API.get('/gov-services/admin/all');
            setServices(res.data.data);
        } catch (error) {
            console.error('Failed to fetch services:', error);
        } finally {
            setLoadingServices(false);
        }
    };

    const fetchIssues = async () => {
        setLoadingIssues(true);
        try {
            const token = localStorage.getItem('token');
            const res = await API.get('/issues');
            // ✅ Extract the actual array from res.data
            const issuesArray = res.data.data || (Array.isArray(res.data) ? res.data : []);
            setIssues(issuesArray);
        } catch (error) {
            console.error('Failed to fetch issues:', error);
            setIssues([]); // fallback to empty array
        } finally {
            setLoadingIssues(false);
        }
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    // Authority handlers (unchanged from previous version)
    const handleAuthChange = (e) => {
        const { name, value } = e.target;
        setAuthForm(prev => ({ ...prev, [name]: value }));
    };
    const addPhone = () => { if (phoneInput.trim()) { setAuthForm(prev => ({ ...prev, phone: [...prev.phone, phoneInput.trim()] })); setPhoneInput(''); } };
    const removePhone = (idx) => { setAuthForm(prev => ({ ...prev, phone: prev.phone.filter((_, i) => i !== idx) })); };
    const addEmail = () => { if (emailInput.trim()) { setAuthForm(prev => ({ ...prev, email: [...prev.email, emailInput.trim()] })); setEmailInput(''); } };
    const removeEmail = (idx) => { setAuthForm(prev => ({ ...prev, email: prev.email.filter((_, i) => i !== idx) })); };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (editingAuthId) {
await API.put(`/authorities/${editingAuthId}`, authForm);
                showMessage('Authority updated');
            } else {
                await API.post('/authorities', authForm);
                showMessage('Authority created');
            }
            resetAuthForm();
            fetchAuthorities();
        } catch (error) {
            showMessage('Error saving authority', 'error');
        }
    };

    const resetAuthForm = () => {
        setAuthForm({ name: '', designation: '', department: '', cityCorporation: 'DNCC', ward: '', zone: '', address: '', phone: [], email: [], website: '', officeHours: '' });
        setEditingAuthId(null);
    };

    const editAuthority = (auth) => {
        setAuthForm(auth);
        setEditingAuthId(auth._id);
        setActiveTab('authorities');
    };

    const confirmDeleteAuthority = (id, name) => {
        setShowDeleteConfirm({ type: 'authority', id, name });
    };

    const deleteAuthority = async () => {
        if (!showDeleteConfirm) return;
        try {
            const token = localStorage.getItem('token');
            await API.delete(`/authorities/${showDeleteConfirm.id}`);
            showMessage('Authority deleted');
            fetchAuthorities();
        } catch (error) {
            showMessage('Delete failed', 'error');
        } finally {
            setShowDeleteConfirm(null);
        }
    };

    // Service handlers
    const handleServiceChange = (e) => {
        setServiceForm({ ...serviceForm, [e.target.name]: e.target.value });
    };

    const handleServiceSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (editingServiceId) {
                await API.put(`/gov-services/${editingServiceId}`, serviceForm);
                showMessage('Service updated');
            } else {
                await API.post('/gov-services', serviceForm);
                showMessage('Service created');
            }
            resetServiceForm();
            fetchServices();
        } catch (error) {
            showMessage('Error saving service', 'error');
        }
    };

    const resetServiceForm = () => {
        setServiceForm({ title: '', url: '', description: '', icon: '🔗', order: 0 });
        setEditingServiceId(null);
    };

    const editService = (service) => {
        setServiceForm(service);
        setEditingServiceId(service._id);
        setActiveTab('services');
    };

    const confirmDeleteService = (id, name) => {
        setShowDeleteConfirm({ type: 'service', id, name });
    };

    const deleteService = async () => {
        if (!showDeleteConfirm) return;
        try {
            const token = localStorage.getItem('token');
            await API.delete(`/gov-services/${showDeleteConfirm.id}`);
            showMessage('Service deleted');
            fetchServices();
        } catch (error) {
            showMessage('Delete failed', 'error');
        } finally {
            setShowDeleteConfirm(null);
        }
    };

    // Summary generator handlers
    const generateSummary = async (issueId) => {
        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await API.get(`/summary/issues/${issueId}/summary`);
            setSummary(res.data.data.summary);
        } catch (error) {
            console.error('Failed to generate summary:', error);
            setSummary('Error generating summary. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleIssueSelect = async (issue) => {
        setSelectedIssue(issue);
        await generateSummary(issue._id);
    };

    const downloadSummary = () => {
        if (!summary) return;
        const blob = new Blob([summary], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summary_${selectedIssue._id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (loading && activeTab === 'authorities') {
        return <div className="flex justify-center py-12">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Management</h1>
                <p className="text-gray-600 mb-6">Manage authority contacts, government services, and generate issue summaries</p>

                {message.text && (
                    <div className={`mb-4 p-3 rounded-lg ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message.text}
                    </div>
                )}

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <div className="flex space-x-6">
                        <button
                            onClick={() => setActiveTab('authorities')}
                            className={`pb-3 px-1 font-medium text-sm transition-colors ${activeTab === 'authorities' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Authority Contacts
                        </button>
                        <button
                            onClick={() => setActiveTab('services')}
                            className={`pb-3 px-1 font-medium text-sm transition-colors ${activeTab === 'services' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Government Services
                        </button>
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`pb-3 px-1 font-medium text-sm transition-colors ${activeTab === 'summary' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Summary Generator
                        </button>
                    </div>
                </div>

                {/* Authority Contacts Tab */}
                {activeTab === 'authorities' && (
                    <div className="space-y-8">
                        {/* Form Card (same as before) */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b bg-gray-50">
                                <h2 className="text-lg font-semibold text-gray-800">{editingAuthId ? 'Edit Authority' : 'Add New Authority'}</h2>
                            </div>
                            <form onSubmit={handleAuthSubmit} className="p-6 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label><input type="text" name="name" value={authForm.name} onChange={handleAuthChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label><input type="text" name="designation" value={authForm.designation} onChange={handleAuthChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><input type="text" name="department" value={authForm.department} onChange={handleAuthChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">City Corporation *</label><select name="cityCorporation" value={authForm.cityCorporation} onChange={handleAuthChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="DNCC">DNCC</option><option value="DSCC">DSCC</option></select></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Ward Number</label><input type="text" name="ward" value={authForm.ward} onChange={handleAuthChange} placeholder="e.g., 48" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Zone</label><input type="text" name="zone" value={authForm.zone} onChange={handleAuthChange} placeholder="e.g., Zone-3" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea name="address" value={authForm.address} onChange={handleAuthChange} rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea></div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Numbers</label>
                                    <div className="flex gap-2"><input type="text" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" /><button type="button" onClick={addPhone} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button></div>
                                    <div className="flex flex-wrap gap-2 mt-2">{authForm.phone.map((p, idx) => (<span key={idx} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-sm">{p}<button type="button" onClick={() => removePhone(idx)} className="text-red-500">✕</button></span>))}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Addresses</label>
                                    <div className="flex gap-2"><input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" /><button type="button" onClick={addEmail} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button></div>
                                    <div className="flex flex-wrap gap-2 mt-2">{authForm.email.map((e, idx) => (<span key={idx} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-sm">{e}<button type="button" onClick={() => removeEmail(idx)} className="text-red-500">✕</button></span>))}</div>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Official Website</label><input type="url" name="website" value={authForm.website} onChange={handleAuthChange} placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Office Hours</label><input type="text" name="officeHours" value={authForm.officeHours} onChange={handleAuthChange} placeholder="9 AM - 5 PM" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                                <div className="flex gap-3"><button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg">{editingAuthId ? 'Update Authority' : 'Create Authority'}</button>{editingAuthId && <button type="button" onClick={resetAuthForm} className="px-5 py-2 bg-gray-200 rounded-lg">Cancel</button>}</div>
                            </form>
                        </div>
                        {/* List Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b bg-gray-50"><h2 className="text-lg font-semibold text-gray-800">Existing Authorities</h2></div>
                            {authorities.length === 0 ? <div className="p-8 text-center text-gray-500">No authorities found.</div> : <div className="divide-y">{authorities.map(auth => (<div key={auth._id} className="p-5 flex justify-between items-center"><div><h3 className="font-semibold">{auth.name}</h3><p className="text-sm text-gray-600">{auth.designation}</p>{auth.ward && <p className="text-xs text-gray-500">Ward: {auth.ward}</p>}</div><div className="flex gap-2"><button onClick={() => editAuthority(auth)} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg">Edit</button><button onClick={() => confirmDeleteAuthority(auth._id, auth.name)} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg">Delete</button></div></div>))}</div>}
                        </div>
                    </div>
                )}

                {/* Government Services Tab */}
                {activeTab === 'services' && (
                    <div className="space-y-8">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b bg-gray-50"><h2 className="text-lg font-semibold text-gray-800">{editingServiceId ? 'Edit Government Service' : 'Add New Government Service'}</h2></div>
                            <form onSubmit={handleServiceSubmit} className="p-6 space-y-5">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input name="title" value={serviceForm.title} onChange={handleServiceChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">URL *</label><input name="url" value={serviceForm.url} onChange={handleServiceChange} required placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label><textarea name="description" value={serviceForm.description} onChange={handleServiceChange} rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Icon (emoji)</label><input name="icon" value={serviceForm.icon} onChange={handleServiceChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label><input type="number" name="order" value={serviceForm.order} onChange={handleServiceChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                                <div className="flex gap-3"><button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg">{editingServiceId ? 'Update Service' : 'Create Service'}</button>{editingServiceId && <button type="button" onClick={resetServiceForm} className="px-5 py-2 bg-gray-200 rounded-lg">Cancel</button>}</div>
                            </form>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b bg-gray-50"><h2 className="text-lg font-semibold text-gray-800">Existing Services</h2></div>
                            {services.length === 0 ? <div className="p-8 text-center text-gray-500">No services found.</div> : <div className="divide-y">{services.map(service => (<div key={service._id} className="p-5 flex justify-between items-center"><div><div className="flex items-center gap-2"><span className="text-2xl">{service.icon}</span><span className="font-semibold">{service.title}</span></div>{service.description && <p className="text-sm text-gray-500 mt-1">{service.description}</p>}</div><div className="flex gap-2"><button onClick={() => editService(service)} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg">Edit</button><button onClick={() => confirmDeleteService(service._id, service.title)} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg">Delete</button></div></div>))}</div>}
                        </div>
                    </div>
                )}

                {/* Summary Generator Tab */}
                {activeTab === 'summary' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-blue-600 px-6 py-4"><h2 className="text-xl font-semibold text-white">Select an Issue</h2></div>
                            <div className="divide-y max-h-[500px] overflow-y-auto">
                                {loadingIssues ? <div className="p-8 text-center">Loading issues...</div> : issues.length === 0 ? <div className="p-8 text-center text-gray-500">No issues found.</div> : issues.map(issue => (
                                    <button key={issue._id} onClick={() => handleIssueSelect(issue)} className={`w-full text-left p-4 hover:bg-gray-50 transition ${selectedIssue?._id === issue._id ? 'bg-blue-50' : ''}`}>
                                        <h3 className="font-semibold text-gray-800">{issue.title}</h3>
                                        <p className="text-sm text-gray-500 mt-1">{issue.upvoteCount} upvotes • {issue.commentCount} comments • Status: {issue.status}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Generated Summary</h2>
                            {generating ? <div className="text-center py-8">Generating summary...</div> : summary ? (
                                <>
                                    <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap font-mono text-sm max-h-[400px] overflow-y-auto">{summary}</div>
                                    <div className="mt-4 flex justify-end">
                                        <button onClick={downloadSummary} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Download Summary (TXT)</button>
                                    </div>
                                </>
                            ) : <div className="text-center py-8 text-gray-500">Select an issue to generate a summary</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Confirm Deletion</h3>
                        <p className="text-gray-600 mb-6">Are you sure you want to delete {showDeleteConfirm.type === 'authority' ? 'authority' : 'service'} "{showDeleteConfirm.name}"? This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
                            <button onClick={showDeleteConfirm.type === 'authority' ? deleteAuthority : deleteService} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAuthorityManager;