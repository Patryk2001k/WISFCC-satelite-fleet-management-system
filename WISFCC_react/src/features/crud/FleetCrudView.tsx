
import React, { useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, Select, Typography, Popconfirm, Descriptions, Badge, Spin } from 'antd';
import type { TableProps } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BarChartOutlined, EnvironmentOutlined } from '@ant-design/icons';
import styled, { createGlobalStyle } from 'styled-components';
import { THEME } from '../../styles/theme';
import { 
  useSpaceObjectsFleetCache, 
  useCreateSpaceObject, 
  useUpdateSpaceObject, 
  useDeleteSpaceObject 
} from '../../services/spaceObjectsRequest';
import type { SpaceObjectDTO } from '../../services/spaceObjectsRequest';

const { Text } = Typography;
const { Option } = Select;


const GlobalModalStyle = createGlobalStyle`
  .hud-modal .ant-modal-content {
    background-color: ${THEME.bgDeep} !important;
    background: ${THEME.bgDeep} !important;
    padding: 0 !important;
    border: 1px solid ${THEME.cyanGlow} !important;
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.15) !important;
    border-radius: 8px !important;
    overflow: hidden !important;
  }
  .hud-modal .ant-modal-header {
    background-color: ${THEME.bgDeep} !important;
    background: ${THEME.bgDeep} !important;
    border-bottom: 1px solid ${THEME.cyanDark} !important;
    padding: 16px 24px !important;
    margin: 0 !important;
  }
  .hud-modal .ant-modal-title { color: ${THEME.cyanGlow} !important; letter-spacing: 1px; }
  .hud-modal .ant-modal-close { color: ${THEME.danger} !important; top: 16px !important; inset-inline-end: 24px !important; }
  .hud-modal .ant-modal-close:hover { background-color: rgba(255, 77, 79, 0.15) !important; }
  .hud-modal .ant-modal-body { background-color: ${THEME.bgDeep} !important; background: ${THEME.bgDeep} !important; padding: 24px !important; }
  .hud-modal .ant-modal-footer { background-color: ${THEME.bgDeep} !important; background: ${THEME.bgDeep} !important; border-top: none !important; padding: 16px 24px !important; margin: 0 !important; }
  .hud-modal .ant-form-item-label > label { color: ${THEME.textSecondary} !important; }
  .hud-modal .ant-input, .hud-modal .ant-select-selector { background-color: rgba(10, 37, 46, 0.8) !important; color: white !important; border-color: ${THEME.cyanDark} !important; }
  .hud-modal .ant-select-arrow { color: ${THEME.cyanGlow} !important; }
  .hud-modal .ant-select-selection-item { color: white !important; }
  .hud-select-dropdown { background-color: ${THEME.bgDeep} !important; border: 1px solid ${THEME.cyanDark} !important; }
  .hud-select-dropdown .ant-select-item { color: white !important; }
  .hud-select-dropdown .ant-select-item-option-active { background-color: rgba(0, 255, 255, 0.1) !important; }
  .hud-select-dropdown .ant-select-item-option-selected { background-color: rgba(0, 255, 255, 0.2) !important; color: ${THEME.cyanGlow} !important; }
`;


