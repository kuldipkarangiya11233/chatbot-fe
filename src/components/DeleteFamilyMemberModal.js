import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DeleteFamilyMemberModal = ({ isOpen, onClose, onMemberDeleted, member }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // const BASE_URL = 'https://chatbot-be-732a.onrender.com';
  const BASE_URL = 'http://localhost:5000';
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setError('');
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (!member?._id) return;
    
    setLoading(true);
    setError('');

    try {
      await axios.delete(`${BASE_URL}/api/users/family-member/${member._id}`);
      
      // Call the callback to update the UI
      onMemberDeleted(member._id);
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error deleting family member';
      console.error('Error deleting family member:', errorMessage, error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-auto shadow-2xl transform transition-all duration-300 ease-out scale-100">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-red-100 rounded-lg">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Delete Family Member</h2>
            <p className="text-sm text-gray-500 mt-1">This action cannot be undone</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center space-x-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Warning Message */}
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl mb-6">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="font-medium">Are you sure?</h3>
              <p className="text-sm mt-1">
                You are about to remove <strong>{member.fullName}</strong> from your family circle. 
                This will permanently delete their account and remove them from all family communications.
              </p>
            </div>
          </div>
        </div>

        {/* Member Info */}
        <div className="bg-gray-50 p-4 rounded-xl mb-6">
          <div className="flex items-center space-x-3">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName)}&background=60A5FA&color=fff&size=64&font-size=0.5&bold=true`}
              alt={member.fullName}
              className="h-12 w-12 rounded-full object-cover border-2 border-indigo-500"
            />
            <div>
              <p className="font-semibold text-gray-900">{member.fullName}</p>
              <p className="text-sm text-gray-500">{member.email}</p>
              {member.relation && (
                <p className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full inline-block mt-1">
                  {member.relation}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 font-medium disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 font-semibold disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Member</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteFamilyMemberModal; 