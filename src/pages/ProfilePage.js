import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom'; // Added Link
import { useAuth } from '../context/AuthContext';

// Simple Logo component (can be shared or moved to a components folder)
const AppLogo = () => (
  <div className="mx-auto h-16 w-auto text-center mb-4">
    <span className="text-4xl font-extrabold text-indigo-600 tracking-tight">ChatWithFamily</span>
  </div>
);


const ProfilePage = () => {
  const { currentUser, updateUserProfile, error: authError, setError: setAuthError } = useAuth(); // Removed setCurrentUser
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [stage, setStage] = useState(''); // Default to 'normal' or empty
  const [currentPassword, setCurrentPassword] = useState(''); // For password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [loading, setLoading] = useState(false); // For loading state during submission


  const STAGE_OPTIONS = ['normal', 'critical', 'recovering', 'stable', 'watchful'];

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { state: { message: "Please log in to access your profile." } });
    } else {
      setName(currentUser.fullName || '');
      setMobileNumber(currentUser.mobileNumber || '');
      setStage(currentUser.healthStage || '');
      if (location.state?.message) {
        setMessage(location.state.message);
        navigate(location.pathname, { replace: true, state: {} }); // Clear message from state
      }
    }
  }, [currentUser, navigate, location]);
  
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

    if (!fullName || !mobileNumber || !stage) {
      setError('Name, mobile number, and stage are required.');
      return;
    }
    
    if (!/^\d{10}$/.test(mobileNumber)) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
    }

    let passwordPayload = {};
    if (showPasswordFields) {
        if (newPassword && newPassword !== confirmNewPassword) {
            setError('New passwords do not match.');
            return;
        }
        if (newPassword && newPassword.length < 6) {
            setError('New password must be at least 6 characters long.');
            return;
        }
        // Only include password fields if newPassword is set
        if (newPassword) {
             // Backend should handle if currentPassword is required for existing users
            passwordPayload = { currentPassword: currentPassword || undefined, password: newPassword, confirmPassword: confirmNewPassword };
        } else if (currentPassword && !newPassword) {
            // User entered current password but no new password
            setError('Please enter a new password if you wish to change it.');
            return;
        }
    }
    setLoading(true);
    try {
      const profileData = { fullName, mobileNumber, healthStage: stage, ...passwordPayload };
      const updatedUserData = await updateUserProfile(profileData); // This function is from useAuth and will throw on error
      
      // On success:
      setMessage(updatedUserData.message || 'Profile updated successfully!');
      setError(''); // Clear any previous error

      // Update currentUser in context if the structure from backend matches
      // AuthContext's updateUserProfile already updates currentUser and localStorage
      // setCurrentUser(updatedUserData); // This might be redundant if AuthContext handles it fully

      // Clear password fields after successful update
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordFields(false); // Optionally hide fields on success

      if (updatedUserData.isProfileComplete) {
         setTimeout(() => navigate('/dashboard'), 1500);
      }
      
    } catch (err) {
      // On error:
      // The error object 'err' here is the one thrown by AuthContext's updateUserProfile
      console.error("Error in ProfilePage handleSubmit:", err); // DEBUGGING LINE
      console.error("Error message to be set:", err.message); // DEBUGGING LINE
      setError(err.message || 'An unexpected error occurred during profile update.');
      setMessage(''); // Clear any previous success message
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-teal-400 via-blue-500 to-indigo-600 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-2xl">
        <AppLogo />
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            {currentUser?.isProfileComplete ? 'Update Your Profile' : 'Complete Your Profile'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {currentUser?.isProfileComplete ? 'Keep your information up to date.' : 'Please fill in your details to continue.'}
          </p>
        </div>

        {/* Display messages and errors */}
        {message && !error && <div className="my-4 p-4 bg-green-100 text-green-700 rounded-lg text-sm text-center shadow">{message}</div>}
        {error && <div className="my-4 p-4 bg-red-100 text-red-700 rounded-lg text-sm text-center shadow">{error}</div>}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Profile Details Section */}
          <div className="space-y-5 p-6 border border-gray-200 rounded-lg bg-gray-50 shadow-inner">
            <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-300 pb-2 mb-4">Personal Information</h3>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number
              </label>
              <input
                id="mobileNumber"
                name="mobileNumber"
                type="tel"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                placeholder="10-digit mobile number"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
              />
            </div>

            {/* Show stage only for patients */}
            {currentUser?.role === 'patient' && (
              <div>
                <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Stage
                </label>
                <select
                  id="stage"
                  name="stage"
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg shadow-sm transition-shadow"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                >
                  <option value="" disabled>Select your stage</option>
                  {STAGE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {/* Password Change Section */}
          <div className="space-y-5 p-6 border border-gray-200 rounded-lg bg-gray-50 shadow-inner">
             <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-300 pb-2 mb-4">Change Password (Optional)</h3>
            <div className="flex items-center">
                <button
                    type="button"
                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none underline"
                >
                    {showPasswordFields ? 'Cancel Password Change' : 'Want to change your password?'}
                </button>
            </div>

            {showPasswordFields && (
                <>
                    <div>
                        <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input
                        id="current-password"
                        name="currentPassword"
                        type="password"
                        className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">New Password <span className="text-xs text-gray-500">(min. 6 characters)</span></label>
                        <input
                        id="new-password"
                        name="newPassword"
                        type="password"
                        className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input
                        id="confirm-new-password"
                        name="confirmNewPassword"
                        type="password"
                        className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                        placeholder="Re-enter new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        />
                    </div>
                </>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors duration-150 shadow-md hover:shadow-lg"
            >
              {loading ? 'Saving...' : (currentUser?.isProfileComplete ? 'Update Profile' : 'Save and Continue')}
            </button>
          </div>
        </form>
         <div className="mt-6 text-sm text-center">
            <Link to="/dashboard" className="font-medium text-indigo-700 hover:text-indigo-600 hover:underline">
                &larr; Back to Dashboard
            </Link>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;