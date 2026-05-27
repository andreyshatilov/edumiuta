import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';

const ProtectedRoute = ({ children, allowedRole }) => {
    const { isSignedIn, role } = useRole();

    // If user is not logged in, redirect them to the landing page
    if (!isSignedIn) {
        return <Navigate to="/" replace />;
    }

    // If user is logged in but doesn't have the correct role for this route,
    // redirect them to their appropriate dashboard
    if (allowedRole && role !== allowedRole) {
        if (role === 'tutor') {
            return <Navigate to="/tutor" replace />;
        } else if (role === 'student') {
            return <Navigate to="/student" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
