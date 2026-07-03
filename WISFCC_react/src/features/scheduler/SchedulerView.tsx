
import React, { useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Select, InputNumber, Typography, Spin, Collapse } from 'antd';
import type { TableProps } from 'antd';
import { PlusOutlined, RocketOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { THEME } from '../../styles/theme';
import { useMissionsCache, useCreateMission } from '../../services/missionRequest';
import type { MissionDTO } from '../../services/missionRequest'
import { useSpaceObjectsFleetCache } from '../../services/spaceObjectsRequest'; 

const { Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;


const PageContainer = styled.div` height: 100%; display: flex; flex-direction: column; `;
const HudCard = styled(Card)`
  background: ${THEME.panelBg}; border: 1px solid ${THEME.cyanDark}; border-radius: 8px; backdrop-filter: blur(10px); flex: 1; display: flex; flex-direction: column;
  .ant-card-head { border-bottom: 1px solid ${THEME.cyanDark}; min-height: 48px; }
  .ant-card-head-title { color: ${THEME.textMain}; text-transform: uppercase; font-weight: bold; }
  .ant-card-body { padding: 16px; flex: 1; overflow: hidden; display: flex; flex-direction: column; }
`;
const HudButton = styled(Button)<{ primary?: boolean }>`
  background: ${props => props.primary ? 'rgba(0, 255, 255, 0.1)' : 'transparent'} !important;
  border-color: ${props => props.primary ? THEME.cyanGlow : THEME.cyanDark} !important;
  color: ${props => props.primary ? THEME.cyanGlow : THEME.textMain} !important;
  text-transform: uppercase; font-size: 11px; font-weight: bold;
  &:hover { border-color: ${THEME.cyanBase} !important; color: ${THEME.cyanBase} !important; box-shadow: 0 0 10px rgba(0, 255, 255, 0.2); }
`;


const getStatusTag = (status: string) => {
  switch (status) {
    case 'COMPLETED': return <Tag color="success">COMPLETED</Tag>;
    case 'EXECUTING': return <Tag color="processing" icon={<Spin size="small" style={{ marginRight: 5 }} />}>EXECUTING</Tag>;
    case 'FAILED': return <Tag color="error">FAILED</Tag>;
    case 'PENDING': default: return <Tag color="default">PENDING</Tag>;
  }
};

export const MissionSchedulerView: React.FC = () => {
  const { data: missions, isLoading: isMissionsLoading } = useMissionsCache();
  const { data: fleet } = useSpaceObjectsFleetCache(); 
  const createMutation = useCreateMission();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  
  const selectedCommandType = Form.useWatch('commandType', form);

  const handleOpenAdd = () => {
    form.resetFields();
    form.setFieldsValue({
      
      scheduledTimeUtc: new Date(Date.now() + 3600000).toISOString().slice(0, 19) + 'Z' 
    });
    setIsModalVisible(true);
  };

  const onFinish = (values: any) => {
    
    let parameters = {};
    if (values.commandType === 'ORBIT_ADJUST') {
      parameters = { deltaV: values.deltaV, axis: values.axis };
    } else if (values.commandType === 'SENSOR_CALIBRATION') {
      parameters = { deepScan: values.deepScan === 'true' };
    } else if (values.commandType === 'TRANSMITTER_POWER') {
      parameters = { powerLevel: values.powerLevel };
    } else if (values.commandType === 'SLEEP_MODE') {
      parameters = { durationHours: values.durationHours };
    }

    createMutation.mutate({
      targetSpaceObjectId: values.targetSpaceObjectId,
      commandType: values.commandType,
      scheduledTimeUtc: values.scheduledTimeUtc,
      parameters: parameters
    }, {
      onSuccess: () => setIsModalVisible(false)
    });
  };

  const columns: TableProps<MissionDTO>['columns'] = [
    { title: 'JOB ID', dataIndex: 'jobId', key: 'jobId', render: (text) => <Text style={{ color: THEME.cyanGlow, fontSize: 12 }}>{text}</Text> },
    { title: 'TARGET SATELLITE', dataIndex: 'targetSatelliteName', key: 'targetSatelliteName', render: (text) => <Text strong style={{ color: 'white' }}>{text}</Text> },
    { title: 'COMMAND TYPE', dataIndex: 'commandType', key: 'commandType', render: (text) => <Text style={{ color: THEME.textSecondary }}>{text.replace('_', ' ')}</Text> },
    { title: 'SCHEDULED (UTC)', dataIndex: 'scheduledTimeUtc', key: 'scheduledTimeUtc', render: (text) => <Text style={{ color: 'white' }}>{new Date(text).toLocaleString()}</Text> },
    { title: 'OPERATOR', dataIndex: 'orderedBy', key: 'orderedBy', render: (text) => <Tag color="blue">@{text}</Tag> },
    { title: 'STATUS', dataIndex: 'status', key: 'status', render: (status) => getStatusTag(status) },
  ];

  return (
    <PageContainer>
      <HudCard title="MISSION COMMAND SCHEDULER" extra={<HudButton primary icon={<PlusOutlined />} onClick={handleOpenAdd}>SCHEDULE NEW MISSION</HudButton>}>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Table 
            columns={columns} 
            dataSource={missions || []} 
            rowKey="jobId" 
            loading={isMissionsLoading}
            pagination={{ pageSize: 8 }}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: '10px 20px', background: 'rgba(0, 0, 0, 0.2)', border: `1px solid ${THEME.cyanDark}` }}>
                  <Text style={{ color: THEME.cyanGlow, display: 'block', marginBottom: 8 }}>PARAMETERS PAYLOAD:</Text>
                  <pre style={{ color: 'white', background: '#111', padding: 8, borderRadius: 4 }}>
                    {JSON.stringify(record.parameters, null, 2)}
                  </pre>
                  
                  {record.executionLogs && (
                    <>
                      <Text style={{ color: record.status === 'FAILED' ? THEME.danger : THEME.success, display: 'block', marginTop: 12, marginBottom: 8 }}>EXECUTION LOGS:</Text>
                      <pre style={{ color: 'white', background: '#111', padding: 8, borderRadius: 4, borderLeft: `3px solid ${record.status === 'FAILED' ? THEME.danger : THEME.success}` }}>
                        {record.executionLogs}
                      </pre>
                    </>
                  )}
                </div>
              ),
            }}
          />
        </div>
      </HudCard>

      <Modal
        className="hud-modal"
        title={<><RocketOutlined /> CONFIGURE NEW OPERATION</>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          
          <Form.Item name="targetSpaceObjectId" label="TARGET OBJECT" rules={[{ required: true }]}>
            <Select placeholder="Select satellite from fleet..." loading={!fleet} popupClassName="hud-select-dropdown">
              {fleet?.map(sat => (
                <Option key={sat.id} value={sat.id}>#{sat.catalogId} - {sat.name} ({sat.type})</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="commandType" label="COMMAND TYPE" rules={[{ required: true }]}>
            <Select placeholder="Select operation..." popupClassName="hud-select-dropdown">
              <Option value="ORBIT_ADJUST">ORBIT ADJUST (Maneuver)</Option>
              <Option value="SENSOR_CALIBRATION">SENSOR CALIBRATION (Diagnostic)</Option>
              <Option value="TRANSMITTER_POWER">TRANSMITTER POWER (Comm)</Option>
              <Option value="SLEEP_MODE">SLEEP MODE (Power Saving)</Option>
            </Select>
          </Form.Item>

          {selectedCommandType && (
            <div style={{ padding: 16, background: 'rgba(0, 255, 255, 0.05)', border: `1px solid ${THEME.cyanDark}`, borderRadius: 4, marginBottom: 24 }}>
              <Text style={{ color: THEME.cyanGlow, display: 'block', marginBottom: 16, fontWeight: 'bold' }}>OPERATION PARAMETERS</Text>
              
              {selectedCommandType === 'ORBIT_ADJUST' && (
                <Space>
                  <Form.Item name="deltaV" label="DELTA-V (m/s)" rules={[{ required: true }]}>
                    <InputNumber step={0.1} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="axis" label="AXIS" rules={[{ required: true }]}>
                    <Select style={{ width: 120 }} popupClassName="hud-select-dropdown">
                      <Option value="X">Prograde (X)</Option>
                      <Option value="Y">Normal (Y)</Option>
                      <Option value="Z">Radial (Z)</Option>
                    </Select>
                  </Form.Item>
                </Space>
              )}

              {selectedCommandType === 'SENSOR_CALIBRATION' && (
                <Form.Item name="deepScan" label="SCAN DEPTH" rules={[{ required: true }]}>
                   <Select popupClassName="hud-select-dropdown">
                      <Option value="true">DEEP SCAN (Active)</Option>
                      <Option value="false">SURFACE SCAN (Passive)</Option>
                    </Select>
                </Form.Item>
              )}

              {selectedCommandType === 'TRANSMITTER_POWER' && (
                <Form.Item name="powerLevel" label="POWER OUTPUT" rules={[{ required: true }]}>
                  <Select popupClassName="hud-select-dropdown">
                    <Option value="LOW">LOW (Energy Saver)</Option>
                    <Option value="NOMINAL">NOMINAL (Standard)</Option>
                    <Option value="HIGH">HIGH (Deep Space)</Option>
                  </Select>
                </Form.Item>
              )}

              {selectedCommandType === 'SLEEP_MODE' && (
                <Form.Item name="durationHours" label="DURATION (HOURS)" rules={[{ required: true }]}>
                  <InputNumber min={1} max={720} style={{ width: '100%' }} />
                </Form.Item>
              )}
            </div>
          )}

          <Form.Item name="scheduledTimeUtc" label="SCHEDULED TIME (UTC - ISO 8601)" rules={[{ required: true }]}>
             <input type="text" className="ant-input" style={{ backgroundColor: 'rgba(10, 37, 46, 0.8)', color: 'white', border: `1px solid ${THEME.cyanDark}` }} />
          </Form.Item>

          <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <HudButton onClick={() => setIsModalVisible(false)}>CANCEL</HudButton>
            <HudButton primary htmlType="submit" loading={createMutation.isPending}>
              COMMIT COMMAND
            </HudButton>
          </Space>
        </Form>
      </Modal>

    </PageContainer>
  );
};

export default MissionSchedulerView;