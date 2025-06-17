import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios'; // For making API calls

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // To check auth status on initial load
  const [error, setError] = useState(null); // For auth-related errors

  useEffect(() => {
    // Check for existing user session on initial load
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo && userInfo.token) {
      setCurrentUser(userInfo);
      // You might want to verify the token with the backend here
      // For simplicity, we're trusting the localStorage item for now
      axios.defaults.headers.common['Authorization'] = `Bearer ${userInfo.token}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const { data } = await axios.post('/api/users/login', { email, password });
      localStorage.setItem('userInfo', JSON.stringify(data));
      setCurrentUser(data);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return data; // Return user data for navigation logic in component
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const register = async (email, password, confirmPassword) => {
    setError(null);
    try {
      const { data } = await axios.post('/api/users/register', { email, password, confirmPassword });
      // Don't log in immediately after registration, let user log in manually
      // localStorage.setItem('userInfo', JSON.stringify(data));
      // setCurrentUser(data);
      // axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return data; // Return data for success message
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    setCurrentUser(null);
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
        const config = {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentUser.token}`,
            },
        };
        const { data } = await axios.put('/api/users/profile', profileData, config);
        localStorage.setItem('userInfo', JSON.stringify(data)); // Update stored user info
        setCurrentUser(data); // Update context state
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
        const config = {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentUser.token}`,
            },
        };
        const { data } = await axios.post('/api/users/profile/addmember', memberData, config);
        // Optionally, refresh current user data if familyMembers list is part of it and needs update
        // For now, just return success data
        return data;
    } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to add family member';
        setError(errorMessage);
        throw new Error(errorMessage);
    }
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
    setError // To clear errors manually if needed
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};