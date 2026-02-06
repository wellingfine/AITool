import { useState, useRef, useCallback, useEffect } from 'react';
import { Slider, Button, Space, Typography, theme, Modal, Input, Dropdown } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, PlusOutlined, MinusOutlined, DeleteOutlined, DownOutlined, SoundOutlined } from '@ant-design/icons';
import Block from '../lib/Block';
import { nativeAPI } from '../services/nativeAPI';

const { Text } = Typography;

// 节奏类型定义
type BeatType = 0 | 1 | 2; // 0: 无声, 1: 轻音, 2: 重音

interface RhythmPattern {
  id: string;
  name: string;
  beats: number;
  pattern: BeatType[]; // 每个拍的强弱音
  isPreset?: boolean;
}

// 预置节奏
const PRESET_RHYTHMS: RhythmPattern[] = [
  { id: 'preset-4-4', name: '4/4拍', beats: 4, pattern: [2, 1, 1, 1], isPreset: true },
  { id: 'preset-3-4', name: '3/4拍', beats: 3, pattern: [2, 1, 1], isPreset: true },
  { id: 'preset-2-4', name: '2/4拍', beats: 2, pattern: [2, 1], isPreset: true },
  { id: 'preset-6-8', name: '6/8拍', beats: 6, pattern: [2, 1, 1, 1, 1, 1], isPreset: true },
  { id: 'preset-rock', name: '摇滚', beats: 4, pattern: [2, 0, 1, 0], isPreset: true },
  { id: 'preset-waltz', name: '华尔兹', beats: 3, pattern: [2, 1, 1], isPreset: true },
];

// 常用速度选项
const SPEED_PRESETS = [
  { label: '慢板', value: 60 },
  { label: '行板', value: 76 },
  { label: '中板', value: 108 },
  { label: '快板', value: 132 },
  { label: '急板', value: 168 },
];

const STORAGE_PATH = 'metronome';
const STORAGE_FILE = 'rhythms';

