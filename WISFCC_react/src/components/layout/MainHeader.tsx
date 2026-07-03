
import React from 'react';
import { Layout, Typography, Badge, Space, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { THEME } from '../../styles/theme';
import { useUserProfile } from '../../services/settingsRequest';
import { useSpaceObjectsFleetCache } from '../../services/spaceObjectsRequest';

const { Header } = Layout;
const { Text } = Typography;


const StyledHeader = styled(Header)`
  background: ${THEME.bgDeep} !important;
  border-bottom: 1px solid ${THEME.cyanDark};
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 24px; height: 64px; color: ${THEME.textMain};
`;

const HeaderStats = styled.div`
  display: flex; align-items: center; gap: 24px; border-left: 1px solid ${THEME.cyanDark}; padding-left: 24px;
`;

export const MainHeader = () => {
  
  const { data: profile, isLoading: isProfileLoading } = useUserProfile();
  
  
  const { data: fleet, isLoading: isFleetLoading } = useSpaceObjectsFleetCache();

  
  
  const activeSatellites = fleet?.filter(sat => 
    sat.status === 'ONLINE' || sat.status === 'MANEUVERING'
  ).length || 0;

  
  const dangerSatellites = fleet?.filter(sat => 
    sat.status === 'OFFLINE' || sat.status === 'DECAYED' || sat.batteryLevel <= 20
  ).length || 0;

  return (
    <StyledHeader>
      <Text style={{ color: THEME.textMain, fontWeight: 'bold' }}>WISFCC SYSTEM CONTROL</Text>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        
        <Space style={{ borderLeft: `1px solid ${THEME.cyanDark}`, paddingLeft: 24 }}>
          <UserOutlined style={{ color: THEME.cyanGlow }} /> 
          <Text style={{ color: 'white', fontWeight: 'bold', letterSpacing: '1px' }}>
            {isProfileLoading ? 'LOADING...' : (profile?.username || 'UNKNOWN_OP')}
          </Text>
        </Space>

        <HeaderStats>
          <Badge 
            status="success" 
            text={
              <Text style={{ color: THEME.success }}>
                {isFleetLoading ? <Spin size="small" /> : `${activeSatellites} Online`}
              </Text>
            } 
          />
          <Badge 
            status="error" 
            text={
              <Text style={{ color: THEME.danger }}>
                {isFleetLoading ? <Spin size="small" /> : `${dangerSatellites} Danger`}
              </Text>
            } 
          />
        </HeaderStats>
      </div>
    </StyledHeader>
  );
};