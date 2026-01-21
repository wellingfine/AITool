import { useState } from 'react';
import { Layout, Menu, theme, ConfigProvider } from 'antd';
import {
  AppstoreOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import TimestampConverter from './components/TimestampConverter';

const { Header, Content, Sider } = Layout;

// 菜单项类型
type MenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  children?: MenuItem[];
};

const menuItems: MenuItem[] = [
  {
    key: 'daily',
    icon: <AppstoreOutlined />,
    label: '日常',
    children: [
      {
        key: 'timestamp',
        icon: <ClockCircleOutlined />,
        label: '时间戳转换'
      }
    ]
  }
];

function App() {
  const [selectedKey, setSelectedKey] = useState<string[]>([]);
  const {
    token: { colorBgContainer, borderRadiusLG, colorBgLayout, colorBgElevated, colorBorder, colorText, colorTextSecondary },
  } = theme.useToken();

  const renderContent = () => {
    const key = selectedKey[0];

    switch (key) {
      case 'timestamp':
        return <TimestampConverter key="timestamp" />;
      default:
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontSize: '24px',
            color: colorTextSecondary
          }}>
            欢迎使用
          </div>
        );
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <Layout style={{ minHeight: '100vh', background: colorBgLayout }}>
        <Sider
          width={200}
          style={{
            background: '#001529',
            color: '#fff',
            position: 'fixed',
            height: '100vh',
            zIndex: 10
          }}
        >
          <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            borderBottom: '1px solid #1f394c',
            color: '#fff'
          }}>
            AITool
          </div>
          <Menu
            mode="inline"
            theme="dark"
            style={{ height: 'calc(100vh - 64px)', borderRight: 0 }}
            selectedKeys={selectedKey}
            onSelect={(e) => setSelectedKey(e.selectedKeys)}
            items={menuItems}
          />
        </Sider>
        <Layout style={{ marginLeft: 200 }}>
          <Header
            style={{
              padding: '0 24px',
              background: colorBgElevated,
              borderBottom: `1px solid ${colorBorder}`,
              display: 'flex',
              alignItems: 'center',
              position: 'fixed',
              top: 0,
              left: 200,
              right: 0,
              zIndex: 9,
              height: 64
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 500, color: colorText }}>
              {selectedKey[0] === 'timestamp' ? '时间戳转换' : 'AI工具箱'}
            </span>
          </Header>
          <Content style={{
            padding: '24px',
            marginTop: 64,
            minHeight: 'calc(100vh - 64px)',
            background: colorBgLayout
          }}>
            <div
              style={{
                padding: 24,
                minHeight: 360,
                background: colorBgElevated,
                borderRadius: borderRadiusLG,
              }}
            >
              {renderContent()}
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
