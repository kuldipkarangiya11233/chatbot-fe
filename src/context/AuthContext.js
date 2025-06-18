import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios'; // For making API calls

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // To check auth status on initial load
  const [error, setError] = useState(null); // For auth-related errors

  // Set up axios defaults
  useEffect(() => {
    let userInfo = null;
    try {
      userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
    } catch (e) {
      userInfo = null;
    }
    console.log('Initial userInfo from localStorage:', userInfo); // Debug log

    if (userInfo && userInfo.token) {
      console.log('Setting token in axios defaults:', userInfo.token); // Debug log
      setCurrentUser(userInfo);
      // Set the default authorization header for all axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${userInfo.token}`;
    } else {
      console.log('No token found in localStorage'); // Debug log
      // Clear the authorization header if no token exists
      delete axios.defaults.headers.common['Authorization'];
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      console.log('Attempting login...'); // Debug log
      const { data } = await axios.post('/api/users/login', { email, password });
      console.log('Login response:', data); // Debug log
      // Fetch the latest user profile after login
      const profileRes = await axios.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const userWithProfile = { ...data, ...profileRes.data };
      localStorage.setItem('userInfo', JSON.stringify(userWithProfile));
      setCurrentUser(userWithProfile);
      console.log('Setting token after login:', data.token); // Debug log
      // Set the authorization header after successful login
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return userWithProfile; // Return user data for navigation logic in component
    } catch (err) {
      console.error('Login error:', err); // Debug log
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const register = async (email, password, confirmPassword) => {
    setError(null);
    try {
      console.log('Attempting registration...'); // Debug log
      const { data } = await axios.post('/api/users', { email, password, confirmPassword });
      console.log('Registration response:', data); // Debug log
      // Don't log in immediately after registration, let user log in manually
      // localStorage.setItem('userInfo', JSON.stringify(data));
      // setCurrentUser(data);
      // axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return data; // Return data for success message
    } catch (err) {
      console.error('Registration error:', err); // Debug log
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    console.log('Logging out...'); // Debug log
    localStorage.removeItem('userInfo');
    setCurrentUser(null);
    // Clear the authorization header on logout
    delete axios.defaults.headers.common['Authorization'];
    // Optionally, notify backend about logout
  };

  const updateUserProfile = async (profileData) => {
    setError(null);
    if (!currentUser || !currentUser.token) {
      setError("No user token found. Please log in again.");
      throw new Error("No user token found.");
    }
    try {
      const { data } = await axios.put('/api/users/profile', profileData);
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
  
  // Function to add a family member
  const addFamilyMember = async (memberData) => {
    setError(null);
    if (!currentUser || !currentUser.token) {
      setError("No user token found. Please log in again.");
      throw new Error("No user token found.");
    }
    try {
      const { data } = await axios.post('/api/users/profile/addmember', memberData);
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to add family member';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Add a function to check auth status
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
    setCurrentUser, // Expose to manually update user if needed from other parts
    setError, // To clear errors manually if needed
    checkAuthStatus // Expose the check function
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};