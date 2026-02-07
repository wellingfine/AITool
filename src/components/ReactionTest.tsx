import React, { useState, useRef, useCallback, useEffect } from "react";
import { theme, Statistic } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import Block from '../lib/Block';
import Page from '../lib/Page';

type GameState = 'idle' | 'waiting' | 'ready' | 'finished' | 'falseStart';

// ========== DEBUG 开关 ==========
// 设置为 true 可显示等待倒计时调试信息
const DEBUG_MODE = false;
// ================================

const ReactionTest: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [debugCountdown, setDebugCountdown] = useState<number>(0);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debugTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetTimeRef = useRef<number>(0);
  
  const { token } = theme.useToken();

  // 检测是否移动端
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // 清除计时器
  const clearTimerInterval = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (debugTimerRef.current) {
      clearInterval(debugTimerRef.current);
      debugTimerRef.current = null;
    }
  }, []);

  // 启动 debug 倒计时
  const startDebugCountdown = useCallback((delay: number) => {
    if (!DEBUG_MODE) return;
    targetTimeRef.current = performance.now() + delay;
    setDebugCountdown(delay);
    debugTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round(targetTimeRef.current - performance.now()));
      setDebugCountdown(remaining);
    }, 10);
  }, []);

  // 启动计时显示
  const startElapsedTimer = useCallback(() => {
    clearTimerInterval();
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      setElapsedTime(elapsed);
    }, 10);
  }, [clearTimerInterval]);

  const startGame = useCallback(() => {
    setGameState('waiting');
    clearTimerInterval();
    setElapsedTime(0);
    setDebugCountdown(0);
    
    // 随机 5-10 秒
    const delay = Math.floor(Math.random() * 5000) + 5000;
    
    // 启动 debug 倒计时
    startDebugCountdown(delay);
    
    timeoutRef.current = setTimeout(() => {
      setGameState('ready');
      startTimeRef.current = performance.now();
      startElapsedTimer();
    }, delay);
  }, [clearTimerInterval, startElapsedTimer, startDebugCountdown]);

  const handleClick = useCallback(() => {
    if (gameState === 'idle' || gameState === 'finished' || gameState === 'falseStart') {
      startGame();
    } else if (gameState === 'waiting') {
      // 过早点击
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setGameState('falseStart');
    } else if (gameState === 'ready') {
      // 记录反应时间
      clearTimerInterval();
      const endTime = performance.now();
      const time = Math.round(endTime - startTimeRef.current);
      setReactionTime(time);
      setElapsedTime(time);
      setHistory(prev => [...prev.slice(-9), time]);
      setGameState('finished');
    }
  }, [gameState, startGame, clearTimerInterval]);

  const resetGame = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    clearTimerInterval();
    setGameState('idle');
    setReactionTime(null);
    setElapsedTime(0);
    setDebugCountdown(0);
  }, [clearTimerInterval]);

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只响应空格键或回车键
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClick]);

  // 移动端 touchstart 事件
  useEffect(() => {
    if (!isMobile) return;
    
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleClick();
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => container.removeEventListener('touchstart', handleTouchStart);
  }, [handleClick, isMobile]);

  // 清理定时器
  useEffect(() => {
    return () => {
      clearTimerInterval();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [clearTimerInterval]);

  const getButtonConfig = () => {
    switch (gameState) {
      case 'idle':
        return {
          text: '点击开始',
          color: token.colorPrimary,
          description: isMobile ? '准备好测试你的反应速度了吗？' : '准备好测试你的反应速度了吗？（也可按空格键）'
        };
      case 'waiting':
        return {
          text: '等待绿色...',
          color: '#faad14',
          description: '等待按钮变绿，不要提前点击！'
        };
      case 'ready':
        return {
          text: `${elapsedTime} ms`,
          color: '#52c41a',
          description: '快点击！'
        };
      case 'finished':
        return {
          text: `${reactionTime} ms`,
          color: '#52c41a',
          description: isMobile ? '再次点击开始新一轮测试' : '再次点击或按空格键开始新一轮测试'
        };
      case 'falseStart':
        return {
          text: '过早点击！',
          color: '#f5222d',
          description: '你点击得太早了，请重新开始'
        };
    }
  };

  const config = getButtonConfig();
  const average = history.length > 0 
    ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) 
    : null;
  const best = history.length > 0 ? Math.min(...history) : null;

  return (
    <Page maxWidth={600}>
        <Block>
          {/* 主按钮区域 */}
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div
            ref={containerRef}
            onClick={!isMobile ? handleClick : undefined}
            style={{
              width: 280,
              height: 200,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: (gameState === 'finished' || gameState === 'ready') ? 48 : 28,
              fontWeight: 'bold',
              backgroundColor: config.color,
              color: '#fff',
              borderRadius: 8,
              cursor: 'pointer',
              userSelect: 'none',
              boxShadow: gameState === 'ready' 
                ? `0 0 30px ${config.color}80` 
                : '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'background-color 0.1s ease, box-shadow 0.1s ease',
            }}
          >
            {config.text}
          </div>
          
          <div style={{ 
            marginTop: 24, 
            fontSize: 16, 
            color: gameState === 'falseStart' ? '#f5222d' : token.colorTextSecondary 
          }}>
            {config.description}
          </div>

          {/* DEBUG: 倒计时显示 */}
          {DEBUG_MODE && gameState === 'waiting' && (
            <div style={{
              marginTop: 16,
              padding: '8px 16px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: 4,
              color: '#856404',
              fontSize: 14,
            }}>
              🐛 DEBUG: 还剩 <strong>{debugCountdown}</strong> ms 变绿
            </div>
          )}
        </div>

          {/* 重置按钮 */}
          {(gameState !== 'idle' || history.length > 0) && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <div 
                onClick={resetGame}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  fontSize: 14,
                  borderRadius: 6,
                  border: `1px solid ${token.colorBorder}`,
                  backgroundColor: token.colorBgContainer,
                  color: token.colorText,
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = token.colorPrimary;
                  e.currentTarget.style.color = token.colorPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = token.colorBorder;
                  e.currentTarget.style.color = token.colorText;
                }}
              >
                <ReloadOutlined />
                重置
              </div>
            </div>
          )}
        </Block>

        {/* 统计信息 */}
        {history.length > 0 && (
          <Block>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 40,
            }}>
              <Statistic 
                title="平均反应时间" 
                value={average || 0} 
                suffix="ms" 
                valueStyle={{ color: token.colorText }}
              />
              <Statistic 
                title="最佳记录" 
                value={best || 0} 
                suffix="ms" 
                valueStyle={{ color: '#52c41a' }}
              />
              <Statistic 
                title="测试次数" 
                value={history.length} 
                valueStyle={{ color: token.colorText }}
              />
            </div>
          </Block>
        )}

        {/* 说明 */}
        <Block>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <div style={{ fontWeight: 500, color: token.colorText }}>关于反应测试</div>
            <ul style={{ margin: 0, paddingLeft: 16, color: token.colorTextSecondary, fontSize: 13 }}>
              <li>这是一个简单的人类反应速度测试工具</li>
              <li>点击开始按钮，等待按钮变成绿色（随机 5-10 秒）</li>
              <li>按钮一变绿就立即点击，系统会记录你的反应时间</li>
              <li>普通人平均反应时间约为 200-250 毫秒</li>
            </ul>
          </div>
      </Block>
    </Page>
  );
};

export default ReactionTest;
