import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevents the page from refreshing
    try {
      // Sending the data to your backend API
      const response = await axios.post('http://localhost:5000/api/auth/register', formData);
      
      // If successful, save the token to the browser and show a success message
      localStorage.setItem('token', response.data.token);
      setMessage('Registration successful! Welcome to Abar Nosto!');
      setFormData({ name: '', email: '', password: '' }); // Clear the form
    } catch (error) {
      setMessage(error.response?.data?.message || 'Registration failed. Try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg w-1/3 min-w-[350px]">
        <h3 className="text-2xl font-bold text-center text-blue-600">Register an Account</h3>
        
        {message && (
          <div className="p-3 mt-4 text-sm text-center text-white bg-blue-500 rounded">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="mt-4">
            <label className="block" htmlFor="name">Name</label>
            <input type="text" placeholder="Full Name" name="name" value={formData.name} onChange={handleChange} required
              className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
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
          <div className="flex items-baseline justify-between">
            <button className="w-full px-6 py-2 mt-6 text-white bg-blue-600 rounded-lg hover:bg-blue-900">
              Register
            </button>
            <p className="mt-4 text-sm text-center text-gray-600">
                Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Login here</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;