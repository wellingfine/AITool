import { useState, lazy, Suspense, useCallback } from 'react';
import { Layout, Menu, theme, ConfigProvider, Spin } from 'antd';
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

// 设置页保持同步加载
import Settings from './components/Settings';

// 其他组件使用懒加载
const TimestampConverter = lazy(() => import('./components/TimestampConverter'));
const Base64Converter = lazy(() => import('./components/Base64Converter'));
const HashCalculator = lazy(() => import('./components/HashCalculator'));
const ImageBase64 = lazy(() => import('./components/ImageBase64'));
const WorkTracker = lazy(() => import('./components/WorkTracker'));
const TextCompare = lazy(() => import('./components/TextCompare'));
const LineDedupe = lazy(() => import('./components/LineDedupe'));
const BMICalculator = lazy(() => import('./components/BMICalculator'));
const Calendar = lazy(() => import('./components/Calendar'));
const Calculator = lazy(() => import('./components/Calculator'));

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

// 加载中组件
const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
    <Spin size="large" />
  </div>
);

function App() {
  const [selectedKey, setSelectedKey] = useState<string[]>([]);
  // 记录已经加载过的组件，用于懒加载
  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(new Set());
  const {
    token: { colorBgLayout, colorBgElevated, colorBorder, colorText, colorTextSecondary },
  } = theme.useToken();

  const currentKey = selectedKey[0];

  // 处理菜单选择，记录已加载的组件
  const handleSelect = useCallback((e: { selectedKeys: string[] }) => {
    const key = e.selectedKeys[0];
    setSelectedKey(e.selectedKeys);
    if (key && key !== 'settings') {
      setLoadedKeys(prev => {
        if (prev.has(key)) return prev;
        const newSet = new Set(prev);
        newSet.add(key);
        return newSet;
      });
    }
  }, []);

  // 判断组件是否应该被渲染（已加载过或当前选中）
  const shouldRender = useCallback((key: string) => {
    return loadedKeys.has(key);
  }, [loadedKeys]);

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
              onSelect={handleSelect}
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
              onSelect={handleSelect}
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
            {/* 时间戳转换 - 懒加载 */}
            {shouldRender('timestamp') && (
              <div style={{ display: currentKey === 'timestamp' ? 'block' : 'none' }}>
                <Suspense fallback={<LoadingFallback />}>
                  <TimestampConverter />
                </Suspense>
              </div>
            )}
            {/* Base64 转换 - 懒加载 */}
            {shouldRender('base64') && (
              <div style={{ display: currentKey === 'base64' ? 'block' : 'none' }}>
                <Suspense fallback={<LoadingFallback />}>
                  <Base64Converter />
                </Suspense>
              </div>
            )}
            {/* 文本对比 - 懒加载 */}
            {shouldRender('textCompare') && (
              <div style={{ display: currentKey === 'textCompare' ? 'block' : 'none' }}>
                <Suspense fallback={<LoadingFallback />}>
                  <TextCompare />
                </Suspense>
              </div>
            )}
            {/* 行去重 - 懒加载 */}
            {shouldRender('lineDedupe') && (
              <div style={{ display: currentKey === 'lineDedupe' ? 'block' : 'none' }}>
                <Suspense fallback={<LoadingFallback />}>
                  <LineDedupe />
                </Suspense>
              </div>
            )}
            {/* 日历 - 懒加载 */}
            {shouldRender('calendar') && (
              <div style={{ display: currentKey === 'calendar' ? 'block' : 'none' }}>
                <Suspense fallback={<LoadingFallback />}>
                  <Calendar />
                </Suspense>
              </div>
            )}
            {/* Hash 计算 - 懒加载 */}
            {shouldRender('hash') && (
              <div style={{ display: currentKey === 'hash' ? 'block' : 'none' }}>
                <Suspense fallback={<LoadingFallback />}>
                  <HashCalculator />
                </Suspense>
              </div>
            )}
            {/* 图片 Base64 - 懒加载 */}
            {shouldRender('imageBase64') && (
              <div style={{ display: currentKey === 'imageBase64' ? 'block' : 'none' }}>
                <Suspense fallback={<LoadingFallback />}>
                  <ImageBase64 />
                </Suspense>
              </div>
            )}
            {/* 任务跟进 - 懒加载 */}
            {shouldRender('workTracker') && (
              <div style={{ display: currentKey === 'workTracker' ? 'block' : 'none' }}>
                <Suspense fallback={<LoadingFallback />}>
                  <WorkTracker />
                </Suspense>
              </div>
            )}
            {/* 设置 - 保持同步加载 */}
            <div style={{ display: currentKey === 'settings' ? 'block' : 'none' }}>
              <Settings />
            </div>
            {/* BMI 计算 - 懒加载 */}
            {shouldRender('bmi') && (
              <div style={{ display: currentKey === 'bmi' ? 'block' : 'none' }}>
                <Suspense fallback={<LoadingFallback />}>
                  <BMICalculator />
                </Suspense>
              </div>
            )}
            {/* 计算器 - 懒加载 */}
            {shouldRender('calculator') && (
              <div style={{ display: currentKey === 'calculator' ? 'block' : 'none' }}>
                <Suspense fallback={<LoadingFallback />}>
                  <Calculator isActive={currentKey === 'calculator'} />
                </Suspense>
              </div>
            )}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
