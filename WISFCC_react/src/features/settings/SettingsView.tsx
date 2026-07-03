// Plik: src/features/settings/SettingsView.tsx
import React from 'react';
import { Card, Form, Input, Switch, Space, Typography, message, Tabs, Divider, Row, Col, Button, Spin } from 'antd';
import { 
  UserOutlined, SettingOutlined, LockOutlined, 
  BellOutlined, SoundOutlined, SafetyCertificateOutlined,
  SaveOutlined, GlobalOutlined // <--- Zaimportowana ikona dla śmieci kosmicznych
} from '@ant-design/icons';
import styled from 'styled-components';
import { THEME } from '../../styles/theme';
import { 
  useUserProfile, 
  useUserPreferences, 
  useUpdatePreferences, 
  useChangePassword,
} from '../../services/settingsRequest';
import type { UserPreferencesDTO } from '../../services/settingsRequest'

const { Text, Title } = Typography;

// --- STYLIZACJA HUD ---
const PageContainer = styled.div`
  height: 100%; display: flex; flex-direction: column;

  .ant-tabs-nav { margin-bottom: 24px !important; }
  .ant-tabs-nav::before { border-bottom: 1px solid ${THEME.cyanDark} !important; }
  .ant-tabs-tab { color: ${THEME.textSecondary} !important; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; padding: 12px 0 !important; }
  .ant-tabs-tab:hover { color: ${THEME.cyanBase} !important; }
  .ant-tabs-tab-active .ant-tabs-tab-btn { color: ${THEME.cyanGlow} !important; font-weight: bold; text-shadow: 0 0 8px rgba(0, 255, 255, 0.4); }
  .ant-tabs-ink-bar { background: ${THEME.cyanGlow} !important; height: 3px !important; box-shadow: 0 0 10px ${THEME.cyanGlow}; }

  .ant-divider { border-color: rgba(7, 54, 65, 0.5) !important; margin: 16px 0; }
  .ant-switch { background: rgba(255, 255, 255, 0.1); border: 1px solid ${THEME.cyanDark}; }
  .ant-switch-checked { background: ${THEME.success} !important; border-color: ${THEME.success}; }

  .ant-form-item-label > label { color: ${THEME.textSecondary} !important; }
  .ant-input, .ant-input-password { background: rgba(10, 37, 46, 0.6) !important; color: white !important; border-color: ${THEME.cyanDark} !important; }
  .ant-input-password-icon { color: ${THEME.cyanGlow} !important; }
`;

const HudCard = styled(Card)`
  background: ${THEME.panelBg}; border: 1px solid ${THEME.cyanDark}; border-radius: 8px; backdrop-filter: blur(10px); flex: 1; display: flex; flex-direction: column;
  .ant-card-head { border-bottom: 1px solid ${THEME.cyanDark}; min-height: 48px; }
  .ant-card-head-title { color: ${THEME.textMain}; text-transform: uppercase; font-weight: bold; }
  .ant-card-body { padding: 24px; flex: 1; display: flex; flex-direction: column; overflow-y: auto; }
`;

const HudButton = styled(Button)<{ primary?: boolean }>`
  background: ${props => props.primary ? 'rgba(0, 255, 255, 0.1)' : 'transparent'} !important;
  border-color: ${props => props.primary ? THEME.cyanGlow : THEME.cyanDark} !important;
  color: ${props => props.primary ? THEME.cyanGlow : 'white'} !important;
  text-transform: uppercase; font-size: 12px; font-weight: bold; letter-spacing: 1px;
  &:hover { border-color: ${THEME.cyanBase} !important; color: ${THEME.cyanBase} !important; box-shadow: 0 0 10px rgba(0, 255, 255, 0.2); }
`;

const InfoBox = styled.div`
  background: rgba(0, 255, 255, 0.02); border: 1px dashed ${THEME.cyanDark}; padding: 16px; border-radius: 4px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 4px;
`;

