import React, { useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Typography, Progress, Spin } from 'antd';
import type { TableProps } from 'antd';
import { WarningOutlined, RadarChartOutlined, AlertOutlined, SafetyOutlined } from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';
import { THEME } from '../../styles/theme';
import { useCasAlertsCache } from '../../services/casRequest';
import type { CasAlertDTO } from '../../services/casRequest';

const { Text } = Typography;


const PageContainer = styled.div` height: 100%; display: flex; flex-direction: column; gap: 16px; `;

const HudCard = styled(Card)`
  background: ${THEME.panelBg}; border: 1px solid ${THEME.cyanDark}; border-radius: 8px; backdrop-filter: blur(10px); flex: 1; display: flex; flex-direction: column;
  .ant-card-head { border-bottom: 1px solid ${THEME.cyanDark}; min-height: 48px; }
  .ant-card-head-title { color: ${THEME.textMain}; text-transform: uppercase; font-weight: bold; }
  .ant-card-body { padding: 16px; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
`;

const HudButton = styled(Button)<{ primary?: boolean, danger?: boolean, warning?: boolean }>`
  background: ${props => props.primary ? 'rgba(0, 255, 255, 0.1)' : props.danger ? 'rgba(255, 77, 79, 0.1)' : props.warning ? 'rgba(250, 173, 20, 0.1)' : 'transparent'} !important;
  border-color: ${props => props.primary ? THEME.cyanGlow : props.danger ? THEME.danger : props.warning ? THEME.warning : THEME.cyanDark} !important;
  color: ${props => props.primary ? THEME.cyanGlow : props.danger ? THEME.danger : props.warning ? THEME.warning : THEME.textMain} !important;
  text-transform: uppercase; font-size: 11px; font-weight: bold;
  &:hover { border-color: ${props => props.danger ? '#ff7875' : THEME.cyanBase} !important; color: ${props => props.danger ? '#ff7875' : THEME.cyanBase} !important; box-shadow: 0 0 10px ${props => props.danger ? 'rgba(255, 77, 79, 0.2)' : 'rgba(0, 255, 255, 0.2)'}; }
`;

const TableWrapper = styled.div`
  flex: 1; overflow-y: auto;
  .ant-table { background: transparent !important; color: ${THEME.textMain}; }
  .ant-table-thead > tr > th { background: rgba(0, 255, 255, 0.05) !important; color: ${THEME.cyanGlow} !important; border-bottom: 1px solid ${THEME.cyanDark} !important; text-transform: uppercase; font-size: 12px; }
  .ant-table-tbody > tr > td { border-bottom: 1px solid rgba(7, 54, 65, 0.5) !important; }
  .ant-table-tbody > tr:hover > td { background: rgba(0, 255, 255, 0.05) !important; }
  .ant-pagination-item a { color: ${THEME.textMain} !important; }
  .ant-pagination-item-active { background: rgba(0, 255, 255, 0.1) !important; border-color: ${THEME.cyanGlow} !important; }
  .ant-pagination-item-active a { color: ${THEME.cyanGlow} !important; }
`;

const pulseRed = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4); }
  70% { box-shadow: 0 0 0 15px rgba(255, 77, 79, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0); }
`;

const pulseYellow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(250, 173, 20, 0.4); }
  70% { box-shadow: 0 0 0 15px rgba(250, 173, 20, 0); }
  100% { box-shadow: 0 0 0 0 rgba(250, 173, 20, 0); }
`;

const CriticalAlertBox = styled.div`
  background: rgba(255, 77, 79, 0.1); border: 1px solid ${THEME.danger}; border-radius: 8px; padding: 16px; display: flex; align-items: center; gap: 16px; animation: ${pulseRed} 2s infinite;
`;

const WarningAlertBox = styled.div`
  background: rgba(250, 173, 20, 0.1); border: 1px solid ${THEME.warning}; border-radius: 8px; padding: 16px; display: flex; align-items: center; gap: 16px; animation: ${pulseYellow} 2s infinite;
`;

