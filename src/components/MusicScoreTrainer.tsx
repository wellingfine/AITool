import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button, Space, Typography, Row, Col, Statistic, message, Slider, Checkbox, Radio } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import { nativeAPI } from '../services/nativeAPI';
import Block from '../lib/Block';
import Page from '../lib/Page';
import './MusicScoreTrainer.css';

const { Text } = Typography;

// 音符定义
interface Note {
  name: string; // C, D, E, F, G, A, B
  octave: number; // 组别 1-7
  position: number; // 在五线谱上的位置（相对于第一线，向下为负，向上为正）
  accidental?: string; // 升降号：'#' | 'b' | null
}

// 历史记录
interface TrainingRecord {
  id: string;
  date: string;
  correct: number;
  total: number;
  accuracy: number;
  duration: number; // 秒
}

// 音名到位置的映射
const NOTE_POSITIONS: Record<string, number> = {
  'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6,
};

// 谱表类型
type StaffType = 'treble' | 'bass';

// 五线谱布局常量
const STAFF_CONFIG = {
  lineSpacing: 12,      // 线间距
  centerY: 100,         // 五线谱中心Y坐标
  viewBoxWidth: 800,    // SVG视图宽度
  viewBoxHeight: 240,   // SVG视图高度
  staffStartX: 100,     // 五线起始X
  staffEndX: 750,       // 五线结束X
  clefX: 20,            // 谱号X坐标
  clefYOffset: 20,      // 谱号Y偏移
  clefFontSize: 60,     // 谱号字体大小
} as const;

// 三个音符的位置
const NOTE_POSITIONS_X = {
  prev: 200,    // 已测试（左边）
  current: 400, // 正在测试（中间）
  next: 600,    // 将要测试（右边）
} as const;

// 高音谱表：以第一线E4为基准 (position 0 = E4)
// 低音谱表：以第一线G2为基准 (position 0 = G2)
const getNotePosition = (name: string, octave: number, staffType: StaffType): number => {
  const noteOffset = NOTE_POSITIONS[name];
  
  if (staffType === 'treble') {
    // 高音谱表：E4在第一线 (position 0)
    // 从E4(0)向上/向下计算
    // E4 = (4-4)*7 + 2 - 2 = 0
    const basePosition = (octave - 4) * 7;
    return basePosition + noteOffset - 2; // E是基准
  } else {
    // 低音谱表：G2在第一线 (position 0)
    // G2 = (2-2)*7 + 4 - 4 = 0
    const basePosition = (octave - 2) * 7;
    return basePosition + noteOffset - 4; // G是基准
  }
};

// 根据谱表和加线限制获取音组范围
const getOctaveRangeByStaff = (staffType: StaffType): [number, number] => {
  // 上加4线 = +16 position (上加一线=10, 二=12, 三=14, 四=16)
  // 下加4线 = -9 position (下加一线=-3, 二=-5, 三=-7, 四=-9)
  if (staffType === 'treble') {
    // 高音谱表：E4(0) 到 F5(8) 是五线范围
    // 上加4线：position 16 (E6)
    // 下加4线：position -9 (C3)
    // E4=4组, E6=6组, C3=3组
    return [3, 6];
  } else {
    // 低音谱表：G2(0) 到 A3(8) 是五线范围
    // 上加4线：position 16 (G4)
    // 下加4线：position -9 (E1)
    // G2=2组, G4=4组, E1=1组
    return [1, 4];
  }
};

// 生成所有音符
const generateAllNotes = (minOctave: number, maxOctave: number, staffType: StaffType): Note[] => {
  const notes: Note[] = [];
  const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  
  for (let octave = minOctave; octave <= maxOctave; octave++) {
    noteNames.forEach(name => {
      const position = getNotePosition(name, octave, staffType);
      // 限制在 上加4线(+16) 到 下加4线(-9) 范围内
      if (position <= 16 && position >= -9) {
        notes.push({
          name,
          octave,
          position,
        });
      }
    });
  }
  return notes;
};

// 获取随机音符
const getRandomNote = (notes: Note[]): Note => {
  return notes[Math.floor(Math.random() * notes.length)];
};

// 格式化时间
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 存储键
const STORAGE_KEY = 'music-score-trainer';
const STORAGE_FILE = 'records';

