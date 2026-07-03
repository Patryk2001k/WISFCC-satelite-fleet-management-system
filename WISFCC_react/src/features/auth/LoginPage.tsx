
import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Tag, Space } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined, StarOutlined } from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from './api/loginRequest'; 
const { Title, Text } = Typography;


const THEME = {
  bgDeep: '#0A121F', 
  cyanGlow: '#00FFFF', 
  cyanDark: '#073641', 
  cyanBase: '#12EAEA', 
  panelBg: 'rgba(10, 37, 46, 0.75)', 
  textMain: '#FFFFFF',
  textSecondary: '#7AABB1', 
};


const pulseGlow = keyframes`
  0% { text-shadow: 0 0 5px ${THEME.cyanGlow}, 0 0 10px ${THEME.cyanGlow}; }
  50% { text-shadow: 0 0 10px ${THEME.cyanGlow}, 0 0 15px ${THEME.cyanGlow}; }
  100% { text-shadow: 0 0 5px ${THEME.cyanGlow}, 0 0 10px ${THEME.cyanGlow}; }
`;


const SpaceLayout = styled.div`
  background: ${THEME.bgDeep};
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  font-family: 'Roboto Mono', monospace;
  overflow: hidden;

  
  background-image: 
    radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 30px),
    radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 20px),
    radial-gradient(white, rgba(255,255,255,.1) 2px, transparent 10px);
  background-size: 550px 550px, 350px 350px, 250px 250px;
  background-position: 0 0, 40px 60px, 130px 270px;

  
  &::before {
    content: '';
    position: absolute;
    width: 200%; height: 200%;
    top: -50%; left: -50%;
    border-radius: 50%;
    border: 1px solid ${THEME.cyanDark};
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.1) inset;
    opacity: 0.3;
    pointer-events: none;
  }
`;


const HudPanel = styled.div`
  background: ${THEME.panelBg};
  backdrop-filter: blur(10px); 
  border: 2px solid ${THEME.cyanDark};
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.1);
  padding: 60px 40px 40px;
  border-radius: 12px;
  position: relative;
  text-align: center;
  width: 100%;
  max-width: 480px;

  
  &::after {
    content: '';
    position: absolute;
    top: -5px; right: -5px; bottom: -5px; left: -5px;
    border-radius: 17px;
    border: 2px solid transparent;
    border-top-color: rgba(0, 255, 255, 0.2);
    border-left-color: rgba(0, 255, 255, 0.2);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.05);
    pointer-events: none; 
  }
`;


const HudTitle = styled(Title)`
  color: ${THEME.textMain} !important;
  text-transform: uppercase;
  font-weight: 700;
  margin: 0 !important;
  animation: ${pulseGlow} 2.5s infinite ease-in-out;
`;

const HudText = styled(Text)`
  color: ${THEME.textSecondary} !important;
  font-size: 13px;
  text-transform: uppercase;
  margin-top: 5px;
  display: block;
`;


const HudInput = styled(Input)`
  background: rgba(10, 37, 46, 0.6) !important;
  border: 1px solid ${THEME.cyanDark} !important;
  border-radius: 6px;

  .ant-input {
    background: transparent !important;
    color: ${THEME.textMain} !important;
   

    &::placeholder {
      color: rgba(255, 255, 255, 0.5) !important;
      text-transform: uppercase;
    }
  }

  .ant-input-prefix {
    color: ${THEME.cyanGlow};
    opacity: 0.6;
  }

  &:focus, &.ant-input-focused, &.ant-input-affix-wrapper-focused {
    border-color: ${THEME.cyanGlow} !important;
    box-shadow: 0 0 5px ${THEME.cyanGlow} !important;
  }
`;

const HudPasswordInput = styled(Input.Password)`
  background: rgba(10, 37, 46, 0.6) !important;
  border: 1px solid ${THEME.cyanDark} !important;
  border-radius: 6px;

  .ant-input {
    background: transparent !important;
    color: ${THEME.textMain} !important;
   

    &::placeholder {
      color: rgba(255, 255, 255, 0.5) !important;
      text-transform: uppercase;
    }
  }

  .ant-input-prefix, .ant-input-password-icon {
    color: ${THEME.cyanGlow};
    opacity: 0.6;
  }

  &:focus, &.ant-input-focused, &.ant-input-affix-wrapper-focused {
    border-color: ${THEME.cyanGlow} !important;
    box-shadow: 0 0 5px ${THEME.cyanGlow} !important;
  }
`;


