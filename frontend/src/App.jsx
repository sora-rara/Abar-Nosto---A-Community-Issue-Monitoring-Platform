import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import CreateReport from './pages/CreateReport';
import Layout from './components/Layout';
import UpDashboard from './components/upDashboard';
import ComplaintDetails from './pages/ComplaintDetails';

function App() {
  return (
    <Router>
      <Layout> {/* Wrap everything with Layout */}
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<UpDashboard />} />
          <Route path="/complaint/:id" element={<ComplaintDetails />} />
          <Route path="/create-report" element={<CreateReport />} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;