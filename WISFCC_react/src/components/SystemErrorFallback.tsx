
import { Result, Button, Typography } from 'antd';

const { Text } = Typography;


export const SystemErrorFallback = ({ error, resetErrorBoundary }: any) => {
  return (
    <div style={{ padding: '40px', backgroundColor: '#0A121F', borderRadius: '8px', border: '1px solid #FF4D4F' }}>
      <Result
        status="error"
        title={<span style={{ color: '#FF4D4F' }}>WISFCC Module Failure</span>}
        subTitle={<span style={{ color: '#7AABB1' }}>A critical system error occurred in this sector. The remaining system sectors remain operational.</span>}
        extra={[
          <Button type="primary" danger onClick={resetErrorBoundary} key="reset">
            Restart Module
          </Button>
        ]}
      >
        <div style={{ backgroundColor: 'rgba(255, 77, 79, 0.1)', padding: '15px', borderRadius: '4px', textAlign: 'left' }}>
          <Text type="danger" style={{ fontFamily: 'monospace' }}>
            {error.message}
          </Text>
        </div>
      </Result>
    </div>
  );
};