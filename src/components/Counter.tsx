import { useState, useRef, useCallback } from 'react';
import { Button, Space, Typography, Card, Statistic, Row, Col } from 'antd';
import { ReloadOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Counter: React.FC = () => {
  const [count, setCount] = useState(0);
  const [isTiming, setIsTiming] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // 点击计数
  const handleCount = useCallback(() => {
    setCount(prev => prev + 1);
    // 如果计时器未启动，自动开始计时
    if (!isTiming) {
      setIsTiming(true);
      startTimeRef.current = Date.now() - elapsedTime;
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 100);
    }
  }, [isTiming, elapsedTime]);

  // 重置
  const handleReset = useCallback(() => {
    setCount(0);
    setElapsedTime(0);
    setIsTiming(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 开始/暂停计时
  const handleToggleTiming = useCallback(() => {
    if (isTiming) {
      // 暂停
      setIsTiming(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else {
      // 开始
      setIsTiming(true);
      startTimeRef.current = Date.now() - elapsedTime;
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 100);
    }
  }, [isTiming, elapsedTime]);

  // 格式化时间显示
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
            <Title level={4}>计数器</Title>

            {/* 时间显示 */}
            <Statistic
              title="计时"
              value={formatTime(elapsedTime)}
              valueStyle={{ fontSize: '36px', fontFamily: 'monospace' }}
            />

            {/* 计数显示 */}
            <Statistic
              title="计数"
              value={count}
              valueStyle={{ fontSize: '72px', color: '#1890ff', fontWeight: 'bold' }}
            />

            {/* 大计数按钮 */}
            <Button
              type="primary"
              size="large"
              onClick={handleCount}
              style={{
                width: '200px',
                height: '200px',
                fontSize: '48px',
                borderRadius: '50%',
                marginTop: 24,
                marginBottom: 24
              }}
            >
              +1
            </Button>

            {/* 控制按钮 */}
            <Row gutter={16} justify="center">
              <Col>
                <Button
                  icon={isTiming ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={handleToggleTiming}
                  size="large"
                >
                  {isTiming ? '暂停计时' : '开始计时'}
                </Button>
              </Col>
              <Col>
                <Button
                  danger
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  size="large"
                >
                  重置
                </Button>
              </Col>
            </Row>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default Counter;
