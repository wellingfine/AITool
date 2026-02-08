import { useState, lazy, Suspense, useCallback, useEffect, useRef, useMemo } from 'react';
import { Layout, Menu, theme, ConfigProvider, Spin, App as AntApp } from 'antd';
import { nativeAPI } from './services/nativeAPI';
import './App.css';

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
  MortgageCalculator: lazy(() => import('./components/MortgageCalculator')),
  QRCodeScanner: lazy(() => import('./components/QRCodeScanner')),
  QRCodeGenerator: lazy(() => import('./components/QRCodeGenerator')),
  MindMap: lazy(() => import('./components/MindMap')),
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
  <div className="loading-fallback">
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

  // 提取样式配置，提高可读性
  const layoutStyles = useMemo(() => {
    if (isMobile) {
      return {
        sider: { width: '100%', collapsedWidth: 0 },
        siderMenu: { width: '100%' },
        siderHeader: { justifyContent: 'space-between', padding: '0 16px' },
        mainLayout: { marginLeft: 0 },
        header: { left: 0 },
        content: { left: 0 },
      };
    }

    const sideOffset = collapsed ? 0 : 200;

    return {
      sider: { width: 200, collapsedWidth: 0 },
      siderMenu: { width: sideOffset },
      siderHeader: { justifyContent: 'center', padding: '0' },
      mainLayout: { marginLeft: sideOffset },
      header: { left: sideOffset },
      content: { left: sideOffset },
    };
  }, [isMobile, collapsed]);

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
        <div key={tool.id} className="tool-component" style={{ display: currentKey === tool.id ? 'block' : 'none' }}>
          <SyncComponent />
        </div>
      );
    }

    // 检查懒加载组件
    const LazyComponent = lazyComponentMap[tool.component];
    if (!LazyComponent) return null;

    return (
      <div key={tool.id} className="tool-component" style={{ display: currentKey === tool.id ? 'block' : 'none' }}>
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
        <Layout style={{ background: colorBgLayout }}>
          <Sider
            className='sider'
            width={layoutStyles.sider.width}
            collapsed={!isMobile && collapsed}
            collapsedWidth={layoutStyles.sider.collapsedWidth}
            trigger={null}
          style={{
            display: isMobile && collapsed ? 'none' : 'block'
          }}
          >
            <div
              className="sider-header"
              style={{
                justifyContent: layoutStyles.siderHeader.justifyContent,
                padding: layoutStyles.siderHeader.padding
              }}
            >
              {isMobile && <span style={{ width: 24 }} />}
              <span>AITool</span>
              {isMobile && (
                <span className="mobile-close-btn" onClick={() => setCollapsed(true)}>
                  ✕
                </span>
              )}
            </div>
            <div
              className="sider-menu-container"
              style={{ width: layoutStyles.siderMenu.width }}
            >
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
            <div className="mobile-overlay" onClick={() => setCollapsed(true)} />
          )}
          <Layout>
          <Header
            className="app-header"
            style={{
              background: colorBgElevated,
              borderBottom: `1px solid ${colorBorder}`,
              left: layoutStyles.header.left
            }}
          >
              {/* 移动端菜单按钮 */}
              {isMobile && (
                <span className="mobile-menu-btn" onClick={() => setCollapsed(!collapsed)}>
                  ☰
                </span>
              )}
              <span className="page-title" style={{ color: colorText }}>
                {getPageTitle()}
              </span>
            </Header>
            <Content
              className="app-content"
              style={{
                padding: isMobile ? '0 0 16px 0' : '0',
                left: layoutStyles.content.left,
                background: colorBgLayout
              }}
            >
              {/* 欢迎页面 - 无选中时显示 */}
              <div
                className="welcome-page"
                style={{
                  display: !currentKey ? 'flex' : 'none',
                  color: colorTextSecondary
                }}
              >
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
