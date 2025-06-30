import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Simple Logo component (can be shared or moved to a components folder)
const AppLogo = () => (
  <div className="mx-auto h-12 w-auto text-center">
    <span className="text-2xl font-extrabold text-indigo-400 tracking-tight">ChatWithFamily</span>
  </div>
);

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Stepper state
  const [step, setStep] = useState(1);

  // Patient state
  const [patientFullName, setPatientFullName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [patientConfirmPassword, setPatientConfirmPassword] = useState('');
  const [patientMobileNumber, setPatientMobileNumber] = useState('');
  const [patientHealthStage, setPatientHealthStage] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientNote, setPatientNote] = useState('');

  // Family member state
  const [familyFullName, setFamilyFullName] = useState('');
  const [familyEmail, setFamilyEmail] = useState('');
  const [familyPassword, setFamilyPassword] = useState('');
  const [familyConfirmPassword, setFamilyConfirmPassword] = useState('');
  const [familyMobileNumber, setFamilyMobileNumber] = useState('');
  const [familyRelation, setFamilyRelation] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Validation for each step
  const validatePatientStep = () => {
    if (!patientFullName || !patientEmail || !patientPassword || !patientConfirmPassword || !patientMobileNumber || !patientHealthStage || !patientAge || !patientNote) {
      setError('Please fill in all patient fields.');
      return false;
    }
    if (patientPassword !== patientConfirmPassword) {
      setError('Patient passwords do not match.');
      return false;
    }
    setError('');
    return true;
  };

  const validateFamilyStep = () => {
    if (!familyFullName || !familyEmail || !familyPassword || !familyConfirmPassword || !familyMobileNumber || !familyRelation) {
      setError('Please fill in all family member fields.');
      return false;
    }
    if (familyPassword !== familyConfirmPassword) {
      setError('Family member passwords do not match.');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validatePatientStep()) {
      setStep(2);
    }
  };

  const handleBack = (e) => {
    e.preventDefault();
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!validateFamilyStep() || !validatePatientStep()) return;
    setLoading(true);
    try {
      const data = await register({
        patientEmail,
        patientPassword,
        patientConfirmPassword,
        patientFullName,
        patientMobileNumber,
        patientHealthStage,
        patientAge,
        patientNote,
        familyFullName,
        familyEmail,
        familyPassword,
        familyConfirmPassword,
        familyMobileNumber,
        familyRelation
      });
      setMessage(data.message || 'Registration successful! Please log in.');
      setTimeout(() => {
        navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
      }, 2000);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  // Stepper indicator
  const Stepper = () => (
    <div className="flex justify-center items-center mb-4">
      <div className={`flex items-center ${step === 1 ? 'font-bold text-indigo-600' : 'text-gray-400'}`}>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${step === 1 ? 'border-indigo-600 bg-indigo-100' : 'border-gray-300 bg-white'}`}>1</div>
        <span className="ml-2">Patient Details</span>
      </div>
      <div className="w-10 h-0.5 bg-indigo-300 mx-2" />
      <div className={`flex items-center ${step === 2 ? 'font-bold text-indigo-600' : 'text-gray-400'}`}>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${step === 2 ? 'border-indigo-600 bg-indigo-100' : 'border-gray-300 bg-white'}`}>2</div>
        <span className="ml-2">Family Member Details</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 py-4 px-2 sm:px-4 lg:px-8">
      <div className="max-w-2xl w-full bg-white p-4 sm:p-6 rounded-2xl shadow-2xl">
        <AppLogo />
        <div>
          <h2 className="mt-2 text-center text-2xl font-bold text-gray-900">
            Create Your Account
          </h2>
          <p className="mt-1 text-center text-sm text-gray-600">
            Join your family circle today!
          </p>
        </div>
        <Stepper />
        <form className="mt-4" onSubmit={step === 1 ? handleNext : handleSubmit}>
          {error && <div className="p-2 mb-2 bg-red-100 text-red-700 rounded-lg text-sm text-center">{error}</div>}
          {message && <div className="p-2 mb-2 bg-green-100 text-green-700 rounded-lg text-sm text-center">{message}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Details Step */}
            {step === 1 && (
              <div className="space-y-2 border border-indigo-100 rounded-xl p-4 bg-indigo-50 md:col-span-2">
                <h3 className="text-lg font-semibold text-indigo-700 mb-2 text-center">Patient Details</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" className="block w-full px-3 py-2 border rounded-md text-sm" value={patientFullName} onChange={e => setPatientFullName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" className="block w-full px-3 py-2 border rounded-md text-sm" value={patientEmail} onChange={e => setPatientEmail(e.target.value)} required />
                </div>
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" className="block w-full px-3 py-2 border rounded-md text-sm" value={patientPassword} onChange={e => setPatientPassword(e.target.value)} required />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Confirm</label>
                    <input type="password" className="block w-full px-3 py-2 border rounded-md text-sm" value={patientConfirmPassword} onChange={e => setPatientConfirmPassword(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number</label>
                  <input type="text" className="block w-full px-3 py-2 border rounded-md text-sm" value={patientMobileNumber} onChange={e => setPatientMobileNumber(e.target.value)} required />
                </div>
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Health Stage</label>
                    <select className="block w-full px-3 py-2 border rounded-md text-sm" value={patientHealthStage} onChange={e => setPatientHealthStage(e.target.value)} required>
                      <option value="">Select</option>
                      <option value="critical">Critical</option>
                      <option value="serious">Serious</option>
                      <option value="stable">Stable</option>
                      <option value="normal">Normal</option>
                      <option value="good">Good</option>
                      <option value="excellent">Excellent</option>
                    </select>
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
                    <input type="number" className="block w-full px-3 py-2 border rounded-md text-sm" value={patientAge} onChange={e => setPatientAge(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
                  <textarea className="block w-full px-3 py-2 border rounded-md text-sm resize-none" value={patientNote} onChange={e => setPatientNote(e.target.value)} required />
                </div>
              </div>
            )}

            {/* Family Member Details Step */}
            {step === 2 && (
              <div className="space-y-2 border border-indigo-100 rounded-xl p-4 bg-indigo-50 md:col-span-2">
                <h3 className="text-lg font-semibold text-indigo-700 mb-2 text-center">Family Member Details</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" className="block w-full px-3 py-2 border rounded-md text-sm" value={familyFullName} onChange={e => setFamilyFullName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" className="block w-full px-3 py-2 border rounded-md text-sm" value={familyEmail} onChange={e => setFamilyEmail(e.target.value)} required />
                </div>
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" className="block w-full px-3 py-2 border rounded-md text-sm" value={familyPassword} onChange={e => setFamilyPassword(e.target.value)} required />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Confirm</label>
                    <input type="password" className="block w-full px-3 py-2 border rounded-md text-sm" value={familyConfirmPassword} onChange={e => setFamilyConfirmPassword(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number</label>
                  <input type="text" className="block w-full px-3 py-2 border rounded-md text-sm" value={familyMobileNumber} onChange={e => setFamilyMobileNumber(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Relationship to Patient</label>
                  <select
                    className="block w-full px-3 py-2 border rounded-md text-sm"
                    value={familyRelation}
                    onChange={e => setFamilyRelation(e.target.value)}
                    required
                  >
                    <option value="">Select relation</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Grandchild">Grandchild</option>
                    <option value="Aunt/Uncle">Aunt/Uncle</option>
                    <option value="Niece/Nephew">Niece/Nephew</option>
                    <option value="Cousin">Cousin</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col md:flex-row gap-4">
            {step === 2 && (
              <button
                type="button"
                onClick={handleBack}
                className="w-full md:w-auto flex-1 py-3 px-4 border border-transparent text-base font-medium rounded-lg text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150 shadow-md hover:shadow-lg"
              >
                Back
              </button>
            )}
            {step === 1 && (
              <button
                type="submit"
                className="w-full md:w-auto flex-1 py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150 shadow-md hover:shadow-lg"
              >
                Next
              </button>
            )}
            {step === 2 && (
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto flex-1 py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors duration-150 shadow-md hover:shadow-lg"
              >
                {loading ? 'Registering...' : 'Create Account'}
              </button>
            )}
          </div>
        </form>
        <div className="mt-4 text-sm text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline">
              Log in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;