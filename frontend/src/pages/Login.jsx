import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', formData);
      
      // Save token and username to local storage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userName', response.data.name);
      
      // Show success message
      setMessage(`Welcome back, ${response.data.name}!`);
      
      // Redirect to dashboard after 1 second
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
      
    } catch (error) {
      setMessage(error.response?.data?.message || 'Login failed. Check your credentials.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg w-1/3 min-w-[350px]">
        <h3 className="text-2xl font-bold text-center text-blue-600">Login to Abar Nosto!</h3>
        
        {message && (
          <div className={`p-3 mt-4 text-sm text-center text-white rounded ${message.includes('failed') ? 'bg-red-500' : 'bg-green-500'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="mt-4">
            <label className="block" htmlFor="email">Email</label>
            <input type="email" placeholder="Email Address" name="email" value={formData.email} onChange={handleChange} required
              className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
          <div className="mt-4">
            <label className="block" htmlFor="password">Password</label>
            <input type="password" placeholder="Password" name="password" value={formData.password} onChange={handleChange} required
              className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
          <div className="flex flex-col items-center justify-between mt-6">
            <button className="w-full px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-900">
              Login
            </button>
            <p className="mt-4 text-sm text-gray-600">
              Don't have an account? <Link to="/register" className="text-blue-600 hover:underline">Register here</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;