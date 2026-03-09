import axios from 'axios';

const API_URL = 'http://localhost:5000/api/reports';

// Create a new report with photos
export const createReport = async (formData, token) => {
    const config = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        }
    };
    const response = await axios.post(API_URL, formData, config);
    return response.data;
};

// Get nearby reports
export const getNearbyReports = async (lat, lng, radius = 500, token) => {
    const config = {
        headers: { 'Authorization': `Bearer ${token}` }
    };
    const response = await axios.get(
        `${API_URL}/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
        config
    );
    return response.data;
};

// Get user's reports
export const getMyReports = async (token) => {
    const config = {
        headers: { 'Authorization': `Bearer ${token}` }
    };
    const response = await axios.get(`${API_URL}/my-reports`, config);
    return response.data;
};

// Get single report
export const getReportById = async (id, token) => {
    const config = {
        headers: { 'Authorization': `Bearer ${token}` }
    };
    const response = await axios.get(`${API_URL}/${id}`, config);
    return response.data;
};

// Upvote a report
export const upvoteReport = async (id, token) => {
    const config = {
        headers: { 'Authorization': `Bearer ${token}` }
    };
    const response = await axios.put(`${API_URL}/${id}/upvote`, {}, config);
    return response.data;
};