export const SettingsView: React.FC = () => {
  const [form] = Form.useForm();
  
  // API Hooks
  const { data: profile, isLoading: isProfileLoading } = useUserProfile();
  const { data: preferences, isLoading: isPrefsLoading } = useUserPreferences();
  const updatePrefsMutation = useUpdatePreferences();
  const changePasswordMutation = useChangePassword();

  const handleSaveSecurity = (values: any) => {
    changePasswordMutation.mutate(values, {
      onSuccess: () => form.resetFields()
    });
  };

  const handleTogglePreference = (key: keyof UserPreferencesDTO, checked: boolean, label: string) => {
    if (!preferences) return;
    
    // Tworzymy zaktualizowany obiekt ustawień
    const newPrefs = { ...preferences, [key]: checked };
    
    // Wysyłamy go do Javy
    updatePrefsMutation.mutate(newPrefs);
    
    // Powiadomienie HUD [2]
    if (checked) message.success(`${label} ENABLED.`);
    else message.warning(`${label} DISABLED.`);
  };

  // --- ZAKŁADKA 1: PROFIL ---
  const tabAccount = isProfileLoading ? <Spin style={{ margin: '50px auto', display: 'block' }} /> : (
    <div style={{ maxWidth: '600px' }}>
      <Title level={4} style={{ color: 'white', marginTop: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>
        OPERATOR DOSSIER
      </Title>
      <Text style={{ color: THEME.textSecondary, display: 'block', marginBottom: '24px' }}>
        Reassignment requires authorization, please wait for a response. [2]
      </Text>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <InfoBox>
            <Text style={{ fontSize: '10px', color: THEME.textSecondary }}>CALLSIGN (USERNAME)</Text>
            <Text style={{ fontSize: '18px', color: THEME.cyanGlow, fontWeight: 'bold' }}>{profile?.username}</Text>
          </InfoBox>
        </Col>
        <Col span={12}>
          <InfoBox>
            <Text style={{ fontSize: '10px', color: THEME.textSecondary }}>SYSTEM ROLE</Text>
            <Text style={{ fontSize: '18px', color: profile?.role === 'ADMIN' ? THEME.warning : 'white', fontWeight: 'bold' }}>
              <SafetyCertificateOutlined style={{ marginRight: '8px' }} />
              {profile?.role}
            </Text>
          </InfoBox>
        </Col>
        <Col span={12}>
          <InfoBox>
            <Text style={{ fontSize: '10px', color: THEME.textSecondary }}>CLEARANCE LEVEL</Text>
            <Text style={{ fontSize: '16px', color: 'white', fontFamily: 'monospace' }}>{profile?.clearance}</Text>
          </InfoBox>
        </Col>
        <Col span={12}>
          <InfoBox>
            <Text style={{ fontSize: '10px', color: THEME.textSecondary }}>SERVICE START DATE</Text>
            <Text style={{ fontSize: '16px', color: 'white', fontFamily: 'monospace' }}>{profile?.joinedDate}</Text>
          </InfoBox>
        </Col>
      </Row>
      
      <div style={{ marginTop: '24px' }}>
        <HudButton onClick={() => message.info('A decommissioning request has been submitted to High Command. [2]')}>
          REQUEST TRANSFER / DECOMMISSION
        </HudButton>
      </div>
    </div>
  );

  // --- ZAKŁADKA 2: PREFERENCJE HUD ---
  const tabPreferences = isPrefsLoading ? <Spin style={{ margin: '50px auto', display: 'block' }} /> : (
    <div style={{ maxWidth: '600px' }}>
      <Title level={4} style={{ color: 'white', marginTop: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>
        TERMINAL INTERFACE PREFERENCES
      </Title>
      <Text style={{ color: THEME.textSecondary, display: 'block', marginBottom: '24px' }}>
        Configure workstation terminal behavior. Settings are saved locally and synchronized with the server. [2]
      </Text>

      {/* Preferencja 1: Alerty Dźwiękowe */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
        <Space direction="vertical" size={0}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}><SoundOutlined /> AUDIO TELEMETRY ALERTS</Text>
          <Text style={{ color: THEME.textSecondary, fontSize: '12px' }}>Play vocal alerts during CAS and telemetry anomalies. [2]</Text>
        </Space>
        <Switch 
          checked={preferences?.audioAlertsEnabled} 
          onChange={(c) => handleTogglePreference('audioAlertsEnabled', c, 'AUDIO ALERTS')} 
        />
      </div>
      <Divider />

      {/* Preferencja 2: Powiadomienia Push */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
        <Space direction="vertical" size={0}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}><BellOutlined /> DESKTOP OVERRIDE NOTIFICATIONS</Text>
          <Text style={{ color: THEME.textSecondary, fontSize: '12px' }}>Allow the system to dispatch push notifications outside of the browser. [2]</Text>
        </Space>
        <Switch 
          checked={preferences?.desktopNotificationsEnabled} 
          onChange={(c) => handleTogglePreference('desktopNotificationsEnabled', c, 'PUSH NOTIFICATIONS')} 
        />
      </div>
      <Divider />

      {/* NOWA Preferencja 3: Pokazywanie Debris na mapie [1] */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
        <Space direction="vertical" size={0}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}><GlobalOutlined /> SHOW SPACE DEBRIS ON MAP</Text>
          <Text style={{ color: THEME.textSecondary, fontSize: '12px' }}>Render space debris and orbital fragments on the 3D map. [1]</Text>
        </Space>
        <Switch 
          checked={preferences?.showDebrisEnabled} 
          onChange={(c) => handleTogglePreference('showDebrisEnabled', c, 'SPACE DEBRIS DISPLAY')} 
        />
      </div>
    </div>
  );

  // --- ZAKŁADKA 3: BEZPIECZEŃSTWO ---
  const tabSecurity = (
    <div style={{ maxWidth: '400px' }}>
      <Title level={4} style={{ color: THEME.warning, marginTop: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>
        <LockOutlined /> SECURITY OVERRIDE
      </Title>
      <Text style={{ color: THEME.textSecondary, display: 'block', marginBottom: '32px' }}>
        Update your WISFCC security access codes. Ensure the new password complies with level-4 security protocols. [2]
      </Text>

      <Form form={form} layout="vertical" onFinish={handleSaveSecurity}>
        <Form.Item 
          name="oldPassword" 
          label="CURRENT ENCRYPTION KEY (PASSWORD)" 
          rules={[{ required: true, message: 'Current password is required!' }]}
        >
          <Input.Password placeholder="Enter current password" />
        </Form.Item>

        <Form.Item 
          name="newPassword" 
          label="NEW ENCRYPTION KEY" 
          rules={[
            { required: true, message: 'New password is required!' },
            { min: 8, message: 'Key must contain at least 8 characters!' }
          ]}
        >
          <Input.Password placeholder="Min. 8 characters" />
        </Form.Item>

        <Form.Item 
          name="confirmPassword" 
          label="CONFIRM NEW ENCRYPTION KEY" 
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Confirm new password!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Encryption keys do not match!'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="Repeat new password" />
        </Form.Item>

        <Form.Item style={{ marginTop: '32px' }}>
          <HudButton primary htmlType="submit" icon={<SaveOutlined />} loading={changePasswordMutation.isPending} style={{ width: '100%' }}>
            {changePasswordMutation.isPending ? 'ENCRYPTING...' : 'UPDATE SECURITY CLEARANCE'}
          </HudButton>
        </Form.Item>
      </Form>
    </div>
  );

  const tabItems = [
    { key: '1', label: <><UserOutlined /> ACCOUNT DOSSIER</>, children: tabAccount },
    { key: '2', label: <><SettingOutlined /> SYSTEM PREFERENCES</>, children: tabPreferences },
    { key: '3', label: <><LockOutlined /> SECURITY</>, children: tabSecurity },
  ];

  return (
    <PageContainer>
      <HudCard title="TERMINAL SETTINGS & DIAGNOSTICS">
        <Tabs defaultActiveKey="1" items={tabItems} animated={{ inkBar: true, tabPane: true }} />
      </HudCard>
    </PageContainer>
  );
};

export default SettingsView;