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
  SettingOutlined,
  SwapOutlined,
  ToolOutlined,
  HeartOutlined,
  DeleteOutlined,
  CalendarOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import TimestampConverter from './components/TimestampConverter';
import Base64Converter from './components/Base64Converter';
import HashCalculator from './components/HashCalculator';
import ImageBase64 from './components/ImageBase64';
import WorkTracker from './components/WorkTracker';
import Settings from './components/Settings';
import TextCompare from './components/TextCompare';
import LineDedupe from './components/LineDedupe';
import BMICalculator from './components/BMICalculator';
import Calendar from './components/Calendar';
import Calculator from './components/Calculator';

const { Header, Content, Sider } = Layout;

// 菜单项类型
type MenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  children?: MenuItem[];
};

// 主菜单项（不包括设置）
const mainMenuItems: MenuItem[] = [
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
      },
      {
        key: 'textCompare',
        icon: <SwapOutlined />,
        label: '文本对比'
      },
      {
        key: 'lineDedupe',
        icon: <DeleteOutlined />,
        label: '行去重'
      },
      {
        key: 'calendar',
        icon: <CalendarOutlined />,
        label: '日历'
      },
      {
        key: 'calculator',
        icon: <CalculatorOutlined />,
        label: '计算器'
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
        label: '任务跟进'
      }
    ]
  },
  {
    key: 'other',
    icon: <ToolOutlined />,
    label: '其它',
    children: [
      {
        key: 'bmi',
        icon: <HeartOutlined />,
        label: 'BMI 计算'
      }
    ]
  }
];

function App() {
  const [selectedKey, setSelectedKey] = useState<string[]>([]);
  const {
    token: { colorBgLayout, colorBgElevated, colorBorder, colorText, colorTextSecondary },
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
          <div style={{ height: 'calc(100vh - 64px - 60px)', overflowY: 'auto' }}>
            <Menu
              mode="inline"
              theme="dark"
              style={{ borderRight: 0 }}
              selectedKeys={selectedKey}
              onSelect={(e) => setSelectedKey(e.selectedKeys)}
              items={mainMenuItems}
            />
          </div>
          <div style={{
            height: 60,
            borderTop: '1px solid #1f394c',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px'
          }}>
            <Menu
              mode="inline"
              theme="dark"
              style={{ borderRight: 0, flex: 1 }}
              selectedKeys={selectedKey}
              onSelect={(e) => setSelectedKey(e.selectedKeys)}
              items={[{
                key: 'settings',
                icon: <SettingOutlined />,
                label: '设置'
              }]}
            />
          </div>
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
              {selectedKey[0] === 'timestamp' ? '时间戳转换' : selectedKey[0] === 'base64' ? 'Base64 转换' : selectedKey[0] === 'textCompare' ? '文本对比' : selectedKey[0] === 'lineDedupe' ? '行去重' : selectedKey[0] === 'calendar' ? '日历' : selectedKey[0] === 'calculator' ? '计算器' : selectedKey[0] === 'hash' ? 'Hash 计算' : selectedKey[0] === 'imageBase64' ? '图片 Base64' : selectedKey[0] === 'workTracker' ? '任务跟进' : selectedKey[0] === 'bmi' ? 'BMI 计算' : selectedKey[0] === 'settings' ? '设置' : 'AI工具箱'}
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
            {/* 文本对比 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'textCompare' ? 'block' : 'none' }}>
              <TextCompare />
            </div>
            {/* 行去重 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'lineDedupe' ? 'block' : 'none' }}>
              <LineDedupe />
            </div>
            {/* 日历 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'calendar' ? 'block' : 'none' }}>
              <Calendar />
            </div>
            {/* Hash 计算 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'hash' ? 'block' : 'none' }}>
              <HashCalculator />
            </div>
            {/* 图片 Base64 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'imageBase64' ? 'block' : 'none' }}>
              <ImageBase64 />
            </div>
            {/* 任务跟进 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'workTracker' ? 'block' : 'none' }}>
              <WorkTracker />
            </div>
            {/* 设置 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'settings' ? 'block' : 'none' }}>
              <Settings />
            </div>
            {/* BMI 计算 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'bmi' ? 'block' : 'none' }}>
              <BMICalculator />
            </div>
            {/* 计算器 - 通过 display 控制显示/隐藏 */}
            <div style={{ display: currentKey === 'calculator' ? 'block' : 'none' }}>
              <Calculator isActive={currentKey === 'calculator'} />
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
