
import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Button, Tag, Space, Select, Form, Spin, Typography } from 'antd';
import type { TableProps } from 'antd';
import { 
  CheckCircleOutlined, BugOutlined, 
  CloudDownloadOutlined, FilterOutlined 
} from '@ant-design/icons';
import styled from 'styled-components';
import { THEME } from '../../styles/theme';
import { useSpaceObjectsFleetCache } from '../../services/spaceObjectsRequest';
import { 
  useReportsMetricsCache, 
  useAnomaliesCache, 
  useGenerateReport, 
} from '../../services/reportsRequest';
import type { 
  AnomalyRecordDTO 
} from '../../services/reportsRequest';

const { Option } = Select;
const { Text } = Typography;


const PageContainer = styled.div`
  height: 100%; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; padding-right: 8px;
`;

const HudCard = styled(Card)`
  background: ${THEME.panelBg}; border: 1px solid ${THEME.cyanDark}; border-radius: 8px; backdrop-filter: blur(10px);
  height: 100%; display: flex; flex-direction: column;
  .ant-card-head { border-bottom: 1px solid ${THEME.cyanDark}; min-height: 48px; }
  .ant-card-head-title { color: ${THEME.textMain}; text-transform: uppercase; font-weight: bold; font-size: 12px; letter-spacing: 1px;}
  .ant-card-body { padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
  
  .ant-statistic-title { color: ${THEME.textSecondary} !important; font-size: 12px; text-transform: uppercase; }
  .ant-statistic-content { color: ${THEME.cyanGlow} !important; font-family: monospace; }
`;

const HudButton = styled(Button)<{ primary?: boolean }>`
  background: ${props => props.primary ? 'rgba(0, 255, 255, 0.1)' : 'transparent'} !important;
  border-color: ${props => props.primary ? THEME.cyanGlow : THEME.cyanDark} !important;
  color: ${props => props.primary ? THEME.cyanGlow : THEME.textMain} !important;
  text-transform: uppercase; font-size: 11px; font-weight: bold;
  &:hover { border-color: ${THEME.cyanBase} !important; color: ${THEME.cyanBase} !important; box-shadow: 0 0 10px rgba(0, 255, 255, 0.2); }
`;

const TableWrapper = styled.div`
  flex: 1; overflow-x: auto;
  .ant-table { background: transparent !important; color: ${THEME.textMain}; }
  .ant-table-thead > tr > th { background: rgba(0, 255, 255, 0.05) !important; color: ${THEME.cyanGlow} !important; border-bottom: 1px solid ${THEME.cyanDark} !important; text-transform: uppercase; font-size: 12px; }
  .ant-table-tbody > tr > td { border-bottom: 1px solid rgba(7, 54, 65, 0.5) !important; }
  .ant-table-tbody > tr:hover > td { background: rgba(0, 255, 255, 0.05) !important; }
  .ant-pagination { margin-top: 16px !important; }
  .ant-pagination-item a { color: ${THEME.textMain} !important; }
  .ant-pagination-item-active { background: rgba(0, 255, 255, 0.1) !important; border-color: ${THEME.cyanGlow} !important; }
  .ant-pagination-item-active a { color: ${THEME.cyanGlow} !important; }
`;