export default function MusicScoreTrainer() {
  // 设置状态
  const [staffType, setStaffType] = useState<StaffType>('treble');
  const [octaveRange, setOctaveRange] = useState<[number, number]>([3, 5]);
  const [selectedKeys, setSelectedKeys] = useState<number[]>([0]); // 多选调号，默认C大调
  const [showSettings, setShowSettings] = useState<boolean>(true);
  
  // 游戏状态
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [nextNote, setNextNote] = useState<Note | null>(null);
  const [prevNote, setPrevNote] = useState<Note | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [selectedOctave, setSelectedOctave] = useState<number | null>(null);
  
  // 历史记录
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  
  // 计时器
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const availableNotes = useMemo(() => generateAllNotes(octaveRange[0], octaveRange[1], staffType), [octaveRange, staffType]);
  
  // 谱表改变时自动更新音组范围
  useEffect(() => {
    const range = getOctaveRangeByStaff(staffType);
    setOctaveRange(range);
  }, [staffType]);
  
  // 加载历史记录
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const data = await nativeAPI.storage.load(STORAGE_KEY, STORAGE_FILE);
        if (data) {
          setRecords(JSON.parse(data));
        }
      } catch (error) {
        console.error('Failed to load records:', error);
      }
    };
    loadRecords();
  }, []);
  
  // 保存历史记录
  const saveRecords = async (newRecords: TrainingRecord[]) => {
    try {
      await nativeAPI.storage.save(STORAGE_KEY, STORAGE_FILE, JSON.stringify(newRecords));
    } catch (error) {
      console.error('Failed to save records:', error);
    }
  };
  
  // 开始游戏
  const startGame = () => {
    if (selectedKeys.length === 0) {
      message.error('请至少选择一个调号');
      return;
    }
    
    setShowSettings(false);
    setIsPlaying(true);
    setCorrectCount(0);
    setTotalCount(0);
    setElapsedTime(0);
    setFeedback(null);
    
    const note1 = getRandomNote(availableNotes);
    const note2 = getRandomNote(availableNotes);
    setCurrentNote(note1);
    setNextNote(note2);
    setPrevNote(null);
    // 自动选中第一个音组
    setSelectedOctave(octaveRange[0]);
    
    // 启动计时器
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };
  
  // 结束游戏
  const endGame = useCallback(async () => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (totalCount > 0) {
      const newRecord: TrainingRecord = {
        id: Date.now().toString(),
        date: new Date().toLocaleString('zh-CN'),
        correct: correctCount,
        total: totalCount,
        accuracy: Math.round((correctCount / totalCount) * 100),
        duration: elapsedTime,
      };
      
      const updatedRecords = [newRecord, ...records].slice(0, 20);
      setRecords(updatedRecords);
      await saveRecords(updatedRecords);
      message.success(`游戏结束！正确率: ${newRecord.accuracy}%`);
    }
    
    setShowSettings(true);
  }, [correctCount, totalCount, elapsedTime, records]);
  
  // 清理计时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // 处理音符选择
  const handleNoteSelect = (noteName: string) => {
    if (!currentNote || !isPlaying) return;
    
    if (selectedOctave === null) {
      message.info('请先选择音组');
      return;
    }
    
    const isCorrect = noteName === currentNote.name && selectedOctave === currentNote.octave;
    
    setTotalCount(prev => prev + 1);
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }
    
    // 移动音符
    setPrevNote(currentNote);
    setCurrentNote(nextNote);
    setNextNote(getRandomNote(availableNotes));
    // 自动选中第一个音组
    setSelectedOctave(octaveRange[0]);
    
    // 清除反馈
    setTimeout(() => setFeedback(null), 500);
  };
  
  // 渲染五线谱 - 主入口
  const renderStaff = () => {
    const { lineSpacing, centerY, viewBoxWidth, viewBoxHeight } = STAFF_CONFIG;

    // 构建音符音名字符串
    const getNoteNameString = (note: Note | null): string => {
      if (!note) return '';
      const accidental = note.accidental || '';
      return `${accidental}${note.name}${note.octave}`;
    };

    return (
      <svg width="100%" height={viewBoxHeight} viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} preserveAspectRatio="xMidYMid meet">
        {renderClef()}
        {renderKeySignature()}
        {renderStaffLines()}

        {/* 已测试的音符（左边，淡色显示） */}
        {prevNote && (
          <g opacity={0.4}>
            {renderNote(NOTE_POSITIONS_X.prev, getNoteNameString(prevNote), staffType)}
          </g>
        )}

        {/* 正在测试的音符（中间，高亮显示） */}
        {currentNote && renderNote(NOTE_POSITIONS_X.current, getNoteNameString(currentNote), staffType)}

        {/* 将要测试的音符（右边，虚影显示） */}
        {nextNote && (
          <g opacity={0.25}>
            {renderNote(NOTE_POSITIONS_X.next, getNoteNameString(nextNote), staffType)}
          </g>
        )}
      </svg>
    );
  };

  // 渲染谱号
  const renderClef = () => {
    const { centerY, clefX, clefYOffset, clefFontSize } = STAFF_CONFIG;
    return (
      <text x={clefX} y={centerY + clefYOffset} fontSize={clefFontSize} fill="#333">
        {staffType === 'treble' ? '𝄞' : '𝄢'}
      </text>
    );
  };

  // 渲染调号
  const renderKeySignature = () => {
    const { centerY } = STAFF_CONFIG;
    const keySig = selectedKeys[Math.floor(Math.random() * selectedKeys.length)];
    if (keySig === 0) return null;
    return (
      <g>
        {Array.from({ length: Math.abs(keySig) }).map((_, i) => (
          <text
            key={i}
            x={70 + i * 12}
            y={centerY - 10 + (keySig > 0 ? -5 : 5)}
            fontSize="20"
            fill="#333"
          >
            {keySig > 0 ? '♯' : '♭'}
          </text>
        ))}
      </g>
    );
  };

  // 渲染五线
  const renderStaffLines = () => {
    const { lineSpacing, centerY, staffStartX, staffEndX } = STAFF_CONFIG;
    return (
      <>
        {[0, 1, 2, 3, 4].map(i => (
          <line
            key={i}
            x1={staffStartX}
            y1={centerY - 2 * lineSpacing + i * lineSpacing}
            x2={staffEndX}
            y2={centerY - 2 * lineSpacing + i * lineSpacing}
            stroke="#333"
            strokeWidth="1"
          />
        ))}
      </>
    );
  };

  // 将音名字符串解析为 Note 对象
  // 支持格式: "C4", "#F5", "bB3" 等
  const parseNoteName = (noteName: string, staffType: StaffType): Note | null => {
    const match = noteName.match(/^(#|b)?([A-G])(\d)$/);
    if (!match) return null;

    const accidental = match[1] || undefined;
    const name = match[2];
    const octave = parseInt(match[3], 10);

    return {
      name,
      octave,
      position: getNotePosition(name, octave, staffType),
      accidental,
    };
  };

  // 渲染音符
  // x: x坐标, noteName: 音名(如 "C4", "#F5", "bB3"), staffType: 谱表类型 'treble' | 'bass'
  const renderNote = (x: number, noteName: string, staffType: StaffType) => {
    const { lineSpacing, centerY } = STAFF_CONFIG;
    const note = parseNoteName(noteName, staffType);

    if (!note) return null;

    // 计算Y坐标: 第一线是基准(position 0), 向下为正
    // 高音谱表: E4在第一线, 向上每个音高半条线间距
    // position 0 = 第一线, 每增加1 position, y 减少 lineSpacing/2
    const y = centerY + 2 * lineSpacing - note.position * (lineSpacing / 2);

    return (
      <g key={`${noteName}-${x}`}>
        {/* 音符头 (椭圆) */}
        <ellipse
          cx={x}
          cy={y}
          rx={lineSpacing * 0.6}
          ry={lineSpacing * 0.45}
          fill="#333"
          transform={`rotate(-15, ${x}, ${y})`}
        />

        {/* 升降号 */}
        {note.accidental && (
          <text
            x={x - lineSpacing * 1.5}
            y={y + lineSpacing * 0.3}
            fontSize={lineSpacing * 1.5}
            fill="#333"
          >
            {note.accidental === '#' ? '♯' : '♭'}
          </text>
        )}

        {/* 加线: 当音符在第五线之上或第一线之下时需要 */}
        {/* 上加线: position >= 10 且为偶数 (上加一线=10, 上加二线=12...) */}
        {note.position >= 10 && Array.from({ length: Math.floor((note.position - 8) / 2) }).map((_, i) => (
          <line
            key={`upper-${i}`}
            x1={x - lineSpacing}
            y1={centerY - 2 * lineSpacing - (i + 1) * lineSpacing}
            x2={x + lineSpacing}
            y2={centerY - 2 * lineSpacing - (i + 1) * lineSpacing}
            stroke="#333"
            strokeWidth="1"
          />
        ))}
        {/* 下加线: position <= -2 且为偶数 (下加一线=-2, 下加二线=-4...) */}
        {note.position <= -2 && Array.from({ length: Math.floor(Math.abs(note.position) / 2) }).map((_, i) => (
          <line
            key={`lower-${i}`}
            x1={x - lineSpacing}
            y1={centerY + 2 * lineSpacing + (i + 1) * lineSpacing}
            x2={x + lineSpacing}
            y2={centerY + 2 * lineSpacing + (i + 1) * lineSpacing}
            stroke="#333"
            strokeWidth="1"
          />
        ))}
      </g>
    );
  };

  // 获取音组的中文名称（大字组/小字组）
  const getOctaveLabel = (octave: number): string => {
    // 大字一组=1, 大字组=2, 小字组=3, 小字一组=4, 小字二组=5, 小字三组=6, 小字四组=7
    const labels: Record<number, string> = {
      1: '大字一组',
      2: '大字组',
      3: '小字组',
      4: '小字一组',
      5: '小字二组',
      6: '小字三组',
      7: '小字四组',
    };
    return labels[octave] || `${octave}组`;
  };

  // 渲染键盘
  const renderKeyboard = () => {
    // 只生成范围内的音组
    const octaves = [];
    for (let i = octaveRange[0]; i <= octaveRange[1]; i++) {
      octaves.push(i);
    }
    const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    
    return (
      <div className="keyboard-section">
        {/* 音组选择 */}
        <div className="octave-selector">
          <Text strong>选择音组：</Text>
          <Space wrap>
            {octaves.map(oct => (
              <Button
                key={oct}
                type={selectedOctave === oct ? 'primary' : 'default'}
                size="small"
                onClick={() => setSelectedOctave(oct)}
              >
                {oct}组({getOctaveLabel(oct)})
              </Button>
            ))}
          </Space>
          {selectedOctave && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              已选: {selectedOctave}组({getOctaveLabel(selectedOctave)})
            </Text>
          )}
        </div>
        
        {/* 音高选择 */}
        <div className="note-selector">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Text strong>选择音高：</Text>
            <Space wrap>
              {whiteKeys.map(note => (
                <Button
                  key={note}
                  onClick={() => handleNoteSelect(note)}
                  disabled={!selectedOctave}
                  style={{ minWidth: 50 }}
                >
                  {note}
                </Button>
              ))}
            </Space>
            {/* 显示正确答案 */}
            {currentNote && (
              <Text type="secondary" style={{ marginLeft: 'auto' }}>
                答案: {currentNote.name}{currentNote.octave}({getOctaveLabel(currentNote.octave)})
              </Text>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Page maxWidth={800}>
      
      {showSettings ? (
        <Block>
          <Space style={{ width: '100%', flexDirection: 'column', alignItems: 'stretch' }} size="large">
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>谱表选择</Text>
              <Radio.Group 
                value={staffType} 
                onChange={(e) => setStaffType(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="treble">高音谱表 (𝄞)</Radio.Button>
                <Radio.Button value="bass">低音谱表 (𝄢)</Radio.Button>
              </Radio.Group>
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong>音组范围</Text>
                <Text type="secondary">{octaveRange[0]}组 - {octaveRange[1]}组</Text>
              </div>
              <Slider
                range
                min={staffType === 'treble' ? 3 : 1}
                max={staffType === 'treble' ? 6 : 4}
                value={octaveRange}
                onChange={(value) => setOctaveRange(value as [number, number])}
                marks={staffType === 'treble' ? {
                  3: '3组',
                  4: '4组',
                  5: '5组',
                  6: '6组',
                } : {
                  1: '1组',
                  2: '2组',
                  3: '3组',
                  4: '4组',
                }}
              />
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                已自动限定为{staffType === 'treble' ? '高音' : '低音'}谱表范围（上加4线-下加4线）
              </Text>
            </div>
            
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>调号选择</Text>
              <Checkbox.Group
                value={selectedKeys}
                onChange={(values) => setSelectedKeys(values as number[])}
              >
                <Row gutter={[16, 8]}>
                  {/* 第一行：C大调 */}
                  <Col span={24} style={{ textAlign: 'center', marginBottom: 8 }}>
                    <Checkbox value={0} style={{ fontWeight: 'bold' }}>C大调 / a小调</Checkbox>
                  </Col>
                  {/* 降号列（左）和升号列（右） */}
                  <Col span={12}>
                    <div style={{ borderRight: '1px solid #e8e8e8', paddingRight: 8 }}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>降号</Text>
                      <Space size="small" style={{ width: '100%', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Checkbox value={-1}>1个降号 ♭</Checkbox>
                        <Checkbox value={-2}>2个降号 ♭♭</Checkbox>
                        <Checkbox value={-3}>3个降号 ♭♭♭</Checkbox>
                        <Checkbox value={-4}>4个降号 ♭♭♭♭</Checkbox>
                        <Checkbox value={-5}>5个降号 ♭♭♭♭♭</Checkbox>
                        <Checkbox value={-6}>6个降号 ♭♭♭♭♭♭</Checkbox>
                        <Checkbox value={-7}>7个降号 ♭♭♭♭♭♭♭</Checkbox>
                      </Space>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ paddingLeft: 8 }}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>升号</Text>
                      <Space size="small" style={{ width: '100%', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Checkbox value={1}>1个升号 ♯</Checkbox>
                        <Checkbox value={2}>2个升号 ♯♯</Checkbox>
                        <Checkbox value={3}>3个升号 ♯♯♯</Checkbox>
                        <Checkbox value={4}>4个升号 ♯♯♯♯</Checkbox>
                        <Checkbox value={5}>5个升号 ♯♯♯♯♯</Checkbox>
                        <Checkbox value={6}>6个升号 ♯♯♯♯♯♯</Checkbox>
                        <Checkbox value={7}>7个升号 ♯♯♯♯♯♯♯</Checkbox>
                      </Space>
                    </div>
                  </Col>
                </Row>
              </Checkbox.Group>
            </div>
            
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={startGame} block>
              开始训练
            </Button>
          </Space>
        </Block>
      ) : (
        <>
          {/* 统计信息 */}
          <Block>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="正确" value={correctCount} style={{ color: '#52c41a' }} />
              </Col>
              <Col span={6}>
                <Statistic title="总计" value={totalCount} />
              </Col>
              <Col span={6}>
                <Statistic title="时间" value={formatTime(elapsedTime)} />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="平均用时" 
                  value={totalCount > 0 ? `${(elapsedTime / totalCount).toFixed(1)}s` : '0s'} 
                />
              </Col>
            </Row>
            
            {totalCount > 0 && (
              <div style={{ marginTop: 16, textAlign: 'center', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <Text strong style={{ fontSize: 18 }}>
                  正确率: {Math.round((correctCount / totalCount) * 100)}%
                </Text>
              </div>
            )}
          </Block>
          
          {/* 五线谱 */}
          <Block>
              {renderStaff()}
          </Block>
          
          {/* 键盘 */}
          <Block>
            {renderKeyboard()}
          </Block>
          
          {/* 控制按钮 */}
          <Block>
            <div style={{ textAlign: 'center' }}>
              <Button icon={<PauseCircleOutlined />} onClick={endGame} danger>
                结束训练
              </Button>
            </div>
          </Block>
        </>
      )}
      
      {/* 历史记录 */}
      <Block>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <HistoryOutlined />
          <Text strong>最近训练记录 (最近20条)</Text>
        </div>
        {records.length === 0 ? (
          <Text type="secondary">暂无记录</Text>
        ) : (
          <div className="records-list">
            {records.map((record, index) => (
              <div key={record.id} className="record-item">
                <Space wrap>
                  <Text strong>#{records.length - index}</Text>
                  <Text type="secondary">{record.date}</Text>
                  <Text>正确: {record.correct}/{record.total}</Text>
                  <Text style={{ color: record.accuracy >= 80 ? '#52c41a' : record.accuracy >= 60 ? '#faad14' : '#ff4d4f' }}>
                    正确率: {record.accuracy}%
                  </Text>
                  <Text type="secondary">总用时: {formatTime(record.duration)}</Text>
                  <Text type="secondary">平均: {(record.duration / record.total).toFixed(1)}s/题</Text>
                </Space>
              </div>
            ))}
          </div>
        )}
      </Block>
    </Page>
  );
}