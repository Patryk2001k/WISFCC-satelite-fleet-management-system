
import React from 'react';
import { Layout } from 'antd';
import styled from 'styled-components';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { MainHeader } from '../components/layout/MainHeader';
import { DashboardView } from '../features/dashboard/DashboardView';
import { THEME } from '../styles/theme';

const { Content } = Layout;

const AppContainer = styled(Layout)`
  height: 100vh; overflow: hidden; 
  background-color: ${THEME.bgDeep}; font-family: 'Roboto Mono', monospace;
`;

const StyledContent = styled(Content)`
  padding: 16px 24px; 
  height: calc(100vh - 64px); 
  display: flex; 
  flex-direction: column; 
  overflow: hidden; 
`;

const DashboardPage: React.FC = () => {
  const location = useLocation();
  
  
  const isMainDashboard = location.pathname === '/dashboard' || location.pathname === '/dashboard/';

  return (
    <AppContainer>
      <Sidebar />
      <Layout style={{ background: 'transparent' }}>
        <MainHeader />
        
        <StyledContent>
          
          <div style={{ display: isMainDashboard ? 'flex' : 'none', height: '100%', width: '100%' }}>
            <DashboardView />
          </div>

          <div style={{ display: !isMainDashboard ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <Outlet />
          </div>

        </StyledContent>
      </Layout>
    </AppContainer>
  );
};

export default DashboardPage;