const PageContainer = styled.div` height: 100%; display: flex; flex-direction: column; `;
const HudCard = styled(Card)`
  background: ${THEME.panelBg}; border: 1px solid ${THEME.cyanDark}; border-radius: 8px; backdrop-filter: blur(10px); flex: 1; display: flex; flex-direction: column;
  .ant-card-head { border-bottom: 1px solid ${THEME.cyanDark}; min-height: 48px; }
  .ant-card-head-title { color: ${THEME.textMain}; text-transform: uppercase; font-weight: bold; }
  .ant-card-body { padding: 16px; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
`;
const HudButton = styled(Button)<{ primary?: boolean, danger?: boolean, info?: boolean }>`
  background: ${props => props.primary ? 'rgba(0, 255, 255, 0.1)' : props.danger ? 'rgba(255, 77, 79, 0.1)' : props.info ? 'rgba(18, 234, 234, 0.1)' : 'transparent'} !important;
  border-color: ${props => props.primary ? THEME.cyanGlow : props.danger ? THEME.danger : props.info ? THEME.cyanBase : THEME.cyanDark} !important;
  color: ${props => props.primary ? THEME.cyanGlow : props.danger ? THEME.danger : props.info ? THEME.cyanBase : THEME.textMain} !important;
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

export const FleetCrudView: React.FC = () => {
  
  const { data: fleetData, isLoading, isError } = useSpaceObjectsFleetCache();
  const createMutation = useCreateSpaceObject();
  const updateMutation = useUpdateSpaceObject();
  const deleteMutation = useDeleteSpaceObject();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isTelemetryModalVisible, setIsTelemetryModalVisible] = useState(false);
  const [selectedSat, setSelectedSat] = useState<SpaceObjectDTO | null>(null);
  const [form] = Form.useForm();

  const handleOpenAdd = () => { setSelectedSat(null); form.resetFields(); setIsEditModalVisible(true); };
  const handleOpenEdit = (record: SpaceObjectDTO) => { setSelectedSat(record); form.setFieldsValue(record); setIsEditModalVisible(true); };
  const handleOpenTelemetry = (record: SpaceObjectDTO) => { setSelectedSat(record); setIsTelemetryModalVisible(true); };
  
  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const onFinish = (values: any) => {
    if (selectedSat) {
      
      updateMutation.mutate({ id: selectedSat.id, ...values });
    } else {
      
      createMutation.mutate({
        name: values.name,
        catalogId: values.catalogId,
        type: values.type,
        status: values.status,
        latitude: values.latitude || 0,
        longitude: values.longitude || 0,
        altitude: values.altitude || 400,
        tleLine1: values.tleLine1,
        tleLine2: values.tleLine2
      });
    }
    setIsEditModalVisible(false);
  };

  const columns: TableProps<SpaceObjectDTO>['columns'] = [
    { title: 'NORAD ID', dataIndex: 'catalogId', key: 'catalogId', render: (id: string) => <Text style={{ color: THEME.cyanGlow }}>#{id}</Text> },
    { title: 'NAME', dataIndex: 'name', key: 'name', render: (name: string) => <Text style={{ color: 'white', fontWeight: 'bold' }}>{name}</Text> },
    { title: 'TYPE', dataIndex: 'type', key: 'type', render: (type: string) => <Text style={{ color: THEME.textSecondary }}>{type.replace('_', ' ')}</Text> },
    { title: 'STATUS', dataIndex: 'status', key: 'status', render: (st: string) => <Tag color={st === 'ONLINE' ? 'success' : st === 'OFFLINE' ? 'error' : 'warning'}>{st}</Tag> },
    { title: 'BATTERY', dataIndex: 'batteryLevel', key: 'batteryLevel', render: (b: number) => <Text style={{ color: b > 20 ? THEME.success : THEME.danger }}>{b}%</Text> },
    {
      title: 'COMMANDS', key: 'actions', render: (_: any, record: SpaceObjectDTO) => (
        <Space>
          <HudButton info icon={<BarChartOutlined />} onClick={() => handleOpenTelemetry(record)}>STATUS</HudButton>
          <HudButton icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
          <Popconfirm title="PERMANENTLY DELETE OBJECT?" onConfirm={() => handleDelete(record.id)} okText="YES" cancelText="NO">
            <HudButton danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <GlobalModalStyle />

      <HudCard title="SATELLITE FLEET REGISTRY" extra={<HudButton primary icon={<PlusOutlined />} onClick={handleOpenAdd}>REGISTER NEW OBJECT</HudButton>}>
        <TableWrapper>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="large" />
              <div style={{ color: THEME.cyanGlow, marginTop: 10 }}>Establishing a connection to the database...</div>
            </div>
          ) : isError ? (
            <div style={{ color: THEME.danger, textAlign: 'center', padding: '50px' }}>Server connection error.</div>
          ) : (
            <Table columns={columns} dataSource={fleetData || []} rowKey="id" pagination={{ pageSize: 10 }} />
          )}
        </TableWrapper>
      </HudCard>
      <Modal
        className="hud-modal"
        wrapClassName="hud-modal"
        title="ORBITAL OBJECT CONFIGURATION"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="OBJECT NAME" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          
          <Form.Item name="catalogId" label="CATALOG ID" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          
          <Form.Item name="type" label="TYPE" rules={[{ required: true }]}>
            <Select popupClassName="hud-select-dropdown" dropdownClassName="hud-select-dropdown">
              <Option value="SATELLITE">SATELLITE</Option>
              <Option value="SPACE_STATION">SPACE STATION</Option>
              <Option value="DEBRIS">DEBRIS</Option>
            </Select>
          </Form.Item>

          <Form.Item name="status" label="OPERATIONAL STATUS" rules={[{ required: true }]}>
            <Select popupClassName="hud-select-dropdown" dropdownClassName="hud-select-dropdown">
              <Option value="ONLINE">ONLINE</Option>
              <Option value="OFFLINE">OFFLINE</Option>
              <Option value="MANEUVERING">MANEUVERING</Option>
              <Option value="DECAYED">DECAYED (Zniszczony)</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="tleLine1" label="TLE LINE 1 (69 CHARS)">
            <Input style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          
          <Form.Item name="tleLine2" label="TLE LINE 2 (69 CHARS)">
            <Input style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          
          <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <HudButton onClick={() => setIsEditModalVisible(false)}>CANCEL</HudButton>
            <HudButton primary htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              SAVE CHANGES
            </HudButton>
          </Space>
        </Form>
      </Modal>

      <Modal
        className="hud-modal"
        wrapClassName="hud-modal"
        title={<><BarChartOutlined /> SATELLITE DIAGNOSTIC REPORT</>}
        open={isTelemetryModalVisible}
        onCancel={() => setIsTelemetryModalVisible(false)}
        footer={[<HudButton key="close" primary onClick={() => setIsTelemetryModalVisible(false)}>CLOSE REPORT</HudButton>]}
        width={600}
      >
        {selectedSat && (
          <div style={{ background: 'rgba(0, 255, 255, 0.02)', padding: '20px', border: `1px solid ${THEME.cyanDark}`, borderRadius: '8px' }}>
            <Descriptions bordered column={1} size="small" contentStyle={{ color: 'white', background: 'transparent' }} labelStyle={{ color: THEME.textSecondary, background: 'rgba(0, 255, 255, 0.05)', width: '200px' }}>
              <Descriptions.Item label="SYSTEM NAME">{selectedSat.name}</Descriptions.Item>
              <Descriptions.Item label="NORAD CATALOG">#{selectedSat.catalogId}</Descriptions.Item>
              <Descriptions.Item label="CLASSIFICATION"><Tag color="blue">{selectedSat.type.replace('_', ' ')}</Tag></Descriptions.Item>
              <Descriptions.Item label="OPERATIONAL STATUS">
                <Badge status={selectedSat.status === 'ONLINE' ? 'success' : 'error'} text={<span style={{ color: 'white' }}>{selectedSat.status}</span>} />
              </Descriptions.Item>
              <Descriptions.Item label="ENERGY LEVEL">
                <span style={{ color: selectedSat.batteryLevel > 20 ? THEME.success : THEME.danger, fontWeight: 'bold' }}>{selectedSat.batteryLevel}%</span>
              </Descriptions.Item>
              <Descriptions.Item label="GEOSPATIAL COORDINATES">
                <EnvironmentOutlined style={{ color: THEME.cyanGlow }} /> {selectedSat.latitude?.toFixed(2)}°N, {selectedSat.longitude?.toFixed(2)}°E
              </Descriptions.Item>
              <Descriptions.Item label="ALTITUDE (KM)">{selectedSat.altitude} km</Descriptions.Item>
              <Descriptions.Item label="LAST UPDATED (UTC)">{selectedSat.lastUpdatedUtc}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default FleetCrudView;