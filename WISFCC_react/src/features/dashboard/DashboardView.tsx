
import React from 'react';
import { Card, Typography, Row, Col, Space, Spin } from 'antd';
import { WarningOutlined, SafetyOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import CesiumMap from '../map/CesiumMap';
import { THEME } from '../../styles/theme';
import { useSpaceObjectsFleetCache } from '../../services/spaceObjectsRequest';
import { useCasAlertsCache } from '../../services/casRequest';

const { Text } = Typography;

const FullHeightRow = styled(Row)`height: 100%; margin: 0 !important; width: 100%;`;
const FlexColumn = styled(Col)`display: flex; flex-direction: column; gap: 16px; height: 100%;`;

const HudCard = styled(Card)`
  background: ${THEME.panelBg}; border: 1px solid ${THEME.cyanDark};
  border-radius: 8px; backdrop-filter: blur(10px); display: flex; flex-direction: column;
  .ant-card-head { border-bottom: 1px solid ${THEME.cyanDark}; min-height: 36px; }
  .ant-card-head-title { color: ${THEME.textMain}; font-size: 13px; text-transform: uppercase; font-weight: bold; padding: 10px 0; }
  .ant-card-body { padding: 12px; color: ${THEME.textMain}; flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
`;

const StatBox = styled.div<{ color?: string }>`
  text-align: center; padding: 8px; border: 1px solid ${THEME.cyanDark};
  border-radius: 6px; background: rgba(0, 0, 0, 0.2);
  .value { font-size: 20px; font-weight: bold; color: ${props => props.color || THEME.textMain}; }
  .label { font-size: 10px; color: ${THEME.textSecondary}; text-transform: uppercase; }
`;

const MapContainer = styled.div`
  flex: 1; width: 100%; border: 2px dashed ${THEME.cyanDark}; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: black; color: ${THEME.cyanGlow}; font-weight: bold; font-size: 18px;
  position: relative; overflow: hidden;
`;

export const DashboardView: React.FC = () => {
  
  const { data: fleet, isLoading: isFleetLoading } = useSpaceObjectsFleetCache();
  const { data: casData, isLoading: isCasLoading } = useCasAlertsCache();

  
  const totalCount = fleet?.length || 0;
  const onlineCount = fleet?.filter(s => s.status === 'ONLINE' || s.status === 'MANEUVERING').length || 0;
  const offlineCount = fleet?.filter(s => s.status === 'OFFLINE').length || 0;
  const alertsCount = casData?.alerts.length || 0;

  
  
  const lowBatterySats = fleet?.filter(sat => sat.batteryLevel <= 60) || [];
  
  
  const criticalSats = [...lowBatterySats]
    .sort((a, b) => (a.batteryLevel || 0) - (b.batteryLevel || 0))
    .slice(0, 4);

  
  const mostCriticalAlert = [...(casData?.alerts || [])].sort((a, b) => {
    const priority = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return (priority[b.riskLevel] || 0) - (priority[a.riskLevel] || 0);
  })[0];

  return (
    <FullHeightRow gutter={16}>
      <FlexColumn xs={24} lg={16} xl={17}>
        <HudCard title="3D Interactive Global Map" style={{ flex: 1, minHeight: 0 }} bodyStyle={{ padding: 0 }}>
          <MapContainer style={{ border: 'none' }}>
            <CesiumMap />
          </MapContainer>
        </HudCard>
      </FlexColumn>

      <FlexColumn xs={24} lg={8} xl={7}>
        
        <HudCard title="Fleet Overview" style={{ flex: 'none' }}>
          {isFleetLoading ? <Spin size="small" style={{ margin: '10px auto' }} /> : (
            <Row gutter={[8, 8]}>
              <Col span={6}><StatBox color={THEME.success}><div className="value">{onlineCount}</div><div className="label">Online</div></StatBox></Col>
              <Col span={6}><StatBox color={THEME.danger}><div className="value">{offlineCount}</div><div className="label">Offline</div></StatBox></Col>
              <Col span={6}><StatBox color={THEME.warning}><div className="value">{alertsCount}</div><div className="label">Alerts</div></StatBox></Col>
              <Col span={6}><StatBox><div className="value">{totalCount}</div><div className="label">Total</div></StatBox></Col>
            </Row>
          )}
        </HudCard>

        <HudCard title="Critical Telemetry Alerts" style={{ flex: 1, minHeight: 0 }}> 
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}> 
            {isFleetLoading ? (
              <Spin style={{ margin: 'auto', display: 'block' }} />
            ) : criticalSats.length > 0 ? (
              
              criticalSats.map(sat => (
                <div key={sat.id} style={{ marginBottom: 12, padding: 8, border: `1px solid ${THEME.cyanDark}`, borderRadius: 6, background: 'rgba(0, 0, 0, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: THEME.cyanGlow, fontWeight: 'bold', fontSize: 12 }}>{sat.name}</Text>
                    <Space>
                      <Text style={{ color: sat.batteryLevel <= 20 ? THEME.danger : THEME.warning, fontSize: 10, fontWeight: 'bold' }}>
                        🔋 {sat.batteryLevel}%
                      </Text>
                      <Text style={{ color: THEME.textSecondary, fontSize: 10 }}>
                        📶 #{sat.catalogId}
                      </Text>
                    </Space>
                  </div>
                </div>
              ))
            ) : (
              
              <div style={{ padding: 12, background: 'rgba(82, 196, 26, 0.05)', border: `1px solid ${THEME.success}`, borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, margin: 'auto 0' }}>
                <SafetyOutlined style={{ color: THEME.success, fontSize: '16px' }} />
                <Text style={{ color: 'white', letterSpacing: '0.5px' }}>
                  ALL FLEET ENERGY LEVELS NOMINAL. POWER RESERVES WITHIN SAFE PARAMETERS (&gt;60%).
                </Text>
              </div>
            )}
          </div>
        </HudCard>

        <HudCard title="Collision Avoidance CAS" style={{ flex: 'none' }}>
          {isCasLoading ? <Spin style={{ margin: '10px auto' }} /> : 
           mostCriticalAlert ? (
            <div style={{ padding: 12, background: 'rgba(255, 77, 79, 0.08)', border: `1px solid ${THEME.danger}`, borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <WarningOutlined style={{ color: THEME.danger, fontSize: '16px', marginTop: '2px' }} />
              <div>
                <Text style={{ color: 'white', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', marginBottom: 4, fontSize: '10px' }}>
                  {mostCriticalAlert.riskLevel} CONJUNCTION RISK
                </Text>
                <Text style={{ color: THEME.textMain, fontSize: '11px', display: 'block' }}>
                  {mostCriticalAlert.ourSatelliteName} vs {mostCriticalAlert.threatName} (Prob: {mostCriticalAlert.collisionProbability}%, TCA: {mostCriticalAlert.timeOfClosestApproach.replace('T', ' ').replace('Z', '').slice(5, 16)})
                </Text>
              </div>
            </div>
          ) : (
            <div style={{ padding: 12, background: 'rgba(82, 196, 26, 0.05)', border: `1px solid ${THEME.success}`, borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SafetyOutlined style={{ color: THEME.success, fontSize: '16px' }} />
              <Text style={{ color: 'white', letterSpacing: '0.5px' }}>ORBITAL STATUS: NOMINAL. NO CONJUNCTIONS TRACKED.</Text>
            </div>
          )}
        </HudCard>

      </FlexColumn>
    </FullHeightRow>
  );
};

export default DashboardView;