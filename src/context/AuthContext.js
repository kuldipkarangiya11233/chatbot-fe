import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const BASE_URL = 'https://chatbot-be-732a.onrender.com';

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    let userInfo = null;
    try {
      userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
    } catch (e) {
      userInfo = null;
    }
    console.log('Initial userInfo from localStorage:', userInfo);

    if (userInfo && userInfo.token) {
      console.log('Setting token in axios defaults:', userInfo.token);
      setCurrentUser(userInfo);

      axios.defaults.headers.common['Authorization'] = `Bearer ${userInfo.token}`;
    } else {
      console.log('No token found in localStorage');

      delete axios.defaults.headers.common['Authorization'];
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      console.log('Attempting login...');
      const { data } = await axios.post(`${BASE_URL}/api/users/login`, { email, password });
      console.log('Login response:', data);
      console.log(BASE_URL, 'BASE_URL')

      const profileRes = await axios.get(`${BASE_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const userWithProfile = { ...data, ...profileRes.data };
      localStorage.setItem('userInfo', JSON.stringify(userWithProfile));
      setCurrentUser(userWithProfile);
      console.log('Setting token after login:', data.token);

      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return userWithProfile;
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const register = async (email, password, confirmPassword) => {
    setError(null);
    try {
      console.log('Attempting registration...');
      const { data } = await axios.post(`${BASE_URL}/api/users`, { email, password, confirmPassword });
      console.log('Registration response:', data); // Debug log
      return data;
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    console.log('Logging out...');
    localStorage.removeItem('userInfo');
    setCurrentUser(null);
    delete axios.defaults.headers.common['Authorization'];

  };

  const updateUserProfile = async (profileData) => {
    setError(null);
    if (!currentUser || !currentUser.token) {
      setError("No user token found. Please log in again.");
      throw new Error("No user token found.");
    }
    try {
      const { data } = await axios.put(`${BASE_URL}/api/users/profile`, profileData);
      const updatedUser = { ...currentUser, ...data };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Profile update failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };


  const addFamilyMember = async (memberData) => {
    setError(null);
    if (!currentUser || !currentUser.token) {
      setError("No user token found. Please log in again.");
      throw new Error("No user token found.");
    }
    try {
      const { data } = await axios.post(`${BASE_URL}/api/users/profile/addmember`, memberData);
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to add family member';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };


  const checkAuthStatus = () => {
    let userInfo = null;
    try {
      userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
    } catch (e) {
      userInfo = null;
    }
    console.log('Current auth status:', {
      hasUserInfo: !!userInfo,
      hasToken: !!(userInfo && userInfo.token),
      currentUser: currentUser,
      axiosHeaders: axios.defaults.headers.common
    });
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    updateUserProfile,
    addFamilyMember,
    setCurrentUser,
    setError,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};