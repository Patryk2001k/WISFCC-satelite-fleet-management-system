
import React, { useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

export const SessionWatcher = () => {
  useEffect(() => {
    const token = localStorage.getItem('wisfcc_token');
    
    if (!token) return; 

    try {
      
      const decoded = jwtDecode(token);
      
      
      if (decoded.exp) {
        const expirationTime = decoded.exp * 1000;
        const currentTime = Date.now();
        const timeLeft = expirationTime - currentTime;

        if (timeLeft <= 0) {
          
          localStorage.removeItem('wisfcc_token');
          window.location.href = '/login';
        } else {
          
          
          const timer = setTimeout(() => {
            console.log("Czas sesji minął. Wylogowywanie automatyczne...");
            localStorage.removeItem('wisfcc_token');
            window.location.href = '/login';
          }, timeLeft);

          
          return () => clearTimeout(timer);
        }
      }
    } catch (error) {
      console.error("Błąd dekodowania tokena", error);
      
      localStorage.removeItem('wisfcc_token');
      window.location.href = '/login';
    }
  }, []);

  
  return null; 
};