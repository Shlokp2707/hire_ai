import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import AIAssistant from './components/AIAssistant';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Home from './pages/Home';
import Apply from './pages/Apply';
import ApplicationResult from './pages/ApplicationResult';
import Interview from './pages/Interview';
import HrDashboard from './pages/HrDashboard';
import PracticeSetup from './pages/PracticeSetup';
import AtsScorer from './pages/AtsScorer';
import APIKeySettings from './pages/APIKeySettings';
import './App.css';


export const AuthContext = React.createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check auth state on load
  useEffect(() => {
    fetch('/api/auth/me/')
      .then(async (res) => {
        const text = await res.text();
        return text ? JSON.parse(text) : {};
      })
      .then(data => {
        if (data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const loginUser = (userData) => {
    setUser(userData);
  };

  const logoutUser = () => {
    fetch('/api/auth/logout/', { method: 'POST' })
      .then(() => setUser(null))
      .catch(err => console.error("Logout failed:", err));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <div className="pulse-spinner">AI</div>
      </div>
    );
  }

  // Protected Route wrappers
  const ProtectedRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    return children;
  };

  const RecruiterRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (!user.is_recruiter) return <Navigate to="/" replace />;
    return children;
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser }}>
      <Router>
        <Routes>
          {/* Main layout routes: Navbar stays separate from page content wrapper */}
          <Route path="/" element={<><Navbar /><div className="app-page-content"><LandingPage /></div></>} />
          <Route path="/login" element={<><Navbar /><div className="app-page-content"><Login /></div></>} />
          <Route path="/register" element={<><Navbar /><div className="app-page-content"><Register /></div></>} />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <><Navbar /><div className="app-page-content"><Profile /></div></>
            </ProtectedRoute>
          } />
          <Route path="/settings/api-keys" element={
            <ProtectedRoute>
              <><Navbar /><div className="app-page-content"><APIKeySettings /></div></>
            </ProtectedRoute>
          } />
          <Route path="/jobs" element={

            <ProtectedRoute>
              <><Navbar /><div className="app-page-content"><Home /></div></>
            </ProtectedRoute>
          } />
          <Route path="/practice" element={
            <ProtectedRoute>
              <><Navbar /><div className="app-page-content"><PracticeSetup /></div></>
            </ProtectedRoute>
          } />
          <Route path="/ats-scorer" element={
            <ProtectedRoute>
              <><Navbar /><div className="app-page-content"><AtsScorer /></div></>
            </ProtectedRoute>
          } />
          <Route path="/apply/:jobId" element={
            <ProtectedRoute>
              <><Navbar /><div className="app-page-content"><Apply /></div></>
            </ProtectedRoute>
          } />
          <Route path="/result/:applicationId" element={
            <ProtectedRoute>
              <><Navbar /><div className="app-page-content"><ApplicationResult /></div></>
            </ProtectedRoute>
          } />
          
          <Route path="/hr" element={
            <RecruiterRoute>
              <><Navbar /><div className="app-page-content"><HrDashboard /></div></>
            </RecruiterRoute>
          } />

          {/* Immersive interview layout - NO global navbar to prevent navigation alerts */}
          <Route path="/interview/:applicationId" element={
            <ProtectedRoute>
              <Interview />
            </ProtectedRoute>
          } />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {user && <AIAssistant />}
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
