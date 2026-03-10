import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import CreateReport from './pages/CreateReport';
import Layout from './components/Layout';
import UpDashboard from './components/upDashboard';
import ComplaintDetails from './pages/ComplaintDetails';
import AdminDashboard from './pages/AdminDashboard';

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

function App() {
    return (
        <Router>
            <Layout> {/* Wrap everything with Layout */}
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
                    <Route path="/admin" element={
                        <ProtectedRoute requireAdmin={true}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    } />
                </Routes>
            </Layout>
        </Router>
    );
}

export default App;