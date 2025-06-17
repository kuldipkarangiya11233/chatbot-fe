import React from 'react';
import './App.css'; // We will create this for basic styling and Tailwind setup
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';

// Placeholder components - we will create these later
const NotFoundPage = () => <div className="p-4">404 - Page Not Found</div>;


function App() {
  return (
    <Router>
      <div className="App font-sans">
        {/* Header/Navbar could go here if needed globally */}
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} /> 
          <Route path="/profile" element={<ProfilePage />} />
          {/* Default route could be login or a landing page */}
          <Route path="/" element={<LoginPage />} /> 
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        {/* Footer could go here */}
      </div>
    </Router>
  );
}

export default App;