export const ReportsView: React.FC = () => {
  const [form] = Form.useForm();
  
  
  const [anomalyFilterSat, setAnomalyFilterSat] = useState<number | null>(null);

  
  const { data: fleetData, isLoading: isFleetLoading } = useSpaceObjectsFleetCache();
  const { data: metrics, isLoading: isMetricsLoading } = useReportsMetricsCache();
  const { data: anomalies, isLoading: isAnomaliesLoading } = useAnomaliesCache(anomalyFilterSat);
  const generateMutation = useGenerateReport();

  const handleGenerateReport = (values: any) => {
    generateMutation.mutate({
      targetSatelliteId: values.targetSatelliteId === 'ALL' ? null : values.targetSatelliteId,
      reportType: values.reportType,
      format: values.format,
    });
  };

  
  const columns: TableProps<AnomalyRecordDTO>['columns'] = [
    { 
      title: 'INCIDENT ID', 
      dataIndex: 'incidentId', 
      key: 'incidentId', 
      render: (id: string) => <span style={{ color: THEME.textSecondary, fontFamily: 'monospace' }}>#{id}</span> 
    },
    { 
      title: 'TIMESTAMP (UTC)', 
      dataIndex: 'timestampUtc', 
      key: 'timestampUtc', 
      render: (date: string) => <span style={{ color: THEME.cyanGlow }}>{date.replace('T', ' ').replace('Z', '')}</span> 
    },
    { 
      title: 'AFFECTED ASSET', 
      dataIndex: 'satelliteName', 
      key: 'satelliteName', 
      render: (sat: string) => <span style={{ color: 'white', fontWeight: 'bold' }}>{sat}</span> 
    },
    { 
      title: 'ANOMALY TYPE', 
      dataIndex: 'anomalyType', 
      key: 'anomalyType', 
      render: (type: string) => <span style={{ color: THEME.textSecondary }}>{type}</span> 
    },
    { 
      title: 'SEVERITY', 
      dataIndex: 'severity', 
      key: 'severity', 
      render: (sev: string) => (
        <Tag color={sev === 'CRITICAL' ? 'error' : sev === 'WARNING' ? 'warning' : 'processing'}>
          {sev}
        </Tag>
      ) 
    },
    { 
      title: 'STATUS', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status: string) => (
        <span style={{ color: status === 'RESOLVED' ? THEME.success : THEME.warning, fontWeight: 'bold' }}>
          {status === 'RESOLVED' ? '✓ RESOLVED' : '⚠ INVESTIGATING'}
        </span>
      ) 
    },
  ];

  return (
    <PageContainer>
      <Row gutter={[16, 16]}>

        <Col span={12}>
          <HudCard title="MISSION SUCCESS METRICS">
            {isMetricsLoading ? <Spin style={{ margin: 'auto' }} /> : (
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '100%' }}>
                <Progress 
                  type="dashboard" 
                  percent={metrics?.successRatePercent || 0} 
                  strokeColor={THEME.success} 
                  trailColor="rgba(255,255,255,0.1)"
                  format={percent => <span style={{ color: 'white', fontSize: '24px' }}>{percent}%</span>}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Statistic title="TOTAL MISSIONS" value={metrics?.totalMissions || 0} prefix={<CheckCircleOutlined style={{ color: THEME.success, marginRight: 8 }}/>} />
                  <Statistic title="FAILED / ABORTED" value={metrics?.failedMissions || 0} prefix={<BugOutlined style={{ color: THEME.danger, marginRight: 8 }}/>} valueStyle={{ color: THEME.danger }} />
                </div>
              </div>
            )}
          </HudCard>
        </Col>

        <Col span={12}>
          <HudCard title="REPORT EXPORT ENGINE">
            <Form 
              form={form} 
              layout="vertical" 
              onFinish={handleGenerateReport}
              initialValues={{ targetSatelliteId: 'ALL', reportType: 'FLEET_TELEMETRY', format: 'PDF' }}
              style={{ width: '100%' }}
            >
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="targetSatelliteId" label="TARGET ASSET" style={{ marginBottom: 8 }}>
                    <Select placeholder="Select..." popupClassName="hud-select-dropdown" loading={isFleetLoading}>
                      <Option value="ALL">ALL FLEET ASSETS</Option>
                      {fleetData?.map(sat => (
                        <Option key={sat.id} value={sat.id}>{sat.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="reportType" label="REPORT PROFILE" style={{ marginBottom: 8 }}>
                    <Select popupClassName="hud-select-dropdown">
                      <Option value="FLEET_TELEMETRY">TELEMETRY DATA</Option>
                      <Option value="ANOMALY_LOGS">ANOMALY LOGS</Option>
                      <Option value="MISSION_SUMMARY">MISSIONS SUMMARY</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={8} style={{ alignItems: 'flex-end' }}>
                <Col span={10}>
                  <Form.Item name="format" label="EXPORT FORMAT" style={{ marginBottom: 0 }}>
                    <Select popupClassName="hud-select-dropdown">
                      <Option value="PDF">PDF ARCHIVE</Option>
                      <Option value="CSV">CSV DATA</Option>
                      <Option value="JSON">RAW JSON</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={14}>
                  <HudButton 
                    primary 
                    htmlType="submit"
                    icon={<CloudDownloadOutlined />} 
                    loading={generateMutation.isPending}
                    style={{ width: '100%', height: '32px' }}
                  >
                    {generateMutation.isPending ? 'COMPILING...' : 'GENERATE REPORT'}
                  </HudButton>
                </Col>
              </Row>
            </Form>
          </HudCard>
        </Col>
      </Row>

      <HudCard 
        title="SYSTEM ANOMALY REGISTRY (LAST 7 DAYS)" 
        style={{ flex: 1 }}
        extra={
          <Space>
            <FilterOutlined style={{ color: THEME.cyanGlow }} />
            <Select 
              placeholder="Filter by satellite..." 
              popupClassName="hud-select-dropdown" 
              style={{ width: 220 }} 
              allowClear
              onChange={(value) => setAnomalyFilterSat(value || null)}
            >
              {fleetData?.map(sat => (
                <Option key={sat.id} value={sat.id}>{sat.name}</Option>
              ))}
            </Select>
          </Space>
        }
      >
        <TableWrapper>
          <Table 
            columns={columns}
            dataSource={anomalies || []} 
            rowKey="incidentId" 
            size="middle" 
            loading={isAnomaliesLoading}
            pagination={{ pageSize: 5 }}
            locale={{ emptyText: <Text style={{color: THEME.success}}>NO SYSTEM ANOMALIES DETECTED IN SELECTED TIMEFRAME</Text> }}
          />
        </TableWrapper>
      </HudCard>
    </PageContainer>
  );
};

export default ReportsView;