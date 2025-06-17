import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

// Simple Logo component (can be enhanced or moved)
const AppLogo = () => (
  <div className="mx-auto h-16 w-auto text-center">
    {/* You can use an SVG or an img tag here */}
    <span className="text-4xl font-extrabold text-indigo-600 tracking-tight">ChatWithFamily</span>
  </div>
);

const LoginPage = () => {
  const { login, currentUser, error: authError, setError: setAuthError } = useAuth(); // Get login function and auth state
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // Component-specific error
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      // Clear the message from state so it doesn't reappear on refresh/re-render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    // If user is already logged in (e.g. refreshed page), redirect
    if (currentUser) {
      if (currentUser.isProfileComplete) {
        navigate('/dashboard');
      } else {
        navigate('/profile', { state: { message: 'Please complete your profile.' } });
      }
    }
  }, [currentUser, navigate]);
  
  useEffect(() => {
    // Display auth errors from context if they occur
    if (authError) {
        setError(authError);
        // Clear the error in context after displaying it
        // setAuthError(null); // Or handle this within AuthContext itself
    }
  }, [authError, setAuthError]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear local error
    setAuthError(null); // Clear context error
    setMessage('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        return;
    }
    setLoading(true);
    try {
      const userData = await login(email, password);
      setMessage(userData.message || 'Login successful!');
      if (userData.isProfileComplete) {
        navigate('/dashboard');
      } else {
        navigate('/profile', { state: { message: 'Login successful. Please complete your profile.' } });
      }
    } catch (err) {
      // Error is already set in AuthContext and displayed via useEffect
      // setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-2xl">
        <AppLogo />
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Welcome Back!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Log in to continue to your family chat.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">{error}</div>}
          {message && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm text-center">{message}</div>}

          <div className="space-y-5">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            {/* Optional: Forgot password link */}
            {/* <div className="text-sm">
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot your password?
              </a>
            </div> */}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors duration-150 shadow-md hover:shadow-lg"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </div>
        </form>
        <div className="mt-8 text-sm text-center">
          <p className="text-gray-600">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;