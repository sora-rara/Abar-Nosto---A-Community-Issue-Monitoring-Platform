import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        } else {
            setUserName(localStorage.getItem('userName') || 'User');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        navigate('/login');
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            {/* --- The Header (Navbar) --- */}
            <header className="flex items-center justify-between p-4 text-white bg-blue-600 shadow-md">
                {/* 1. Logout Button on Left */}
                <button 
                    onClick={handleLogout} 
                    className="px-4 py-2 text-sm bg-blue-800 rounded hover:bg-red-600"
                >
                    Logout
                </button>
                
                {/* 2. Page Title */}
                <h1 className="text-xl font-bold">Abar Nosto!</h1>

                {/* 3. Home Button on Right */}
                <Link to="/dashboard" className="px-4 py-2 text-sm bg-blue-800 rounded hover:bg-blue-900">
                    Home
                </Link>
            </header>

            {/* --- The Main Content Area with Your Image Background --- */}
            <main 
                className="flex flex-col items-center justify-center flex-grow bg-center bg-cover"
                /* Notice how it just uses a forward slash to look in the public folder! */
                style={{ backgroundImage: "url('/pokemon.jpg')" }}
            >
                <div className="p-8 text-center bg-white shadow-xl bg-opacity-80 rounded-lg">
                    <h2 className="text-3xl font-bold text-blue-800">Welcome, {userName}!</h2>
                    <p className="mt-4 text-gray-700">This is your dashboard.</p>
                </div>
            </main>
        </div>
    );
};

export default Home;