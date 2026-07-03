import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A121F' }}>
      <Result
        status="404"
        title={<span style={{ color: '#FFFFFF' }}>404 - Navigation Deviation</span>} 
        subTitle={<span style={{ color: '#FFFFFF' }}>Apologies, this sector of the solar system does not exist in the WISFCC navigation mesh.</span>}
        extra={<Button type="primary" onClick={() => navigate('/dashboard')}>Return to Control Center</Button>}
      />
    </div>
  );
};

export default NotFoundPage;