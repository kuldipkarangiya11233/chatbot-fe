import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const AddFamilyMemberModal = ({ isOpen, onClose, onMemberAdded }) => {
  const { addFamilyMember } = useAuth();
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState(''); // For UI, not directly in User model yet
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        return;
    }

    setLoading(true);
    try {
      // Relationship is not part of the core user model for the new member,
      // but could be stored elsewhere or used for context.
      const memberData = { name, email, password, confirmPassword, relationship };
      const result = await addFamilyMember(memberData);
      setMessage(result.message || 'Family member added successfully!');
      // Clear form
      setName('');
      setRelationship('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      if (onMemberAdded) onMemberAdded(result); // Callback for parent component
      setTimeout(() => {
        setMessage(''); // Clear success message
        // onClose(); // Optionally close modal on success after a delay
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to add family member.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative mx-auto p-8 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-gray-800">Add New Family Member</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
          {message && <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm">{message}</div>}

          <div>
            <label htmlFor="memberName" className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" id="memberName" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="memberRelationship" className="block text-sm font-medium text-gray-700">Relationship (e.g., Son, Mother)</label>
            <input type="text" id="memberRelationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700">Email Address</label>
            <input type="email" id="memberEmail" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="memberPassword" className="block text-sm font-medium text-gray-700">Password (min. 6 characters)</label>
            <input type="password" id="memberPassword" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="memberConfirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input type="password" id="memberConfirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400">
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFamilyMemberModal;