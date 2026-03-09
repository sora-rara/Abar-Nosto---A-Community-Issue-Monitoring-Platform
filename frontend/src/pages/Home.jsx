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

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            {/* Main Content Area with Image Background */}
            <main
                className="flex flex-col items-center justify-center flex-grow bg-center bg-cover"
                style={{ backgroundImage: "url('/pokemon.jpg')" }}
            >
                <div className="p-8 text-center bg-white shadow-xl bg-opacity-80 rounded-lg">
                    <h2 className="text-3xl font-bold text-blue-800">Welcome, {userName}!</h2>
                    <p className="mt-4 text-gray-700">This is your dashboard.</p>

                    {/* Quick action button */}
                    <div className="mt-6">
                        <Link
                            to="/create-report"
                            className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <span className="text-2xl mr-2">📸</span>
                            Report an Issue
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Home;