import React, { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Redirect to login page
    window.location.href = '/login';
  }, []);
  
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#111827'
        }}>
          MeriTY Credits Manager
        </h1>
        <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Redirecting to login...</p>
      </div>
    </div>
  );
}