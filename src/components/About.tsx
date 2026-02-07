import { Card, Typography, Space, Tag } from 'antd';
import {
  AppstoreOutlined,
  ToolOutlined,
  LockOutlined,
  TeamOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import Block from '../lib/Block';
import Page from '../lib/Page';
import packageJson from '../../package.json';

const { Title, Text, Paragraph } = Typography;

const About: React.FC = () => {
  const version = packageJson.version;

  return (
    <Page maxWidth={800}>
      {/* 标题区域 */}
      <Block>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '36px',
              color: '#fff',
            }}
          >
            AI
          </div>
          <Title level={2} style={{ margin: '0 0 8px' }}>
            AITool
          </Title>
          <Text type="secondary">实用工具箱，让生活更便捷</Text>
          <div style={{ marginTop: 12 }}>
            <Tag color="blue">v{version}</Tag>
          </div>
        </div>
      </Block>

      {/* 功能介绍 */}
      <Block>
        <Title level={4}>功能介绍</Title>
        <Paragraph>
          AITool 是一款集合多种实用工具的应用程序，旨在为用户提供便捷的日常生活和工作辅助功能。
        </Paragraph>
        <Space orientation="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
          <Card size="small">
            <Space>
              <AppstoreOutlined style={{ color: '#1890ff', fontSize: 20 }} />
              <div>
                <Text strong>日常工具</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  时间戳转换、Base64编解码、文本对比、正则表达式等
                </Text>
              </div>
            </Space>
          </Card>
          <Card size="small">
            <Space>
              <LockOutlined style={{ color: '#52c41a', fontSize: 20 }} />
              <div>
                <Text strong>加密工具</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  MD5/SHA哈希计算、图片Base64转换、Unicode编解码
                </Text>
              </div>
            </Space>
          </Card>
          <Card size="small">
            <Space>
              <TeamOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
              <div>
                <Text strong>工作辅助</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  任务跟进管理，记录工作事项和待办任务
                </Text>
              </div>
            </Space>
          </Card>
          <Card size="small">
            <Space>
              <ToolOutlined style={{ color: '#722ed1', fontSize: 20 }} />
              <div>
                <Text strong>其他工具</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  BMI计算、反应测试、吉他调音、AA账单分摊、天倒计时
                </Text>
              </div>
            </Space>
          </Card>
        </Space>
      </Block>

      {/* 特点 */}
      <Block>
        <Title level={4}>产品特点</Title>
        <ul style={{ color: 'var(--ant-color-text-secondary)', paddingLeft: 20 }}>
          <li>简洁直观的用户界面，快速上手</li>
          <li>本地数据存储，保护隐私安全</li>
          <li>支持桌面端和移动端（Android）</li>
          <li>配置化设计，易于扩展新工具</li>
          <li>响应式布局，适配各种屏幕尺寸</li>
        </ul>
      </Block>

      {/* 技术栈 */}
      <Block>
        <Title level={4}>
          <CodeOutlined style={{ marginRight: 8 }} />
          技术栈
        </Title>
        <Space wrap>
          <Tag>React 19</Tag>
          <Tag>TypeScript</Tag>
          <Tag>Ant Design</Tag>
          <Tag>Vite</Tag>
          <Tag>Tauri 2</Tag>
          <Tag>Rust</Tag>
        </Space>
      </Block>

      {/* 版权信息 */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Text type="secondary">
          © {new Date().getFullYear()} AITool. All rights reserved.
        </Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>
          版本号：v{version}
        </Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          使用 React + Tauri 构建
        </Text>
      </div>
    </Page>
  );
};

export default About;