export default function Metronome() {
  const [bpm, setBpm] = useState<number>(120);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [sliderPosition, setSliderPosition] = useState<number>(0);
  const [rhythms, setRhythms] = useState<RhythmPattern[]>(PRESET_RHYTHMS);
  const [selectedRhythmId, setSelectedRhythmId] = useState<string>('preset-4-4');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRhythmName, setNewRhythmName] = useState('');
  const [newRhythmBeats, setNewRhythmBeats] = useState(4);
  const [newRhythmPattern, setNewRhythmPattern] = useState<BeatType[]>([2, 1, 1, 1]);
  
  // 当前编辑的临时pattern（用于实时调整）
  const [tempPattern, setTempPattern] = useState<BeatType[] | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastBeatIndexRef = useRef<number>(-1);
  // 存储下一个要应用的BPM
  const pendingBpmRef = useRef<number | null>(null);

  const {
    token: { colorPrimary },
  } = theme.useToken();

  // 获取当前选中的节奏
  const currentRhythm = rhythms.find(r => r.id === selectedRhythmId) || PRESET_RHYTHMS[0];
  
  // 使用临时pattern（如果有）或当前节奏的pattern
  const currentPattern = tempPattern || currentRhythm.pattern;

  // 加载保存的节奏
  useEffect(() => {
    const loadRhythms = async () => {
      try {
        const data = await nativeAPI.storage.load(STORAGE_PATH, STORAGE_FILE, []);
        if (data && Array.isArray(data)) {
          const customRhythms = data.filter((r: RhythmPattern) => !r.isPreset);
          setRhythms([...PRESET_RHYTHMS, ...customRhythms]);
        }
      } catch (error) {
        console.error('Failed to load rhythms:', error);
      }
    };
    loadRhythms();
  }, []);

  // 保存节奏
  const saveRhythms = useCallback(async (newRhythms: RhythmPattern[]) => {
    try {
      const customRhythms = newRhythms.filter(r => !r.isPreset);
      await nativeAPI.storage.save(STORAGE_PATH, STORAGE_FILE, customRhythms);
    } catch (error) {
      console.error('Failed to save rhythms:', error);
    }
  }, []);

  // 初始化音频上下文
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  // 播放节拍声音
  const playClick = useCallback((beatType: BeatType) => {
    if (!audioContextRef.current || beatType === 0) return;

    const osc = audioContextRef.current.createOscillator();
    const envelope = audioContextRef.current.createGain();

    osc.connect(envelope);
    envelope.connect(audioContextRef.current.destination);

    if (beatType === 2) {
      osc.frequency.value = 1200;
      envelope.gain.value = 1;
    } else {
      osc.frequency.value = 700;
      envelope.gain.value = 0.5;
    }

    osc.type = 'sine';

    const now = audioContextRef.current.currentTime;
    osc.start(now);
    osc.stop(now + 0.05);
  }, []);

  // 使用 ref 存储状态
  const isPlayingRef = useRef(isPlaying);
  const bpmRef = useRef(bpm);
  const patternRef = useRef(currentPattern);
  
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);
  
  useEffect(() => {
    patternRef.current = currentPattern;
  }, [currentPattern]);

  // 更新滑块位置动画
  const updateSliderAnimation = useCallback(() => {
    if (!isPlayingRef.current || !audioContextRef.current) return;

    const currentTime = audioContextRef.current.currentTime;
    const beatDuration = 60.0 / bpmRef.current;
    const elapsedInBeat = (currentTime - startTimeRef.current) % beatDuration;
    const progress = elapsedInBeat / beatDuration;

    setSliderPosition(progress * 100);

    // 根据滑块位置计算当前拍子索引
    const currentBeatIndex = Math.floor(progress * patternRef.current.length);
    
    // 当进入新的拍子时
    if (currentBeatIndex !== lastBeatIndexRef.current) {
      lastBeatIndexRef.current = currentBeatIndex;
      
      // 检查是否有待应用的BPM（在节拍边界应用）
      if (pendingBpmRef.current !== null) {
        setBpm(pendingBpmRef.current);
        bpmRef.current = pendingBpmRef.current;
        pendingBpmRef.current = null;
      }
      
      // 播放声音
      const beatType = patternRef.current[currentBeatIndex];
      playClick(beatType);
    }

    animationFrameRef.current = requestAnimationFrame(updateSliderAnimation);
  }, [playClick]);

  // 处理BPM变化（延迟到下一个节拍应用）
  const handleBpmChange = useCallback((newBpm: number) => {
    if (isPlaying) {
      // 播放中时，存储待应用的BPM
      pendingBpmRef.current = newBpm;
    } else {
      // 未播放时直接应用
      setBpm(newBpm);
    }
  }, [isPlaying]);

  // 开始播放
  const start = useCallback(() => {
    initAudioContext();
    if (!audioContextRef.current) return;

    setIsPlaying(true);
    lastBeatIndexRef.current = -1;
    pendingBpmRef.current = null;
    startTimeRef.current = audioContextRef.current.currentTime;
    animationFrameRef.current = requestAnimationFrame(updateSliderAnimation);
  }, [initAudioContext, updateSliderAnimation]);

  // 停止播放
  const stop = useCallback(() => {
    setIsPlaying(false);
    setSliderPosition(0);
    pendingBpmRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    lastBeatIndexRef.current = -1;
  }, []);

  // 切换播放/停止
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  // 清理
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // 处理节奏选择
  const handleRhythmChange = useCallback((rhythmId: string) => {
    setSelectedRhythmId(rhythmId);
    // 清除临时pattern
    setTempPattern(null);
    if (isPlaying) {
      stop();
    }
  }, [isPlaying, stop]);

  // 删除自定义节奏
  const deleteRhythm = useCallback(async (rhythmId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newRhythms = rhythms.filter(r => r.id !== rhythmId);
    setRhythms(newRhythms);
    await saveRhythms(newRhythms);
    if (selectedRhythmId === rhythmId) {
      setSelectedRhythmId(PRESET_RHYTHMS[0].id);
    }
  }, [rhythms, selectedRhythmId, saveRhythms]);

  // 打开新增弹窗
  const openModal = useCallback(() => {
    setNewRhythmName('');
    setNewRhythmBeats(4);
    setNewRhythmPattern([2, 1, 1, 1]);
    setIsModalOpen(true);
  }, []);

  // 关闭弹窗
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // 修改拍数（当前节奏）
  const changeCurrentBeats = useCallback((delta: number) => {
    const newBeats = Math.max(1, Math.min(16, currentPattern.length + delta));
    setTempPattern(prev => {
      const basePattern = prev || currentRhythm.pattern;
      if (newBeats > basePattern.length) {
        return [...basePattern, ...Array(newBeats - basePattern.length).fill(1 as BeatType)];
      } else {
        return basePattern.slice(0, newBeats);
      }
    });
  }, [currentPattern.length, currentRhythm.pattern]);

  // 切换当前拍子类型
  const toggleCurrentBeatType = useCallback((index: number) => {
    setTempPattern(prev => {
      const basePattern = prev ? [...prev] : [...currentRhythm.pattern];
      basePattern[index] = ((basePattern[index] + 1) % 3) as BeatType;
      return basePattern;
    });
  }, [currentRhythm.pattern]);

  // 修改新节奏的拍数
  const changeNewRhythmBeats = useCallback((delta: number) => {
    setNewRhythmBeats(prev => {
      const newBeats = Math.max(1, Math.min(16, prev + delta));
      setNewRhythmPattern(prevPattern => {
        if (newBeats > prevPattern.length) {
          return [...prevPattern, ...Array(newBeats - prevPattern.length).fill(1 as BeatType)];
        } else {
          return prevPattern.slice(0, newBeats);
        }
      });
      return newBeats;
    });
  }, []);

  // 切换新拍子类型
  const toggleNewBeatType = useCallback((index: number) => {
    setNewRhythmPattern(prev => {
      const newPattern = [...prev];
      newPattern[index] = ((newPattern[index] + 1) % 3) as BeatType;
      return newPattern;
    });
  }, []);

  // 保存新节奏
  const saveNewRhythm = useCallback(async () => {
    if (!newRhythmName.trim()) return;

    const newRhythm: RhythmPattern = {
      id: `custom-${Date.now()}`,
      name: newRhythmName.trim(),
      beats: newRhythmBeats,
      pattern: [...newRhythmPattern],
      isPreset: false,
    };

    const newRhythms = [...rhythms, newRhythm];
    setRhythms(newRhythms);
    await saveRhythms(newRhythms);
    setSelectedRhythmId(newRhythm.id);
    setIsModalOpen(false);
  }, [newRhythmName, newRhythmBeats, newRhythmPattern, rhythms, saveRhythms]);

  // 根据滑块位置计算当前拍子
  const getCurrentBeatFromPosition = useCallback((position: number, totalBeats: number): number => {
    return Math.floor((position / 100) * totalBeats);
  }, []);

  // 获取拍子矩形样式
  const getBeatRectStyle = (type: BeatType, isActive: boolean): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      height: 50,
      borderRadius: 0,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.1s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      flex: 1,
    };

    if (type === 0) {
      // 无声 - 比较黑
      baseStyle.backgroundColor = isActive ? '#333' : '#666';
    } else if (type === 1) {
      // 轻音 - 占一半
      baseStyle.background = isActive
        ? `linear-gradient(to top, ${colorPrimary} 50%, #f5f5f5 50%)`
        : `linear-gradient(to top, ${colorPrimary}80 50%, #f5f5f5 50%)`;
    } else {
      // 重音 - 深色主题色，再深一点
      baseStyle.backgroundColor = isActive ? '#003a8c' : `${colorPrimary}bb`;
    }

    return baseStyle;
  };

  // 获取当前拍子样式
  const getCurrentBeatStyle = (index: number): React.CSSProperties => {
    const calculatedBeat = isPlaying ? getCurrentBeatFromPosition(sliderPosition, currentPattern.length) : -1;
    const isActive = calculatedBeat === index;
    const beatType = currentPattern[index];
    return getBeatRectStyle(beatType, isActive);
  };

  // 下拉菜单项
  const rhythmMenuItems = [
    ...rhythms.map((rhythm) => ({
      key: rhythm.id,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 120 }}>
          <span>{rhythm.name}</span>
          {!rhythm.isPreset && (
            <DeleteOutlined
              style={{ color: '#ff4d4f', marginLeft: 8 }}
              onClick={(e) => {
                e.stopPropagation();
                deleteRhythm(rhythm.id, e as unknown as React.MouseEvent);
              }}
            />
          )}
        </div>
      ),
      onClick: () => handleRhythmChange(rhythm.id),
    })),
    { type: 'divider' as const },
    {
      key: 'add-new',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlusOutlined />
          <span>新增节奏</span>
        </div>
      ),
      onClick: openModal,
    },
  ];

  // 常用速度下拉菜单项
  const speedMenuItems = SPEED_PRESETS.map((preset) => ({
    key: preset.value.toString(),
    label: `${preset.label} (${preset.value} BPM)`,
    onClick: () => handleBpmChange(preset.value),
  }));

  // 获取当前速度的显示标签
  const currentSpeedLabel = SPEED_PRESETS.find(p => p.value === bpm)?.label || '自定义';
  
  // 显示待应用的BPM（如果有）
  const displayBpm = pendingBpmRef.current !== null ? pendingBpmRef.current : bpm;

  return (
    <div style={{ padding: '8px 0', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* 顶部栏：节奏选择(左) + 常用速度(右) */}
        <Block>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* 左侧：节奏下拉 */}
            <Dropdown menu={{ items: rhythmMenuItems }} placement="bottomLeft">
              <Button>
                <SoundOutlined /> {currentRhythm.name} <DownOutlined />
              </Button>
            </Dropdown>

            {/* 右侧：常用速度下拉 */}
            <Dropdown menu={{ items: speedMenuItems }} placement="bottomRight">
              <Button>
                {currentSpeedLabel} ({bpm} BPM) <DownOutlined />
              </Button>
            </Dropdown>
          </div>
        </Block>

        {/* BPM显示 + 节奏动画 */}
        <Block>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 96, fontWeight: 'bold', color: colorPrimary, lineHeight: 1 }}>
              {displayBpm}
            </Text>
            <div>
              <Text type="secondary">BPM</Text>
            </div>
          </div>

          {/* 节奏动画轨道 */}
          <div
            style={{
              height: 60,
              background: '#f5f5f5',
              borderRadius: 8,
              position: 'relative',
              overflow: 'hidden',
              marginBottom: 12,
            }}
          >
            {/* 拍子矩形 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                padding: '4px 12px',
                gap: 8,
              }}
            >
              {currentPattern.map((_, index) => (
                <div
                  key={index}
                  onClick={() => toggleCurrentBeatType(index)}
                  style={getCurrentBeatStyle(index)}
                />
              ))}
            </div>

            {/* 滑动指示器 */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 4,
                backgroundColor: '#ff4d4f',
                borderRadius: 2,
                left: `${sliderPosition}%`,
                transform: 'translateX(-50%)',
                transition: isPlaying ? 'none' : 'left 0.1s ease',
                boxShadow: '0 0 8px rgba(255, 77, 79, 0.5)',
                zIndex: 10,
              }}
            />
          </div>

          {/* 拍数调节 */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <Button 
              icon={<MinusOutlined />} 
              onClick={() => changeCurrentBeats(-1)} 
              disabled={currentPattern.length <= 1}
            />
            <Text style={{ fontSize: 16, fontWeight: 'bold', minWidth: 60, textAlign: 'center' }}>
              {currentPattern.length} 拍
            </Text>
            <Button 
              icon={<PlusOutlined />} 
              onClick={() => changeCurrentBeats(1)} 
              disabled={currentPattern.length >= 16}
            />
          </div>
        </Block>

        {/* 速度调节滑块 */}
        <Block>
          <div style={{ padding: '0 16px' }}>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">速度调节 (1 - 300 BPM)</Text>
            </div>
            <Slider
              min={1}
              max={300}
              value={displayBpm}
              onChange={handleBpmChange}
              tooltip={{ formatter: (value) => `${value} BPM` }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Text type="secondary">1</Text>
              <Text type="secondary">300</Text>
            </div>
          </div>
        </Block>

        {/* 开始按钮 */}
        <Block>
          <div style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={togglePlay}
              style={{ 
                width: '100%', 
                maxWidth: 300, 
                height: 64, 
                fontSize: 24,
                borderRadius: 32,
              }}
            >
              {isPlaying ? '停止' : '开始'}
            </Button>
          </div>
        </Block>
      </div>

      {/* 新增节奏弹窗 */}
      <Modal
        title="新增自定义节奏"
        open={isModalOpen}
        onOk={saveNewRhythm}
        onCancel={closeModal}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ disabled: !newRhythmName.trim() }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 名称输入 */}
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              节奏名称
            </Text>
            <Input
              placeholder="请输入节奏名称"
              value={newRhythmName}
              onChange={(e) => setNewRhythmName(e.target.value)}
              maxLength={20}
            />
          </div>

          {/* 拍数调节 */}
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              拍数 (1-16)
            </Text>
            <Space>
              <Button icon={<MinusOutlined />} onClick={() => changeNewRhythmBeats(-1)} disabled={newRhythmBeats <= 1} />
              <Text style={{ fontSize: 18, fontWeight: 'bold', minWidth: 30, textAlign: 'center' }}>
                {newRhythmBeats}
              </Text>
              <Button icon={<PlusOutlined />} onClick={() => changeNewRhythmBeats(1)} disabled={newRhythmBeats >= 16} />
            </Space>
          </div>

          {/* 拍子强弱设置 */}
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              拍子强弱 (点击切换: 灰→无声, 半填充→轻音, 全填充→重音)
            </Text>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {newRhythmPattern.map((type, index) => (
                <div
                  key={index}
                  onClick={() => toggleNewBeatType(index)}
                  style={{
                    ...getBeatRectStyle(type, false),
                    width: 40,
                    flex: 'none',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {index + 1}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
