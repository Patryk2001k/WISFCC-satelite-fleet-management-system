
import React from 'react';
import { Navigate } from 'react-router-dom';


interface AuthGuardProps {
  children: React.ReactNode;
}
const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {

  const isAuthenticated = localStorage.getItem('wisfcc_token') !== null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default AuthGuard;