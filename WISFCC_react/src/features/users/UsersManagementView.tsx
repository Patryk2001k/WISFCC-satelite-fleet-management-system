
import React, { useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, Select, Typography, Popconfirm, Badge, Spin } from 'antd';
import type { TableProps } from 'antd';
import { UserAddOutlined, EditOutlined, DeleteOutlined, StopOutlined, SafetyCertificateOutlined, KeyOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { THEME } from '../../styles/theme';
import { 
  useUsersCache, 
  useCreateUser, 
  useUpdateUserStatus, 
  useResetUserPassword, 
  useDeleteUser, 
} from '../../services/usersRequest';
import type {  UserDTO } from '../../services/usersRequest'

const { Text } = Typography;
const { Option } = Select;


const PageContainer = styled.div` height: 100%; display: flex; flex-direction: column; `;

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

export const UsersManagementView: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  
  const [isTempPasswordModalVisible, setIsTempPasswordModalVisible] = useState(false);
  const [generatedTempPassword, setGeneratedTempPassword] = useState('');
  
  const [form] = Form.useForm();

  
  const { data: users, isLoading, isError } = useUsersCache();
  const createUserMutation = useCreateUser();
  const updateStatusMutation = useUpdateUserStatus();
  const resetPasswordMutation = useResetUserPassword();
  const deleteMutation = useDeleteUser();

  const handleOpenAdd = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleSuspend = (id: string, currentStatus: 'ACTIVE' | 'SUSPENDED') => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleResetPassword = (id: string) => {
    
    resetPasswordMutation.mutate(id, {
      onSuccess: (data) => {
        setGeneratedTempPassword(data.temporaryPassword);
        setIsTempPasswordModalVisible(true);
      }
    });
  };

  const onFinish = (values: any) => {
    createUserMutation.mutate({
      username: values.username.toUpperCase(),
      role: values.role,
      clearance: values.clearance,
      tempPassword: values.tempPassword
    }, {
      onSuccess: () => setIsModalVisible(false)
    });
  };

  const columns: TableProps<UserDTO>['columns'] = [
    { title: 'OP ID', dataIndex: 'id', key: 'id', render: (id: string) => <Text style={{ color: THEME.textSecondary }}>{id}</Text> },
    { 
      title: 'CALLSIGN (USERNAME)', 
      dataIndex: 'username', 
      key: 'username', 
      render: (name: string, record: UserDTO) => (
        <Space>
          {record.role === 'ADMIN' ? <SafetyCertificateOutlined style={{ color: THEME.warning }} /> : null}
          <Text style={{ color: 'white', fontWeight: 'bold', letterSpacing: '1px' }}>{name}</Text>
        </Space>
      ) 
    },
    { 
      title: 'SYSTEM ROLE', 
      dataIndex: 'role', 
      key: 'role', 
      render: (role: string) => (
        <Tag color={role === 'ADMIN' ? 'volcano' : 'cyan'} style={{ fontWeight: 'bold' }}>
          {role}
        </Tag>
      ) 
    },
    { 
      title: 'CLEARANCE', 
      dataIndex: 'clearance', 
      key: 'clearance', 
      render: (clr: string) => <Text style={{ color: THEME.cyanBase, fontFamily: 'monospace' }}>{clr}</Text> 
    },
    { 
      title: 'ACCOUNT STATUS', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status: string) => (
        <Badge status={status === 'ACTIVE' ? 'success' : 'error'} text={<span style={{ color: status === 'ACTIVE' ? THEME.success : THEME.danger }}>{status}</span>} />
      ) 
    },
    { title: 'LAST TERMINAL LOGIN', dataIndex: 'lastLogin', key: 'lastLogin', render: (date: string) => <Text style={{ color: THEME.textSecondary, fontSize: '12px' }}>{date}</Text> },
    {
      title: 'SECURITY ACTIONS',
      key: 'actions',
      render: (_: any, record: UserDTO) => (
        <Space>
          <HudButton info icon={<KeyOutlined />} onClick={() => handleResetPassword(record.id)} title="Reset Password" />
          <Popconfirm 
            title={record.status === 'ACTIVE' ? "SUSPEND THIS ACCOUNT?" : "UNSUSPEND THIS ACCOUNT?"} 
            onConfirm={() => handleSuspend(record.id, record.status)} 
            okText="YES" 
            cancelText="NO"
          >
            <HudButton warning icon={<StopOutlined />} title="Suspend / Unsuspend" />
          </Popconfirm>

          <Popconfirm 
            title="PERMANENTLY DELETE USER?" 
            onConfirm={() => handleDelete(record.id)} 
            okText="YES" 
            cancelText="NO"
          >
            <HudButton danger icon={<DeleteOutlined />} title="Delete User" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <HudCard 
        title="WISFCC PERSONNEL & CLEARANCE MANAGEMENT" 
        extra={<HudButton primary icon={<UserAddOutlined />} onClick={handleOpenAdd}>ENLIST NEW OPERATOR</HudButton>}
      >
        <TableWrapper>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="large" />
              <div style={{ color: THEME.cyanGlow, marginTop: 10 }}>Connecting to personnel registry...</div>
            </div>
          ) : isError ? (
            <div style={{ color: THEME.danger, textAlign: 'center', padding: '50px' }}>
              Database connection error. Ensure Spring Boot backend is running.
            </div>
          ) : (
            <Table columns={columns} dataSource={users || []} rowKey="id" pagination={{ pageSize: 8 }} />
          )}
        </TableWrapper>
      </HudCard>

      <Modal
        className="hud-modal"
        title={<Text style={{ color: THEME.cyanGlow, letterSpacing: '1px' }}>PERSONNEL REGISTRATION TERMINAL</Text>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        closeIcon={<Text style={{ color: THEME.danger, fontSize: '16px' }}>X</Text>}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" label="OPERATOR CALLSIGN" rules={[{ required: true, message: 'Operator callsign is required!' }]}>
            <Input placeholder="e.g. OP_OMEGA" />
          </Form.Item>
          
          <Form.Item name="role" label="SYSTEM ROLE" rules={[{ required: true }]}>
            <Select placeholder="Assign role..." popupClassName="hud-select-dropdown">
              <Option value="OPERATOR">OPERATOR (Standard Access)</Option>
              <Option value="ADMIN">ADMIN (Full System Override)</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="clearance" label="SECURITY CLEARANCE LEVEL" rules={[{ required: true }]}>
            <Select placeholder="Assign clearance..." popupClassName="hud-select-dropdown">
              <Option value="LEVEL_1">LEVEL 1 (Telemetry Only)</Option>
              <Option value="LEVEL_3">LEVEL 3 (Execution Rights)</Option>
              <Option value="LEVEL_5">LEVEL 5 (Director Level)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="tempPassword" label="TEMPORARY PASSWORD" rules={[{ required: true, min: 8, message: 'Minimum 8 characters required!' }]}>
            <Input.Password placeholder="Min. 8 characters" />
          </Form.Item>
          
          <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
            <HudButton onClick={() => setIsModalVisible(false)}>CANCEL</HudButton>
            <HudButton primary htmlType="submit" loading={createUserMutation.isPending}>
              AUTHORIZE ACCESS
            </HudButton>
          </Space>
        </Form>
      </Modal>

      <Modal
        className="hud-modal"
        title={<Text style={{ color: THEME.cyanGlow, letterSpacing: '1px' }}><KeyOutlined /> SECURITY ACCESS CODE GENERATED</Text>}
        open={isTempPasswordModalVisible}
        onCancel={() => setIsTempPasswordModalVisible(false)}
        closeIcon={<Text style={{ color: THEME.danger, fontSize: '16px' }}>X</Text>}
        footer={[
          <HudButton key="close" primary onClick={() => setIsTempPasswordModalVisible(false)}>
            ZROZUMIANO
          </HudButton>
        ]}
        width={500}
        centered
      >
        <div style={{ background: 'rgba(0, 255, 255, 0.02)', padding: '20px', border: `1px solid ${THEME.cyanDark}`, borderRadius: '8px', textAlign: 'center' }}>
          <Text style={{ color: THEME.textSecondary, display: 'block', marginBottom: 16, fontSize: '12px' }}>
            A NEW TEMPORARY PASSWORD FOR THE OPERATOR HAS BEEN SUCCESSFULLY GENERATED. TRANSMIT IT TO THE WORKSTATION:
          </Text>
          
          <div style={{ 
            background: 'rgba(10, 37, 46, 0.8)', 
            border: `1px solid ${THEME.cyanGlow}`, 
            padding: '12px 24px', 
            borderRadius: '6px', 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: THEME.cyanGlow,
            fontFamily: 'monospace',
            letterSpacing: '2px',
            display: 'inline-block',
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)',
            margin: '10px 0'
          }}>
            {generatedTempPassword}
          </div>
          
          <Text style={{ color: THEME.danger, display: 'block', marginTop: 16, fontSize: '10px', letterSpacing: '1px' }}>
            * NOTE: THIS PASSWORD IS A ONE-TIME USE PASSWORD AND WILL EXPIRE AFTER THE FIRST OPERATOR LOGIN.
          </Text>
        </div>
      </Modal>

    </PageContainer>
  );
};

export default UsersManagementView;