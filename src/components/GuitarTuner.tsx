import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Select, Button, Typography, theme, Modal } from 'antd';
import { InfoCircleOutlined, AudioOutlined, AudioMutedOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import Block from '../lib/Block';
import { isAndroid } from '../lib/utils';

const { Text } = Typography;
const { Option } = Select;

// 音符频率映射（基于 A4 = 440Hz）
const NOTE_FREQUENCIES: Record<string, number> = {
  'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'Gb2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'Ab2': 103.83,
  'A2': 110.00, 'A#2': 116.54, 'Bb2': 116.54, 'B2': 123.47, 'C3': 130.81, 'C#3': 138.59, 'Db3': 138.59,
  'D3': 146.83, 'D#3': 155.56, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'Gb3': 185.00,
  'G3': 196.00, 'G#3': 207.65, 'Ab3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'Bb3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'Db4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'Eb4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'Gb4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'Ab4': 415.30, 'A4': 440.00,
};

// 调弦定义
interface Tuning {
  name: string;
  description: string;
  strings: string[]; // 从6弦到1弦
}

const TUNINGS: Tuning[] = [
  { name: 'standard', description: '标准调弦', strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { name: 'drop_d', description: 'Drop D', strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { name: 'half_step_down', description: '降半音 (Eb)', strings: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'] },
  { name: 'whole_step_down', description: '降全音 (D)', strings: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'] },
  { name: 'drop_c', description: 'Drop C', strings: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'] },
  { name: 'open_g', description: 'Open G', strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
  { name: 'open_d', description: 'Open D', strings: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'] },
  { name: 'dadgad', description: 'DADGAD', strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  { name: 'open_e', description: 'Open E', strings: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'] },
  { name: 'open_a', description: 'Open A', strings: ['E2', 'A2', 'E3', 'A3', 'C#4', 'E4'] },
  { name: 'open_c', description: 'Open C', strings: ['C2', 'G2', 'C3', 'G3', 'C4', 'E4'] },
  { name: 'double_drop_d', description: 'Double Drop D', strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'D4'] },
  { name: 'drop_b', description: 'Drop B', strings: ['B1', 'Gb2', 'B2', 'E3', 'Ab3', 'Db4'] },
  { name: 'modal_d', description: 'Modal D (Dsus4)', strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  { name: 'nick Drake', description: 'Nick Drake', strings: ['C2', 'G2', 'C3', 'F3', 'C4', 'E4'] }
];

// 音高检测 - 使用改进的自相关算法
const detectPitch = (buffer: Float32Array, sampleRate: number): number | null => {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  const MIN_SAMPLES = Math.floor(sampleRate / 500); // 最高频率约500Hz
  
  // 计算 RMS 判断是否有足够音量
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  
  // 降低音量阈值
  if (rms < 0.005) return null;
  
  // 自相关计算
  const nsdf = new Float32Array(MAX_SAMPLES);
  for (let tau = 0; tau < MAX_SAMPLES; tau++) {
    let acf = 0;
    let divisorM = 0;
    
    for (let i = 0; i < MAX_SAMPLES; i++) {
      const x1 = buffer[i];
      const x2 = buffer[i + tau];
      acf += x1 * x2;
      divisorM += x1 * x1 + x2 * x2;
    }
    
    nsdf[tau] = divisorM > 0 ? (2 * acf) / divisorM : 0;
  }
  
  // 寻找峰值
  let turningPointX: number[] = [];
  let turningPointY: number[] = [];
  let pos = 1;
  
  while (pos < MAX_SAMPLES - 1) {
    if (nsdf[pos] > 0 && nsdf[pos] > nsdf[pos - 1] && nsdf[pos] > nsdf[pos + 1]) {
      // 找到峰值，使用抛物线插值
      const alpha = nsdf[pos - 1];
      const beta = nsdf[pos];
      const gamma = nsdf[pos + 1];
      const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
      turningPointX.push(pos + p);
      turningPointY.push(beta - 0.25 * (alpha - gamma) * p);
    }
    pos++;
  }
  
  if (turningPointX.length === 0) return null;
  
  // 寻找最佳峰值（满足阈值条件的第一个峰值）
  const threshold = 0.7; // 降低阈值
  let bestPeriod = 0;
  
  for (let i = 0; i < turningPointX.length; i++) {
    if (turningPointX[i] >= MIN_SAMPLES && turningPointY[i] > threshold) {
      bestPeriod = turningPointX[i];
      break;
    }
  }
  
  // 如果没有找到满足阈值的，使用最高分
  if (bestPeriod === 0) {
    let maxScore = 0;
    for (let i = 0; i < turningPointX.length; i++) {
      if (turningPointX[i] >= MIN_SAMPLES && turningPointY[i] > maxScore) {
        maxScore = turningPointY[i];
        bestPeriod = turningPointX[i];
      }
    }
  }
  
  if (bestPeriod === 0) return null;
  
  const frequency = sampleRate / bestPeriod;
  
  // 限制频率范围（吉他标准频率范围约 60-450Hz）
  if (frequency < 60 || frequency > 450) return null;
  
  return frequency;
};

// 获取音符频率
const getNoteFrequency = (note: string): number => {
  if (note === 'B1') return 61.74;
  if (note === 'C2') return 65.41;
  return NOTE_FREQUENCIES[note] || 440;
};

// 获取音符显示名称
const getNoteDisplay = (note: string): string => {
  return note.replace(/\d/, '');
};

const GuitarTuner: React.FC = () => {
  const [selectedTuning, setSelectedTuning] = useState<string>('standard');
  const [playingString, setPlayingString] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [detectedString, setDetectedString] = useState<number | null>(null);
  const [detectedFreq, setDetectedFreq] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [volume, setVolume] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { token } = theme.useToken();

  const currentTuning = TUNINGS.find(t => t.name === selectedTuning) || TUNINGS[0];

  // 停止播放
  const stopAllSounds = useCallback(() => {
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    gainNodesRef.current.forEach(gain => gain.disconnect());
    oscillatorsRef.current = [];
    gainNodesRef.current = [];
    setPlayingString(null);
  }, []);

  // 播放音符
  const playNote = useCallback((frequency: number, stringIndex: number) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    stopAllSounds();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.5, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    osc1.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc2.frequency.setValueAtTime(frequency * 2, ctx.currentTime);
    osc3.frequency.setValueAtTime(frequency * 3, ctx.currentTime);

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc3.type = 'sine';

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const gain3 = ctx.createGain();

    gain1.gain.setValueAtTime(1, ctx.currentTime);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime);
    gain3.gain.setValueAtTime(0.15, ctx.currentTime);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);
    gain1.connect(masterGain);
    gain2.connect(masterGain);
    gain3.connect(masterGain);

    const decayTime = 2.5;
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decayTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decayTime);
    gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decayTime);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc3.start(ctx.currentTime);

    osc1.stop(ctx.currentTime + decayTime);
    osc2.stop(ctx.currentTime + decayTime);
    osc3.stop(ctx.currentTime + decayTime);

    oscillatorsRef.current = [osc1, osc2, osc3];
    gainNodesRef.current = [gain1, gain2, gain3, masterGain];

    setPlayingString(stringIndex);
    setTimeout(() => setPlayingString(null), decayTime * 1000);
  }, [stopAllSounds]);

  // 使用 ref 来跟踪监听状态，避免循环依赖
  const isListeningRef = useRef(false);

  // 显示权限帮助弹窗
  const showPermissionHelp = () => {
    Modal.info({
      title: '需要麦克风权限',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div style={{ marginTop: 16 }}>
          <p>吉他调音器需要访问麦克风来识别音高。</p>
          {isAndroid() ? (
            <>
              <p style={{ marginTop: 12, fontWeight: 'bold' }}>Android 用户:</p>
              <ol style={{ paddingLeft: 20 }}>
                <li>点击"确定"关闭此弹窗</li>
                <li>当系统弹出权限请求时，请点击"允许"</li>
                <li>如果之前拒绝了权限，请前往：<br/>设置 → 应用 → AITool → 权限 → 麦克风 → 允许</li>
              </ol>
            </>
          ) : (
            <>
              <p style={{ marginTop: 12 }}>请在浏览器弹出的权限请求中选择"允许"。</p>
            </>
          )}
        </div>
      ),
      onOk() {
        // 用户关闭弹窗后，再次尝试申请权限
        requestMicrophonePermission();
      },
    });
  };

  // 申请麦克风权限
  const requestMicrophonePermission = async () => {
    try {
      setErrorMsg('');
      setPermissionDenied(false);

      // 先检查权限状态（如果浏览器支持）
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (permissionStatus.state === 'denied') {
            setPermissionDenied(true);
            setErrorMsg(isAndroid() ? '麦克风权限被拒绝，请前往系统设置开启' : '麦克风权限被拒绝');
            return;
          }
        } catch (e) {
          // 某些浏览器不支持查询麦克风权限，继续尝试
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });
      mediaStreamRef.current = stream;

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      isListeningRef.current = true;
      setIsListening(true);

      // 开始检测循环
      const buffer = new Float32Array(analyser.fftSize);
      
      const detect = () => {
        if (!analyserRef.current || !isListeningRef.current) return;

        analyserRef.current.getFloatTimeDomainData(buffer);
        
        // 计算音量
        let rms = 0;
        for (let i = 0; i < buffer.length; i++) {
          rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / buffer.length);
        setVolume(rms);

        const frequency = detectPitch(buffer, ctx.sampleRate);

        if (frequency) {
          setDetectedFreq(frequency);

          // 找到最接近的弦
          let closestString = -1;
          let minDiff = Infinity;

          currentTuning.strings.forEach((note, index) => {
            const targetFreq = getNoteFrequency(note);
            const diff = Math.abs(frequency - targetFreq);
            const cents = 1200 * Math.log2(frequency / targetFreq);

            if (Math.abs(cents) < 100 && diff < minDiff) {
              minDiff = diff;
              closestString = index;
            }
          });

          if (closestString !== -1) {
            setDetectedString(closestString);
          } else {
            setDetectedString(null);
          }
        }

        animationFrameRef.current = requestAnimationFrame(detect);
      };

      detect();
    } catch (err) {
      console.error('Microphone access error:', err);
      setPermissionDenied(true);

      // 根据错误类型显示不同提示
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMsg(isAndroid()
            ? '麦克风权限被拒绝，请检查应用权限设置'
            : '麦克风权限被拒绝，请在浏览器设置中允许访问'
          );
        } else if (err.name === 'NotFoundError') {
          setErrorMsg('未找到麦克风设备');
        } else if (err.name === 'NotReadableError') {
          setErrorMsg('麦克风被其他应用占用');
        } else {
          setErrorMsg(`麦克风错误: ${err.message}`);
        }
      } else {
        setErrorMsg('无法访问麦克风，请检查权限设置');
      }
    }
  };

  // 停止监听
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
    setDetectedString(null);
    setDetectedFreq(null);
    setVolume(0);
  }, []);

  // 组件卸载清理
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      stopListening();
      stopAllSounds();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopListening, stopAllSounds]);

  // 切换监听状态
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      // 如果之前权限被拒绝，显示帮助弹窗
      if (permissionDenied) {
        showPermissionHelp();
      } else {
        requestMicrophonePermission();
      }
    }
  };

  return (
    <div style={{ padding: '8px 0', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Block>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>

            {/* 调弦选择 */}
            <Select
              value={selectedTuning}
              onChange={setSelectedTuning}
              style={{ width: '100%' }}
              size="large"
              listHeight={300}
            >
              {TUNINGS.map(tuning => (
                <Option key={tuning.name} value={tuning.name}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{tuning.description}</span>
                    <span style={{ fontSize: 12, color: token.colorTextSecondary, marginLeft: 8 }}>
                      {tuning.strings.map(n => getNoteDisplay(n)).join('-')}
                    </span>
                  </div>
                </Option>
              ))}
            </Select>

            {/* 吉他琴头形状的弦按钮 - 竖直布局 */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '20px 0',
              position: 'relative'
            }}>
              {/* 吉他琴头背景 */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 200,
                height: 320,
                background: token.colorFillAlter,
                borderRadius: '30px 30px 50px 50px',
                border: `2px solid ${token.colorBorder}`,
                zIndex: 0
              }} />

              {/* 左侧弦轴 (6,5,4弦) */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                padding: '20px 16px',
                zIndex: 1,
                alignItems: 'flex-end'
              }}>
                {[0, 1, 2].map((index) => {
                  const note = currentTuning.strings[index];
                  const isPlaying = playingString === index;
                  const isDetected = detectedString === index && isListening;
                  const stringNum = 6 - index;

                  return (
                    <Button
                      key={index}
                      type={isPlaying ? "primary" : "default"}
                      shape="circle"
                      size="large"
                      onClick={() => playNote(getNoteFrequency(note), index)}
                      style={{
                        width: 64,
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `3px solid ${isDetected ? '#52c41a' : isPlaying ? token.colorPrimary : token.colorBorder}`,
                        boxShadow: isDetected
                          ? `0 0 25px #52c41a80`
                          : isPlaying
                            ? `0 0 20px ${token.colorPrimary}40`
                            : `inset 0 2px 4px rgba(0,0,0,0.1)`,
                        background: isDetected ? '#52c41a' : isPlaying ? token.colorPrimary : token.colorBgElevated,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: 16,
                          fontWeight: 'bold',
                          color: isDetected || isPlaying ? '#fff' : token.colorText
                        }}>
                          {getNoteDisplay(note)}
                        </div>
                        <div style={{
                          fontSize: 10,
                          color: isDetected || isPlaying ? '#ffffff80' : token.colorTextSecondary,
                          marginTop: 2
                        }}>
                          {stringNum}弦
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>

              {/* 中间分隔 */}
              <div style={{ width: 20, zIndex: 1 }} />

              {/* 右侧弦轴 (3,2,1弦) */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                padding: '20px 16px',
                zIndex: 1,
                alignItems: 'flex-start'
              }}>
                {[3, 4, 5].map((index) => {
                  const note = currentTuning.strings[index];
                  const isPlaying = playingString === index;
                  const isDetected = detectedString === index && isListening;
                  const stringNum = 6 - index;

                  return (
                    <Button
                      key={index}
                      type={isPlaying ? "primary" : "default"}
                      shape="circle"
                      size="large"
                      onClick={() => playNote(getNoteFrequency(note), index)}
                      style={{
                        width: 64,
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `3px solid ${isDetected ? '#52c41a' : isPlaying ? token.colorPrimary : token.colorBorder}`,
                        boxShadow: isDetected
                          ? `0 0 25px #52c41a80`
                          : isPlaying
                            ? `0 0 20px ${token.colorPrimary}40`
                            : `inset 0 2px 4px rgba(0,0,0,0.1)`,
                        background: isDetected ? '#52c41a' : isPlaying ? token.colorPrimary : token.colorBgElevated,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: 16,
                          fontWeight: 'bold',
                          color: isDetected || isPlaying ? '#fff' : token.colorText
                        }}>
                          {getNoteDisplay(note)}
                        </div>
                        <div style={{
                          fontSize: 10,
                          color: isDetected || isPlaying ? '#ffffff80' : token.colorTextSecondary,
                          marginTop: 2
                        }}>
                          {stringNum}弦
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
            
            {/* 麦克风控制 */}
            <div style={{ textAlign: 'center' }}>
            <Button
                type={isListening ? "primary" : "default"}
                icon={isListening ? <AudioOutlined /> : <AudioMutedOutlined />}
                onClick={toggleListening}
                size="large"
                danger={isListening}
                block
            >
                {isListening ? '停止监听' : '开始监听麦克风'}
            </Button>
            {errorMsg && (
                <div style={{ color: token.colorError, fontSize: 13, marginTop: 8 }}>
                  {errorMsg}
                  {permissionDenied && isAndroid() && (
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      提示：请前往 设置 → 应用 → AITool → 权限 → 麦克风 → 允许
                    </div>
                  )}
                </div>
            )}
            </div>
          </div>
        </Block>

        

        {/* 音高偏差指示器 - 始终显示 */}
        <Block>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: token.colorTextSecondary, marginBottom: 16, fontWeight: 500 }}>音准指示</div>
            
            {/* 当前检测信息 - 固定高度防止跳动 */}
            <div style={{ minHeight: 48, marginBottom: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {(() => {
                const hasDetection = isListening && detectedFreq && detectedString !== null;
                return (
                  <>
                    <Text strong style={{ 
                      fontSize: 20, 
                      color: hasDetection ? token.colorText : token.colorTextTertiary,
                      opacity: hasDetection ? 1 : 0.4,
                      transition: 'all 0.2s'
                    }}>
                      {hasDetection ? `${6 - detectedString}弦 ${getNoteDisplay(currentTuning.strings[detectedString])}` : '- 弦'}
                    </Text>
                    <div style={{ 
                      fontSize: 12, 
                      color: hasDetection ? token.colorTextSecondary : token.colorTextTertiary,
                      marginTop: 2,
                      opacity: hasDetection ? 1 : 0.4,
                      transition: 'all 0.2s',
                      minHeight: 18
                    }}>
                      {hasDetection 
                        ? `${detectedFreq.toFixed(1)} Hz / 目标 ${getNoteFrequency(currentTuning.strings[detectedString]).toFixed(1)} Hz`
                        : isListening 
                          ? (volume < 0.005 ? '音量太小，请靠近弹奏' : '请弹奏吉他弦...')
                          : '点击开始监听麦克风'
                      }
                    </div>
                  </>
                );
              })()}
            </div>
            
            {/* 音高偏差指示器 - 精美设计 */}
            <div style={{ 
              position: 'relative', 
              margin: '16px 20px 24px',
              height: 50,
              display: 'flex',
              alignItems: 'center'
            }}>
              {/* 背景轨道 */}
              <div style={{
                width: '100%',
                height: 12,
                background: token.colorFillTertiary,
                borderRadius: 6,
                position: 'relative',
                overflow: 'visible'
              }}>
                {/* 渐变填充 */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: 6,
                  background: `linear-gradient(to right, 
                    ${token.colorError}80 0%, 
                    ${token.colorWarning}60 35%, 
                    #52c41a 45%, 
                    #52c41a 55%, 
                    ${token.colorWarning}60 65%, 
                    ${token.colorError}80 100%)`
                }} />
                
                {/* 中心目标线 */}
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  top: -4,
                  bottom: -4,
                  width: 4,
                  background: '#52c41a',
                  borderRadius: 2,
                  transform: 'translateX(-50%)',
                  zIndex: 2,
                  boxShadow: '0 0 4px rgba(82, 196, 26, 0.5)'
                }} />
                
                {/* 指针 - 始终存在，只是透明度变化 */}
                {(() => {
                  let position = 50;
                  let opacity = 0.2;
                  let color = token.colorTextTertiary;
                  
                  if (isListening && detectedFreq && detectedString !== null) {
                    const targetFreq = getNoteFrequency(currentTuning.strings[detectedString]);
                    const cents = 1200 * Math.log2(detectedFreq / targetFreq);
                    const clampedCents = Math.max(-50, Math.min(50, cents));
                    position = 50 + (clampedCents / 50) * 50;
                    opacity = 1;
                    const absCents = Math.abs(cents);
                    if (absCents < 5) color = '#52c41a';
                    else if (absCents < 20) color = token.colorWarning;
                    else color = token.colorError;
                  }
                  
                  return (
                    <div style={{
                      position: 'absolute',
                      left: `${position}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 3,
                      opacity,
                      transition: 'all 0.15s ease-out'
                    }}>
                      {/* 指针三角形 */}
                      <div style={{
                        width: 0,
                        height: 0,
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        borderTop: `16px solid ${color}`,
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                        margin: '0 auto'
                      }} />
                      {/* 指针底部圆点 */}
                      <div style={{
                        width: 12,
                        height: 12,
                        background: color,
                        borderRadius: '50%',
                        border: '2px solid #fff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        margin: '-6px auto 0',
                        position: 'relative',
                        zIndex: 4
                      }} />
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {/* 刻度标签 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 20px',
              marginTop: -16,
              marginBottom: 12
            }}>
              <span style={{ fontSize: 10, color: token.colorTextTertiary }}>偏低</span>
              <span style={{ fontSize: 10, color: '#52c41a', fontWeight: 500 }}>准</span>
              <span style={{ fontSize: 10, color: token.colorTextTertiary }}>偏高</span>
            </div>
            
            {/* 偏差数值 - 固定高度 */}
            <div style={{ minHeight: 24 }}>
              {(() => {
                const hasDetection = isListening && detectedFreq && detectedString !== null;
                if (!hasDetection) {
                  return (
                    <div style={{ fontSize: 14, color: token.colorTextTertiary, opacity: 0.5 }}>
                      —
                    </div>
                  );
                }
                const targetFreq = getNoteFrequency(currentTuning.strings[detectedString]);
                const cents = 1200 * Math.log2(detectedFreq / targetFreq);
                const absCents = Math.abs(cents);
                const isInTune = absCents < 5;
                
                return (
                  <div style={{ 
                    fontSize: 16, 
                    color: isInTune ? '#52c41a' : cents > 0 ? token.colorError : token.colorWarning,
                    fontWeight: 'bold',
                    transition: 'color 0.2s'
                  }}>
                    {isInTune ? '✓ 音准正确' : cents > 0 ? `↑ 偏高 ${cents.toFixed(1)}¢` : `↓ 偏低 ${absCents.toFixed(1)}¢`}
                  </div>
                );
              })()}
            </div>
          </div>
        </Block>

        {/* 调弦说明 */}
        <Block>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <InfoCircleOutlined style={{ color: token.colorPrimary }} />
              <Text strong>{currentTuning.description}</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {getTuningDescription(currentTuning.name)}
            </Text>
          </div>
        </Block>

        {/* 使用说明 */}
        <Block>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <Text strong>使用说明</Text>
            <ul style={{ margin: 0, paddingLeft: 16, color: token.colorTextSecondary, fontSize: 13 }}>
              <li>点击"开始监听麦克风"启用音高识别功能</li>
              <li>弹奏吉他弦，对应的按钮会变绿表示音准正确</li>
              <li>也可点击弦按钮播放标准音高进行手动调音</li>
              <li>绿色进度条表示音准准确度</li>
            </ul>
          </div>
        </Block>
      </div>
    </div>
  );
};

// 获取调弦描述
function getTuningDescription(tuningName: string): string {
  const descriptions: Record<string, string> = {
    'standard': '最常用的吉他调弦方式，适合大多数音乐风格。从6弦到1弦依次为 E-A-D-G-B-E。',
    'drop_d': '将6弦降低一个全音到D，适合演奏重金属和摇滚音乐，可以演奏强力和弦。',
    'half_step_down': '所有弦都降低半音，音高为 Eb-Ab-Db-Gb-Bb-Eb。常见于布鲁斯和摇滚音乐。',
    'whole_step_down': '所有弦都降低全音，音高为 D-G-C-F-A-D。音色更加浑厚温暖。',
    'drop_c': ' Drop D 基础上再降低一个全音，常用于极端金属风格。',
    'open_g': '开放G和弦调弦，滑棒吉他常用调弦，也是很多布鲁斯音乐的首选。',
    'open_d': '开放D大调和弦调弦，音色明亮，适合指弹和民谣风格。',
    'dadgad': '凯尔特音乐常用调弦，具有独特的空灵和氛围感，适合演奏爱尔兰和苏格兰音乐。',
    'open_e': '开放E大调和弦调弦，音色明亮，滑棒吉他手常用。',
    'open_a': '开放A大调和弦调弦，布鲁斯滑棒吉他常用。',
    'open_c': '开放C大调和弦调弦，音色低沉，适合指弹和氛围音乐。',
    'double_drop_d': '将6弦和1弦都降到D，形成Dsus4和弦，常见于民谣音乐。',
    'drop_b': '极低的调弦，用于七弦吉他或极端金属风格。',
    'modal_d': '也称为Dsus4调弦，具有特殊的悬浮感，适合氛围和凯尔特音乐。',
    'nick Drake': '英国民谣歌手 Nick Drake 常用调弦，适合指弹和创作型演奏。'
  };
  return descriptions[tuningName] || '';
}

export default GuitarTuner;
