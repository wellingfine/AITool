import { useState, lazy, Suspense, useCallback, useEffect, useRef, useMemo } from 'react';
import { Layout, Menu, theme, ConfigProvider, Spin, App as AntApp } from 'antd';
import { nativeAPI } from './services/nativeAPI';

import { getTools, getCategories, getToolById, type ToolConfig } from './services/appConfig';
import { getIconByName } from './services/iconMap';

// 设置页和关于页保持同步加载
import Settings from './components/Settings';
import About from './components/About';

const { Header, Content, Sider } = Layout;

// 懒加载组件映射表
const lazyComponentMap: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  TimestampConverter: lazy(() => import('./components/TimestampConverter')),
  Base64Converter: lazy(() => import('./components/Base64Converter')),
  HashCalculator: lazy(() => import('./components/HashCalculator')),
  Counter: lazy(() => import('./components/Counter')),
  ImageBase64: lazy(() => import('./components/ImageBase64')),
  UnicodeConverter: lazy(() => import('./components/UnicodeConverter')),
  WorkTracker: lazy(() => import('./components/WorkTracker')),
  TextCompare: lazy(() => import('./components/TextCompare')),
  LineDedupe: lazy(() => import('./components/LineDedupe')),
  BMICalculator: lazy(() => import('./components/BMICalculator')),
  Calendar: lazy(() => import('./components/Calendar')),
  Calculator: lazy(() => import('./components/Calculator')),
  RegexTester: lazy(() => import('./components/RegexTester')),
  ReactionTest: lazy(() => import('./components/ReactionTest')),
  GuitarTuner: lazy(() => import('./components/GuitarTuner')),
  SplitBill: lazy(() => import('./components/SplitBill')),
  DayCountdown: lazy(() => import('./components/DayCountdown')),
  Metronome: lazy(() => import('./components/Metronome')),
};

// 同步加载组件映射表
const syncComponentMap: Record<string, React.ComponentType<any>> = {
  Settings,
  About,
};

