import React, { useState, useRef, useCallback } from "react";
import { Card, Button, theme, Statistic } from "antd";
import { PlayCircleOutlined, ReloadOutlined } from "@ant-design/icons";

type GameState = 'idle' | 'waiting' | 'ready' | 'finished' | 'falseStart';

const ReactionTest: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const { token } = theme.useToken();

  const startGame = useCallback(() => {
    setGameState('waiting');
    
    // 随机 5-10 秒
    const delay = Math.floor(Math.random() * 5000) + 5000;
    
    timeoutRef.current = setTimeout(() => {
      setGameState('ready');
      startTimeRef.current = performance.now();
    }, delay);
  }, []);

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
      const endTime = performance.now();
      const time = Math.round(endTime - startTimeRef.current);
      setReactionTime(time);
      setHistory(prev => [...prev.slice(-9), time]);
      setGameState('finished');
    }
  }, [gameState, startGame]);

  const resetGame = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setGameState('idle');
    setReactionTime(null);
  }, []);

  const getButtonConfig = () => {
    switch (gameState) {
      case 'idle':
        return {
          text: '点击开始',
          color: token.colorPrimary,
          description: '准备好测试你的反应速度了吗？'
        };
      case 'waiting':
        return {
          text: '等待绿色...',
          color: '#faad14',
          description: '等待按钮变绿，不要提前点击！'
        };
      case 'ready':
        return {
          text: '点击！',
          color: '#52c41a',
          description: '快点击！'
        };
      case 'finished':
        return {
          text: `${reactionTime} ms`,
          color: '#52c41a',
          description: '再次点击开始新一轮测试'
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
    <div style={{ padding: "16px", maxWidth: 600, margin: '0 auto' }}>
      <Card>
        {/* 主按钮区域 */}
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Button
            type="primary"
            onClick={handleClick}
            style={{
              width: 280,
              height: 200,
              fontSize: gameState === 'finished' ? 48 : 28,
              fontWeight: 'bold',
              backgroundColor: config.color,
              borderColor: config.color,
              boxShadow: gameState === 'ready' 
                ? `0 0 30px ${config.color}80` 
                : '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.1s ease',
            }}
          >
            {config.text}
          </Button>
          
          <div style={{ 
            marginTop: 24, 
            fontSize: 16, 
            color: gameState === 'falseStart' ? '#f5222d' : token.colorTextSecondary 
          }}>
            {config.description}
          </div>
        </div>

        {/* 统计信息 */}
        {history.length > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 40,
            padding: '20px 0',
            borderTop: `1px solid ${token.colorBorder}`,
            marginTop: 20
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
        )}

        {/* 重置按钮 */}
        {(gameState !== 'idle' || history.length > 0) && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Button 
              icon={<ReloadOutlined />}
              onClick={resetGame}
              size="large"
            >
              重置
            </Button>
          </div>
        )}
      </Card>

      {/* 说明 */}
      <Card style={{ marginTop: 16 }} size="small">
        <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
          <div style={{ fontWeight: 500, marginBottom: 8, color: token.colorText }}>关于反应测试</div>
          <p>这是一个简单的人类反应速度测试工具。</p>
          <p>1. 点击开始按钮</p>
          <p>2. 等待按钮变成绿色（随机 5-10 秒）</p>
          <p>3. 按钮一变绿就立即点击</p>
          <p>4. 系统会记录你的反应时间</p>
          <p style={{ margin: 0 }}>普通人平均反应时间约为 200-250 毫秒。</p>
        </div>
      </Card>
    </div>
  );
};

export default ReactionTest;
