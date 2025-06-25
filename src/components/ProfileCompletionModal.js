import React, { useState } from 'react';
import axios from 'axios';

const ProfileCompletionModal = ({ onComplete }) => {
  // const BASE_URL = 'https://chatbot-be-732a.onrender.com';
  const BASE_URL = 'http://localhost:5000';
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    healthStage: '',
  });
  const [error, setError] = useState('');
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const { data } = await axios.put(`${BASE_URL}/api/users/profile`, formData);
      onComplete(data);
    } catch (error) {
      setError(error.response?.data?.message || 'Error updating profile');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Complete Your Profile</h2>
        <p className="text-gray-600 mb-6">
          Please complete your profile information to continue.
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Mobile Number</label>
            <input
              type="tel"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Health Stage</label>
            <select
              name="healthStage"
              value={formData.healthStage}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select Health Stage</option>
              <option value="critical">Critical</option>
              <option value="serious">Serious</option>
              <option value="stable">Stable</option>
              <option value="normal">Normal</option>
              <option value="good">Good</option>
              <option value="excellent">Excellent</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Complete Profile
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileCompletionModal; 