const HudButton = styled(Button)`
  background-color: ${THEME.cyanGlow} !important;
  border-color: ${THEME.cyanGlow} !important;
  color: ${THEME.bgDeep} !important;
  font-weight: 700;
  text-transform: uppercase;
  height: 48px;
  border-radius: 8px;
  width: 100%;
  box-shadow: 0 0 20px ${THEME.cyanGlow};
  transition: all 0.3s ease;

  &:hover {
    background-color: ${THEME.cyanBase} !important;
    border-color: ${THEME.cyanBase} !important;
    box-shadow: 0 0 30px ${THEME.cyanGlow};
  }
`;



const HudLink = styled.a`
  color: ${THEME.cyanGlow};
  font-size: 13px;
  text-transform: uppercase;
  opacity: 0.8;
  transition: all 0.3s ease;

  &:hover {
    color: ${THEME.textMain};
    opacity: 1;
    text-shadow: 0 0 5px ${THEME.cyanGlow};
  }
`;


const HudHudDetail = styled.div`
  position: absolute;
  color: ${THEME.cyanDark};
  font-size: 10px;
  text-transform: uppercase;
`;



const ComplexHudLogo = () => (
  <div style={{ marginBottom: '40px', position: 'relative', display: 'inline-block' }}>
    <div style={{ 
      width: '130px', height: '130px', 
      border: `2px solid ${THEME.cyanGlow}`, 
      borderRadius: '50%', 
      display: 'flex', justifyContent: 'center', alignItems: 'center', 
      boxShadow: `0 0 25px rgba(0, 255, 255, 0.4) inset, 0 0 15px ${THEME.cyanGlow}`,
      margin: '0 auto'
    }}>
      <GlobalOutlined style={{ fontSize: '70px', color: THEME.cyanGlow }} />
      <div style={{ position: 'absolute', color: THEME.cyanGlow, fontWeight: 700 }}>N</div>
    </div>
    <div style={{ position: 'absolute', top: '-10px', right: '-10px', color: THEME.cyanGlow, fontSize: '20px' }}>🛰️</div>
    <div style={{ position: 'absolute', top: '-10px', left: '-10px', color: THEME.cyanGlow, fontSize: '20px' }}>🛰️</div>
  </div>
);


const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

const onFinish = async (values: any) => {
    setLoading(true);
    message.loading({ content: 'CONNECTING TO WISFCC DATABASE...', key: 'login_load' });
    
    const sanitizedValues = {
      username: values.username.trim(),
      password: values.password.trim(),
    };

    try {
      
      const response = await loginRequest(sanitizedValues);

      
      message.success({ content: response.message.toUpperCase(), key: 'login_load' }, 2);
      console.log(response)
      console.log(response.role)
      
      localStorage.setItem('wisfcc_token', response.token);
      localStorage.setItem('wisfcc_role', response.role); 

      console.log(response.token)
      
      navigate('/dashboard');

    } catch (error: any) {
      
      console.error("Błąd logowania:", error);
      message.error({ content: 'ACCESS DENIED. INVALID CREDENTIALS.', key: 'login_load' }, 2.5);
    } finally {
      
      setLoading(false);
    }
  };

  React.useEffect(() => {
  const token = localStorage.getItem('wisfcc_token');
  
  if (token) {
    navigate('/dashboard', { replace: true });
  }
  }, [navigate]);

  return (
    <SpaceLayout>
        
        <HudPanel style={{ zIndex: 10 }}>
          <ComplexHudLogo />

          <Space direction="vertical" size={0} style={{ width: '100%', marginBottom: '40px' }}>
            <HudTitle level={2}>WISFCC</HudTitle>
            <HudText>WISFCC PORTAL ACCESS</HudText>
          </Space>

          <Form
            name="wisfcc_login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: 'OPERATOR ID REQUIRED.' },
                { whitespace: true, message: 'ID CANNOT CONSIST OF SPACES ONLY.' },
                { min: 4, message: 'ID MUST CONTAIN AT LEAST 4 CHARACTERS.' },
                { max: 20, message: 'ID IS TOO LONG (MAX 20 CHARACTERS).' },
                { pattern: /^[a-zA-Z0-9_.-]+$/, message: 'FORBIDDEN SPECIAL CHARACTERS DETECTED.' }
              ]}
              validateTrigger="onBlur"
            >
              <HudInput 
                prefix={<UserOutlined />} 
                placeholder="OPERATOR USERNAME" 
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'PASSWORD KEY REQUIRED.' },
                { min: 6, message: 'PASSWORD MUST CONTAIN AT LEAST 6 CHARACTERS.' },
              ]}
              validateTrigger="onBlur"
            >
              <HudPasswordInput 
                prefix={<LockOutlined />} 
                placeholder="PASSWORD KEY"
              />
            </Form.Item>

            <HudButton type="primary" htmlType="submit" loading={loading}>
              {loading ? 'INITIATING...' : 'AUTHENTICATE'}
            </HudButton>
            
          </Form>
        </HudPanel>
    </SpaceLayout>
  );
};

export default LoginPage;