// 菜单项类型
type MenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  children?: MenuItem[];
};

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
  // 侧边栏折叠状态
  const [collapsed, setCollapsed] = useState(false);
  // 是否是移动端
  const [isMobile, setIsMobile] = useState(false);
  // 是否记住上次的选项
  const rememberLastToolRef = useRef<boolean>(false);
  const {
    token: { colorBgLayout, colorBgElevated, colorBorder, colorText, colorTextSecondary },
  } = theme.useToken();

  // 获取当前选中的工具配置
  const currentTool = useMemo(() => {
    const key = selectedKey[0];
    if (!key) return null;
    return getToolById(key);
  }, [selectedKey]);

  // 生成菜单项
  const mainMenuItems = useMemo((): MenuItem[] => {
    const categories = getCategories();
    return categories.map(category => {
      const CategoryIcon = getIconByName(category.icon);
      const tools = getTools().filter(tool => tool.category === category.id);
      return {
        key: category.id,
        icon: CategoryIcon ? <CategoryIcon /> : null,
        label: category.name,
        children: tools.map(tool => {
          const ToolIcon = getIconByName(tool.icon);
          return {
            key: tool.id,
            icon: ToolIcon ? <ToolIcon /> : null,
            label: tool.name,
          };
        }),
      };
    });
  }, []);

  // 检测屏幕尺寸，判断是否移动端
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setCollapsed(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 监听手机后退键，用于关闭菜单
  useEffect(() => {
    if (!isMobile) return;

    const handleBackButton = (_e: PopStateEvent) => {
      if (!collapsed) {
        setCollapsed(true);
      }
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [isMobile, collapsed]);

  // 菜单打开时添加历史记录，关闭时移除
  useEffect(() => {
    if (!isMobile) return;

    if (!collapsed) {
      window.history.pushState({ menu: 'open' }, '');
    }
  }, [isMobile, collapsed]);

  // 初始化：加载设置并跳转到上次使用的工具
  useEffect(() => {
    const init = async () => {
      try {
        const remember = await nativeAPI.config.getRememberLastTool();
        rememberLastToolRef.current = remember;
        if (remember) {
          const lastTool = await nativeAPI.config.getLastTool();
          if (lastTool) {
            const tool = getToolById(lastTool);
            if (tool) {
              setSelectedKey([lastTool]);
              setLoadedKeys(prev => {
                if (prev.has(lastTool)) return prev;
                const newSet = new Set(prev);
                newSet.add(lastTool);
                return newSet;
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to load remember last tool setting:', error);
      }
    };
    init();
  }, []);

  const currentKey = selectedKey[0];

  // 处理菜单选择，记录已加载的组件
  const handleSelect = useCallback((e: { selectedKeys: string[] }) => {
    const key = e.selectedKeys[0];
    setSelectedKey(e.selectedKeys);
    if (key) {
      setLoadedKeys(prev => {
        if (prev.has(key)) return prev;
        const newSet = new Set(prev);
        newSet.add(key);
        return newSet;
      });
      // 如果开启了记住上次的选项，保存当前工具
      if (rememberLastToolRef.current) {
        nativeAPI.config.setLastTool(key).catch(console.error);
      }
    }
    // 移动端选择工具后自动关闭菜单
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  // 判断组件是否应该被渲染（已加载过或当前选中）
  const shouldRender = useCallback((key: string) => {
    return loadedKeys.has(key);
  }, [loadedKeys]);

  // 渲染工具组件
  const renderToolComponent = (tool: ToolConfig) => {
    // 优先检查同步组件
    const SyncComponent = syncComponentMap[tool.component];
    if (SyncComponent) {
      return (
        <div style={{ display: currentKey === tool.id ? 'block' : 'none' }}>
          <SyncComponent />
        </div>
      );
    }

    // 检查懒加载组件
    const LazyComponent = lazyComponentMap[tool.component];
    if (!LazyComponent) return null;

    return (
      <div style={{ display: currentKey === tool.id ? 'block' : 'none' }}>
        <Suspense fallback={<LoadingFallback />}>
          <LazyComponent />
        </Suspense>
      </div>
    );
  };

  // 获取页面标题
  const getPageTitle = () => {
    if (currentTool) return currentTool.name;
    return 'AI工具箱1';
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <AntApp>
        <Layout style={{ minHeight: '100vh', background: colorBgLayout }}>
        <Sider
          width={isMobile ? '100%' : 200}
          collapsed={!isMobile && collapsed}
          collapsedWidth={isMobile ? 0 : 80}
          trigger={null}
          style={{
            background: '#001529',
            color: '#fff',
            position: 'fixed',
            height: isMobile ? 'calc(100vh - env(safe-area-inset-top))' : '100vh',
            paddingTop: isMobile ? 'env(safe-area-inset-top)' : 0,
            zIndex: 100,
            display: isMobile && collapsed ? 'none' : 'block'
          }}
        >
          <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'space-between' : 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            borderBottom: '1px solid #1f394c',
            color: '#fff',
            padding: isMobile ? '0 16px' : '0'
          }}>
            {isMobile && <span style={{ width: 24 }} />}
            <span>AITool</span>
            {isMobile && (
              <span
                style={{
                  fontSize: '20px',
                  cursor: 'pointer',
                  width: 24,
                  textAlign: 'center'
                }}
                onClick={() => setCollapsed(true)}
              >
                ✕
              </span>
            )}
          </div>
          <div style={{
            height: isMobile ? 'calc(100vh - 64px - env(safe-area-inset-top))' : 'calc(100vh - 64px)',
            overflowY: 'auto'
          }}>
            <Menu
              mode="inline"
              theme="dark"
              style={{ borderRight: 0 }}
              selectedKeys={selectedKey}
              onSelect={handleSelect}
              items={mainMenuItems}
            />
          </div>

        </Sider>
        {/* 移动端遮罩层 */}
        {isMobile && !collapsed && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 99
            }}
            onClick={() => setCollapsed(true)}
          />
        )}
        <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 200) }}>
          <Header
            style={{
              padding: isMobile ? 'env(safe-area-inset-top) 16px 0 16px' : '0 24px',
              paddingLeft: isMobile ? 16 : 24,
              background: colorBgElevated,
              borderBottom: `1px solid ${colorBorder}`,
              display: 'flex',
              alignItems: 'center',
              position: 'fixed',
              top: 0,
              left: isMobile ? 0 : (collapsed ? 80 : 200),
              right: 0,
              zIndex: 9,
              height: isMobile ? 'calc(64px + env(safe-area-inset-top))' : 64
            }}
          >
            {/* 移动端菜单按钮 */}
            {isMobile && (
              <span
                style={{
                  fontSize: '18px',
                  marginRight: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => setCollapsed(!collapsed)}
              >
                ☰
              </span>
            )}
            <span style={{ fontSize: '16px', fontWeight: 500, color: colorText }}>
              {getPageTitle()}
            </span>
          </Header>
          <Content style={{
            padding: isMobile ? '0 0 16px 0' : '0',
            paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : 0,
            marginTop: isMobile ? 'calc(64px + env(safe-area-inset-top))' : 64,
            minHeight: isMobile ? 'calc(100vh - 64px - env(safe-area-inset-top))' : 'calc(100vh - 64px)',
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

            {/* 动态渲染工具组件 */}
            {getTools().map(tool => shouldRender(tool.id) && renderToolComponent(tool))}
          </Content>
        </Layout>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