export const CollisionCasView: React.FC = () => {
  const { data, isLoading, isError } = useCasAlertsCache();

  const [selectedEvent, setSelectedEvent] = useState<CasAlertDTO | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const alerts = data?.alerts || [];
  const stats = data?.stats || { activeTracks: 0, criticalThreats: 0 };

  
  const hasCritical = alerts.some(a => a.riskLevel === 'CRITICAL');
  const hasWarning = alerts.some(a => a.riskLevel === 'HIGH' || a.riskLevel === 'MEDIUM');

  const handleOpenAnalysis = (record: CasAlertDTO) => {
    setSelectedEvent(record);
    setIsModalVisible(true);
  };

  
  const columns: TableProps<CasAlertDTO>['columns'] = [
    { title: 'EVENT ID', dataIndex: 'alertId', key: 'alertId', render: (id: string) => <Text style={{ color: THEME.textSecondary }}>{id}</Text> },
    { title: 'OUR ASSET', dataIndex: 'ourSatelliteName', key: 'ourSatelliteName', render: (sat: string) => <Text style={{ color: 'white', fontWeight: 'bold' }}>{sat}</Text> },
    { title: 'THREAT OBJECT', dataIndex: 'threatName', key: 'threatName', render: (threat: string) => <Text style={{ color: THEME.warning }}>{threat}</Text> },
    { 
      title: 'T.C.A. (UTC)', 
      dataIndex: 'timeOfClosestApproach', 
      key: 'timeOfClosestApproach', 
      render: (tca: string) => <Text style={{ color: THEME.cyanGlow }}>{tca.replace('T', ' ').replace('Z', '')}</Text> 
    },
    { 
      title: 'MISS DISTANCE', 
      dataIndex: 'missDistanceKm', 
      key: 'missDistanceKm', 
      render: (dist: number) => (
        <Text style={{ color: dist < 0.5 ? THEME.danger : dist < 2.0 ? THEME.warning : THEME.success, fontWeight: 'bold' }}>
          {dist} km
        </Text>
      ) 
    },
    { 
      title: 'COLLISION PROBABILITY', 
      dataIndex: 'collisionProbability', 
      key: 'collisionProbability', 
      render: (prob: number) => (
        <div style={{ width: 120 }}>
          <Progress 
            percent={prob > 10 ? 100 : prob * 10} 
            showInfo={false} 
            strokeColor={prob > 5 ? THEME.danger : prob > 1 ? THEME.warning : THEME.success}
            trailColor="rgba(255,255,255,0.1)"
            size="small"
          />
          <Text style={{ fontSize: '10px', color: THEME.textSecondary }}>{prob}%</Text>
        </div>
      ) 
    },
    { 
      title: 'RISK', 
      dataIndex: 'riskLevel', 
      key: 'riskLevel', 
      render: (risk: string) => {
        let color = 'default';
        if (risk === 'CRITICAL') color = 'error';
        if (risk === 'HIGH' || risk === 'MEDIUM') color = 'warning';
        if (risk === 'LOW') color = 'success';
        return <Tag color={color}>{risk}</Tag>;
      } 
    },
    {
      title: 'ACTION',
      key: 'actions',
      render: (_: any, record: CasAlertDTO) => (
        <Space>
          <HudButton danger={record.riskLevel === 'CRITICAL'} warning={record.riskLevel === 'HIGH' || record.riskLevel === 'MEDIUM'} primary={record.riskLevel === 'LOW'} icon={<RadarChartOutlined />} onClick={() => handleOpenAnalysis(record)}>
            ANALYZE
          </HudButton>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          {isLoading ? (
             <div style={{ background: 'rgba(0, 255, 255, 0.05)', border: `1px solid ${THEME.cyanDark}`, borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
               <Spin /> <Text style={{color: THEME.cyanGlow}}>POBIERANIE DANYCH RADAROWYCH...</Text>
             </div>
          ) : isError ? (
             <div style={{ background: 'rgba(255, 77, 79, 0.1)', border: `1px solid ${THEME.danger}`, borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
               <AlertOutlined style={{ fontSize: '32px', color: THEME.danger }} />
               <Text style={{color: THEME.danger, fontWeight: 'bold'}}>BŁĄD KOMUNIKACJI Z SUBSYSTEMEM CAS</Text>
             </div>
          ) : hasCritical ? (
            <CriticalAlertBox>
              <WarningOutlined style={{ fontSize: '32px', color: THEME.danger }} />
              <div>
                <div style={{ color: THEME.danger, fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px' }}>ORBITAL EMERGENCY: CRITICAL CONJUNCTION DETECTED</div>
                <div style={{ color: 'white', fontSize: '12px' }}>EVASIVE ACTION REQUIRED FOR ONE OR MORE ORBITAL ASSETS.</div>
              </div>
            </CriticalAlertBox>
          ) : hasWarning ? (
            <WarningAlertBox>
              <WarningOutlined style={{ fontSize: '32px', color: THEME.warning }} />
              <div>
                <div style={{ color: THEME.warning, fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px' }}>ORBITAL WARNING: ACTIVE CONJUNCTIONS TRACKED</div>
                <div style={{ color: 'white', fontSize: '12px' }}>CONJUNCTIONS DETECTED IN THE SECTOR. INCREASED WORKSTATION MONITORING ADVISED.</div>
              </div>
            </WarningAlertBox>
          ) : (
            <div style={{ background: 'rgba(82, 196, 26, 0.1)', border: `1px solid ${THEME.success}`, borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <SafetyOutlined style={{ fontSize: '32px', color: THEME.success }} />
              <div>
                <div style={{ color: THEME.success, fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px' }}>ORBITAL MONITORING STATUS: NOMINAL</div>
                <div style={{ color: 'white', fontSize: '12px' }}>ALL ASSETS OPERATING WITHIN SAFE PARAMETERS.</div>
              </div>
            </div>
          )}
        </div>
        
        <HudCard style={{ flex: 'none', width: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Text style={{ color: THEME.textSecondary, fontSize: '11px' }}>ACTIVE TRACKS</Text>
            <Text style={{ color: THEME.cyanGlow, fontWeight: 'bold' }}>
              {isLoading ? '...' : stats.activeTracks.toLocaleString()}
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text style={{ color: THEME.textSecondary, fontSize: '11px' }}>DETECTED THREATS</Text>
            <Text style={{ color: THEME.warning, fontWeight: 'bold' }}>
              {isLoading ? '...' : alerts.length}
            </Text>
          </div>
        </HudCard>
      </div>

      <HudCard title="CONJUNCTION DATA MESSAGES (CDM)">
        <TableWrapper>
          <Table 
             columns={columns} 
             dataSource={alerts} 
             rowKey="alertId" 
             pagination={false} 
             loading={isLoading}
             locale={{ emptyText: <Text style={{color: THEME.success}}>NO DETECTED THREATS</Text> }}
          />
        </TableWrapper>
      </HudCard>
      <Modal
        className="hud-modal"
        title={<Text style={{ color: THEME.cyanGlow, letterSpacing: '1px' }}><AlertOutlined /> TRAJECTORY INTERSECTION ANALYSIS</Text>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        closeIcon={<Text style={{ color: THEME.danger, fontSize: '16px' }}>X</Text>}
        width={700}
        footer={[
          <HudButton key="close" primary onClick={() => setIsModalVisible(false)}>
            CLOSE ANALYSIS
          </HudButton>
        ]}
      >
        {selectedEvent && (
          <div>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
              <div style={{ flex: 1, padding: '16px', border: `1px dashed ${THEME.cyanDark}`, background: 'rgba(0,255,255,0.02)' }}>
                <div style={{ fontSize: '10px', color: THEME.textSecondary }}>TARGET ASSET</div>
                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>{selectedEvent.ourSatelliteName}</div>
                <div style={{ marginTop: '10px', fontSize: '12px', color: THEME.cyanGlow }}>SYS_ID: {selectedEvent.ourSatelliteId}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: THEME.danger }}><WarningOutlined style={{ fontSize: '24px' }}/></div>
              <div style={{ flex: 1, padding: '16px', border: `1px dashed ${THEME.danger}`, background: 'rgba(255,77,79,0.05)' }}>
                <div style={{ fontSize: '10px', color: THEME.textSecondary }}>THREAT OBJECT</div>
                <div style={{ color: THEME.danger, fontWeight: 'bold', fontSize: '16px' }}>{selectedEvent.threatName}</div>
                <div style={{ marginTop: '10px', fontSize: '12px', color: THEME.warning }}>NORAD_ID: {selectedEvent.threatCatalogId}</div>
              </div>
            </div>

            <div style={{ borderLeft: `3px solid ${THEME.warning}`, paddingLeft: '16px' }}>
              <div style={{ color: 'white', fontSize: '14px', marginBottom: '4px' }}>PREDICTED CLOSEST APPROACH: <span style={{ color: THEME.cyanGlow, fontWeight: 'bold' }}>{selectedEvent.timeOfClosestApproach.replace('T', ' ').replace('Z', '')}</span></div>
              <div style={{ color: THEME.textSecondary, fontSize: '12px' }}>RELATIVE MISS DISTANCE: <span style={{ color: selectedEvent.missDistanceKm < 0.5 ? THEME.danger : 'white' }}>{selectedEvent.missDistanceKm} km</span></div>
              <div style={{ color: THEME.textSecondary, fontSize: '12px' }}>PROBABILITY OF COLLISION (Pc): {selectedEvent.collisionProbability}%</div>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default CollisionCasView;