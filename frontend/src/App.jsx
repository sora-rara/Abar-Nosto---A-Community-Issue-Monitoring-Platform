import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import CreateReport from './pages/CreateReport';
import Layout from './components/Layout';
import UpDashboard from './components/upDashboard';
import ComplaintDetails from './pages/ComplaintDetails';
import AdminDashboard from './pages/AdminDashboard';
import PreferencesPage from './pages/PreferencesPage';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import Toast from './components/Toast';
import axios from 'axios';
import AdvancedSearch from './components/AdvancedSearch';
import SharedIssue from './pages/SharedIssue';
import UserProfile from './pages/UserProfile';
import AdminReputation from './pages/AdminReputation';
import MapPage from './pages/MapPage';

// ===== ADDED from second file =====
import AdminWardStats from './components/AdminWardStats';
import AdminActivityFeed from './pages/AdminActivityFeed';
// =================================

// ===== NEW from second file =====
import AuthorityDirectory from './components/AuthorityDirectory';
import AdminAuthorityManager from './pages/AdminAuthorityManager';
import AdminSummaryGenerator from './pages/AdminSummaryGenerator';
// =================================

axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!token || !user) {
        return <Navigate to="/login" />;
    }

    if (requireAdmin && !(user.isAdmin || user.role === 'admin')) {
        return <Navigate to="/home" />;
    }

    return children;
};

// ✅ ToastListener component – must be inside NotificationProvider
const ToastListener = () => {
    const { toastNotification, clearToast } = useNotifications();
    if (!toastNotification) return null;
    return (
        <Toast
            key={toastNotification._id}          // ← forces remount on every new notification
            notification={toastNotification}
            onClose={clearToast}
        />
    );
};

function App() {
    return (
        <NotificationProvider>
            <Router>
                <Layout>
                    <ToastListener />
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/home" element={
                            <ProtectedRoute>
                                <Home />
                            </ProtectedRoute>
                        } />
                        <Route path="/dashboard" element={
                            <ProtectedRoute>
                                <UpDashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="/complaint/:id" element={
                            <ProtectedRoute>
                                <ComplaintDetails />
                            </ProtectedRoute>
                        } />
                        <Route path="/create-report" element={
                            <ProtectedRoute>
                                <CreateReport />
                            </ProtectedRoute>
                        } />
                        <Route path="/preferences" element={
                            <ProtectedRoute>
                                <PreferencesPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin" element={
                            <ProtectedRoute requireAdmin={true}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="/map" element={
                            <ProtectedRoute>
                                <MapPage />
                            </ProtectedRoute>
                        } />

                        {/* ===== ADDED from second file ===== */}
                        <Route path="/admin/stats" element={
                            <ProtectedRoute requireAdmin={true}>
                                <AdminWardStats />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/activity-feed" element={
                            <ProtectedRoute requireAdmin={true}>
                                <AdminActivityFeed />
                            </ProtectedRoute>
                        } />
                        {/* ================================== */}

                        {/* ===== NEW from second file ===== */}
                        <Route path="/authorities" element={
                            <ProtectedRoute>
                                <AuthorityDirectory />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/authorities" element={
                            <ProtectedRoute requireAdmin={true}>
                                <AdminAuthorityManager />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/issues" element={<AdminDashboard />} />
                        <Route path="/admin/summary" element={
                            <ProtectedRoute requireAdmin={true}>
                                <AdminSummaryGenerator />
                            </ProtectedRoute>
                        } />
                        {/* ================================== */}

                        <Route path="/search" element={
                            <ProtectedRoute>
                                <AdvancedSearch />
                            </ProtectedRoute>
                        } />
                        <Route path="/shared-issue/:id" element={<SharedIssue />} />

                        {/* ========== PINPOINT 3: ADD USER PROFILE ROUTE FROM 1st CODE ========== */}
                        {/* User Profile Route */}
                        <Route path="/profile" element={
                            <ProtectedRoute>
                                <UserProfile />
                            </ProtectedRoute>
                        } />
                        {/* ========== END OF PINPOINT 3 ========== */}

                        {/* ========== PINPOINT 4: ADD ADMIN REPUTATION MANAGEMENT ROUTE FROM 1st CODE ========== */}
                        {/* Admin Reputation Management Route */}
                        <Route path="/admin/reputation" element={
                            <ProtectedRoute requireAdmin={true}>
                                <AdminReputation />
                            </ProtectedRoute>
                        } />
                    </Routes>
                </Layout>
            </Router>
        </NotificationProvider>
    );
}

export default App;