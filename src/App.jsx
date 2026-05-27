import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import StudentDashboard from './pages/StudentDashboard';
import TutorDashboard from './pages/TutorDashboard';
import CallPage from './pages/CallPage';
import { RoleProvider } from './context/RoleContext';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => (
    <RoleProvider>
        <Router>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                
                <Route 
                    path="/student" 
                    element={
                        <ProtectedRoute allowedRole="student">
                            <StudentDashboard />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/tutor" 
                    element={
                        <ProtectedRoute allowedRole="tutor">
                            <TutorDashboard />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/call/:sessionId" 
                    element={
                        <ProtectedRoute>
                            <CallPage />
                        </ProtectedRoute>
                    } 
                />
            </Routes>
        </Router>
    </RoleProvider>
);

export default App;