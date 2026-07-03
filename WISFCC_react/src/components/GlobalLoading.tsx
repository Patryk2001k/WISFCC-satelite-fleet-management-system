
import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Typography } from 'antd';

const { Text } = Typography;



const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;


const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.4); opacity: 0.3; }
`;




const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
 
  background: rgba(10, 18, 31, 0.9); 
 
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px); 
  
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
`;

const SpinnerContainer = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  margin-bottom: 24px;
`;


const Orbit = styled.div<{ delay: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  animation: ${spin} 2s infinite cubic-bezier(0.53, 0.21, 0.29, 0.67);
  animation-delay: ${(props) => props.delay}s;
`;


const Dot = styled.div<{ delay: number }>`
  width: 8px;
  height: 8px;
  background-color: #00FFFF;
  border-radius: 50%;
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 0 10px #00FFFF;
  animation: ${pulse} 2s infinite ease-in-out;
  animation-delay: ${(props) => props.delay}s;
`;

const LoadingText = styled(Text)`
  color: #00FFFF !important;
  font-family: 'Roboto Mono', monospace;
  font-size: 16px;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
`;



const GlobalLoading: React.FC = () => {
  
  const messages = [
  'Establishing secure connection...',
  'Retrieving fleet telemetry...',
  'Verifying orbital parameters...',
  'Decoding signal stream...',
  'Synchronizing WISFCC systems...'
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 1500);

    
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <Overlay>
      <SpinnerContainer>
      
        {[0, 0.15, 0.3, 0.45, 0.6].map((delay, i) => (
          <Orbit key={i} delay={delay}>
            <Dot delay={delay} />
          </Orbit>
        ))}
      </SpinnerContainer>
      
      <LoadingText>
        {messages[messageIndex]}
      </LoadingText>
    </Overlay>
  );
};

export default GlobalLoading;