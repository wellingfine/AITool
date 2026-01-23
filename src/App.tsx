import { useState } from 'react';
import { Layout, Menu, theme, ConfigProvider } from 'antd';
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  LockOutlined,
  NumberOutlined,
  PictureOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import TimestampConverter from './components/TimestampConverter';
import Base64Converter from './components/Base64Converter';
import HashCalculator from './components/HashCalculator';
import ImageBase64 from './components/ImageBase64';
import WorkTracker from './components/WorkTracker';

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
      },
      {
        key: 'base64',
        icon: <FileTextOutlined />,
        label: 'Base64 转换'
      }
    ]
  },
  {
    key: 'encrypt',
    icon: <LockOutlined />,
    label: '加密',
    children: [
      {
        key: 'hash',
        icon: <NumberOutlined />,
        label: 'Hash 计算'
      },
      {
        key: 'imageBase64',
        icon: <PictureOutlined />,
        label: '图片 Base64'
      }
    ]
  },
  {
    key: 'work',
    icon: <TeamOutlined />,
    label: '工作',
    children: [
      {
        key: 'workTracker',
        icon: <ThunderboltOutlined />,
        label: '工作跟进'
      }
    ]
  }
];

function App() {
  const [selectedKey, setSelectedKey] = useState<string[]>([]);
  const {
    token: { borderRadiusLG, colorBgLayout, colorBgElevated, colorBorder, colorText, colorTextSecondary },
  } = theme.useToken();

  const currentKey = selectedKey[0];

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
              {selectedKey[0] === 'timestamp' ? '时间戳转换' : selectedKey[0] === 'base64' ? 'Base64 转换' : selectedKey[0] === 'hash' ? 'Hash 计算' : selectedKey[0] === 'imageBase64' ? '图片 Base64' : selectedKey[0] === 'workTracker' ? '工作跟进' : 'AI工具箱'}
            </span>
          </Header>
          <Content style={{
            padding: '0',
            marginTop: 64,
            minHeight: 'calc(100vh - 64px)',
            background: colorBgLayout
          }}>
            {/* 欢迎页面 - 无选中时显示 */}
            <div style={{
              display: !currentKey ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: '24px',
              color: colorTextSecondary
            }}>
              欢迎使用
            </div>
            {/* 时间戳转换 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'timestamp' ? 'block' : 'none' }}>
              <TimestampConverter />
            </div>
            {/* Base64 转换 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'base64' ? 'block' : 'none' }}>
              <Base64Converter />
            </div>
            {/* Hash 计算 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'hash' ? 'block' : 'none' }}>
              <HashCalculator />
            </div>
            {/* 图片 Base64 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'imageBase64' ? 'block' : 'none' }}>
              <ImageBase64 />
            </div>
            {/* 工作跟进 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'workTracker' ? 'block' : 'none' }}>
              <WorkTracker />
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
