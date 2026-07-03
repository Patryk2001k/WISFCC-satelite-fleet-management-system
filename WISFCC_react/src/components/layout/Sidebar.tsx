
import React, { useState } from 'react';
import { Layout, Menu, Modal, Space, Button } from 'antd';
import {
  DashboardOutlined, RocketOutlined, GlobalOutlined,
  CalendarOutlined, WarningOutlined, LineChartOutlined,
  TeamOutlined, SettingOutlined, LogoutOutlined, ExclamationCircleFilled
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { useNavigate, useLocation } from 'react-router-dom';
import { THEME } from '../../styles/theme';

const { Sider } = Layout;


const StyledSider = styled(Sider)`
  background: ${THEME.bgDeep} !important;
  border-right: 1px solid ${THEME.cyanDark};
  display: flex;
  flex-direction: column;

  .ant-menu { background: transparent; border-right: none; }
  .ant-menu-item { color: ${THEME.textSecondary}; margin-top: 8px; }
  .ant-menu-item:hover { color: ${THEME.textMain} !important; background: rgba(0, 255, 255, 0.05) !important; }
  .ant-menu-item-selected {
    background: rgba(0, 255, 255, 0.1) !important;
    color: ${THEME.cyanGlow} !important;
    border-right: 3px solid ${THEME.cyanGlow};
    font-weight: bold;
  }
  .logout-item {
    margin-top: auto; color: ${THEME.danger} !important;
    &:hover { background: rgba(255, 77, 79, 0.1) !important; }
  }
`;

const LogoContainer = styled.div`
  height: 64px; display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700; color: ${THEME.cyanGlow};
  border-bottom: 1px solid ${THEME.cyanDark}; letter-spacing: 1px;
`;


const ModalButton = styled(Button)<{ dangerbtn?: boolean }>`
  background: ${props => props.dangerbtn ? 'rgba(255, 77, 79, 0.1)' : 'transparent'} !important;
  border-color: ${props => props.dangerbtn ? THEME.danger : THEME.cyanDark} !important;
  color: ${props => props.dangerbtn ? THEME.danger : 'white'} !important;
  font-weight: bold;
  letter-spacing: 1px;
  
  &:hover {
    border-color: ${props => props.dangerbtn ? '#ff7875' : THEME.cyanGlow} !important;
    color: ${props => props.dangerbtn ? '#ff7875' : THEME.cyanGlow} !important;
    box-shadow: 0 0 10px ${props => props.dangerbtn ? 'rgba(255, 77, 79, 0.2)' : 'rgba(0, 255, 255, 0.2)'};
  }
`;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  
  const userRole = localStorage.getItem('wisfcc_role');

  const executeLogout = () => {
    setIsLogoutModalVisible(false);
    queryClient.clear();
    localStorage.removeItem('wisfcc_token');
    localStorage.removeItem('wisfcc_role'); 
    navigate('/login');
  };

  return (
    <StyledSider width={260}>
      <LogoContainer>
        <GlobalOutlined style={{ marginRight: 10, fontSize: 24 }} /> WISFCC
      </LogoContainer>
      
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 64px)' }}>
        <Menu mode="inline" selectedKeys={[location.pathname]} style={{ flex: 1 }}>
  {/* Dashboard jest dostępny dla każdego (ADMIN, OPERATOR, GUEST) */}
  <Menu.Item key="/dashboard" icon={<DashboardOutlined />} onClick={() => navigate('/dashboard')}>
    Dashboard
  </Menu.Item>

  {/* Poniższe zakładki operacyjne pokazujemy tylko dla ADMINA i OPERATORA (ukryte dla GUEST) */}
  {userRole !== 'GUEST' && (
    <>
      <Menu.Item key="/dashboard/crud" icon={<RocketOutlined />} onClick={() => navigate('/dashboard/crud')}>
        Satellite Fleet CRUD
      </Menu.Item>
      <Menu.Item key="/dashboard/scheduler" icon={<CalendarOutlined />} onClick={() => navigate('/dashboard/scheduler')}>
        Mission Job Scheduler
      </Menu.Item>
      <Menu.Item key="/dashboard/cas" icon={<WarningOutlined />} onClick={() => navigate('/dashboard/cas')}>
        Collision CAS
      </Menu.Item>
      <Menu.Item key="/dashboard/reports" icon={<LineChartOutlined />} onClick={() => navigate('/dashboard/reports')}>
        Reports & Analytics
      </Menu.Item>
    </>
      )}

      {/* Zakładka zarządzania personelem - dostępna tylko dla ADMINA */}
      {userRole === 'ADMIN' && (
        <Menu.Item key="/dashboard/users" icon={<TeamOutlined />} onClick={() => navigate('/dashboard/users')}>
          Users Management
        </Menu.Item>
      )}

      <Menu.Item key="/dashboard/settings" icon={<SettingOutlined />} onClick={() => navigate('/dashboard/settings')}>
         Settings
      </Menu.Item>
    </Menu>

        <Menu mode="inline" selectable={false}>
          <Menu.Item key="logout" icon={<LogoutOutlined />} className="logout-item" onClick={() => setIsLogoutModalVisible(true)}>
            Logout
          </Menu.Item>
        </Menu>
      </div>

      <Modal
        open={isLogoutModalVisible}
        onCancel={() => setIsLogoutModalVisible(false)}
        footer={null}
        closable={false}
        width={420}
        centered
        styles={{
          content: {
            backgroundColor: THEME.bgDeep,
            border: `1px solid ${THEME.cyanGlow}`,
            boxShadow: `0 0 30px rgba(0, 255, 255, 0.15)`,
            borderRadius: '8px',
            padding: '24px'
          }
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <ExclamationCircleFilled style={{ color: THEME.warning, fontSize: '24px', marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: THEME.cyanGlow, fontWeight: 'bold', fontSize: '16px', letterSpacing: '1px', marginBottom: '12px' }}>
              LOGOUT CONFIRMATION
            </div>
            <div style={{ color: 'white', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
              ARE YOU SURE YOU WANT TO END THE WISFCC OPERATOR SESSION?
            </div>
          </div>
        </div>
        
        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ModalButton onClick={() => setIsLogoutModalVisible(false)}>
            CANCEL
          </ModalButton>
          <ModalButton dangerbtn onClick={executeLogout}>
            LOGOUT
          </ModalButton>
        </Space>
      </Modal>

    </StyledSider>
  );
};