import { useState, useRef, useCallback, useEffect } from 'react';
import { Button, List, Typography, Tag, Space, message, Empty, Divider, Upload } from 'antd';
import { ScanOutlined, CameraOutlined, CopyOutlined, DeleteOutlined, CheckCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { BrowserQRCodeReader } from '@zxing/browser';
import { QRCodeReader, DecodeHintType, BinaryBitmap, HybridBinarizer, RGBLuminanceSource, BarcodeFormat } from '@zxing/library';
import Block from '../lib/Block';
import Page from '../lib/Page';

const { Text, Paragraph } = Typography;

interface ScanRecord {
  id: string;
  content: string;
  timestamp: number;
  type: 'url' | 'text' | 'wifi' | 'other';
}

const QRCodeScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [lastScanned, setLastScanned] = useState<ScanRecord | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
  interface ScannerControls {
    stop: () => void;
  }
  const stopRef = useRef<ScannerControls | null>(null);

  // 历史记录仅保存在内存中，页面刷新后清空

  // 判断内容类型
  const detectType = (content: string): ScanRecord['type'] => {
    if (content.startsWith('http://') || content.startsWith('https://')) {
      return 'url';
    }
    if (content.startsWith('WIFI:')) {
      return 'wifi';
    }
    if (content.match(/^\w+@[\w.]+$/)) {
      return 'text';
    }
    return 'text';
  };

  // 检查并请求摄像头权限
  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      // 检查权限状态
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (result.state === 'granted') {
          return true;
        }
      }
      
      // 尝试获取媒体流来触发权限请求
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('摄像头权限检查失败:', error);
      return false;
    }
  };

  // 开始扫描
  const startScan = useCallback(async () => {
    // 先检查权限
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) {
      message.error('需要摄像头权限才能扫码，请在系统设置中允许访问摄像头');
      return;
    }

    setIsScanning(true);
    setLastScanned(null);
    // 摄像头初始化将在 useEffect 中完成
  }, []);

  // 停止扫描
  const stopScan = useCallback(() => {
    // 停止视频流
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (stopRef.current) {
      stopRef.current.stop();
      stopRef.current = null;
    }
    codeReaderRef.current = null;
    setIsScanning(false);
  }, []);

  // 初始化扫描 - 在 video 元素渲染后调用
  const initScan = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      const codeReader = new BrowserQRCodeReader();
      codeReaderRef.current = codeReader;

      // 使用 decodeFromVideoDevice
      const result = await codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (error) return;
          
          if (result) {
            const content = result.getText();
            const newRecord: ScanRecord = {
              id: Date.now().toString(),
              content,
              timestamp: Date.now(),
              type: detectType(content),
            };
            
            setLastScanned(newRecord);
            setHistory(prev => [newRecord, ...prev]);
            message.success('扫码成功');
            
            // 自动停止扫描
            stopScan();
          }
        }
      );

      stopRef.current = result as unknown as ScannerControls;
    } catch (error) {
      console.error('摄像头启动失败:', error);
      message.error('无法访问摄像头，请检查权限设置');
      setIsScanning(false);
    }
  }, [stopScan]);

  // 当开始扫描且 video 元素准备好后，初始化摄像头
  useEffect(() => {
    if (isScanning && videoRef.current) {
      initScan();
    }
  }, [isScanning, initScan]);

  // 复制单个记录
  const copyRecord = (content: string) => {
    navigator.clipboard.writeText(content);
    message.success('已复制到剪贴板');
  };

  // 删除记录
  const deleteRecord = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
    message.success('已删除');
  };

  // 清空历史
  const clearHistory = () => {
    setHistory([]);
    message.success('已清空历史记录');
  };

  // 使用核心库解码
  const decodeWithLibrary = (canvas: HTMLCanvasElement): string | null => {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // 转换为灰度数据
      const grayscaleData = new Uint8ClampedArray(imageData.width * imageData.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        // 使用标准灰度公式
        grayscaleData[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
      
      const luminanceSource = new RGBLuminanceSource(
        grayscaleData,
        imageData.width,
        imageData.height
      );
      const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
      
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      
      const reader = new QRCodeReader();
      const result = reader.decode(binaryBitmap, hints);
      return result.getText();
    } catch (err) {
      console.log('核心库解码失败:', err);
      return null;
    }
  };

  // 从图片文件解码二维码
  const decodeFromImage = useCallback(async (file: File) => {
    try {
      const imageUrl = URL.createObjectURL(file);
      
      // 创建图片元素并等待加载
      const img = document.createElement('img');
      img.src = imageUrl;
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片加载失败'));
        img.onabort = () => reject(new Error('图片加载被取消'));
      });
      
      URL.revokeObjectURL(imageUrl);
      
      // 尝试不同尺寸缩放解码
      const tryDecode = (scale: number): string | null => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        // 缩放图片
        canvas.width = img.naturalWidth * scale;
        canvas.height = img.naturalHeight * scale;
        
        // 使用更好的图像质量
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        return decodeWithLibrary(canvas);
      };
      
      let content: string | null = null;
      
      // 尝试不同缩放比例
      const scales = [1, 0.8, 1.2, 0.5, 1.5, 2];
      for (const scale of scales) {
        content = tryDecode(scale);
        if (content) break;
      }
      
      if (content) {
        const newRecord: ScanRecord = {
          id: Date.now().toString(),
          content,
          timestamp: Date.now(),
          type: detectType(content),
        };
        
        setLastScanned(newRecord);
        setHistory(prev => [newRecord, ...prev]);
        message.success('图片识别成功');
      } else {
        throw new Error('无法识别二维码');
      }
    } catch (error) {
      console.error('二维码识别失败:', error);
      message.error('无法识别图片中的二维码，请尝试其他图片或调整图片清晰度');
    }
  }, []);

  // 获取类型标签颜色
  const getTypeColor = (type: ScanRecord['type']) => {
    switch (type) {
      case 'url': return 'blue';
      case 'wifi': return 'green';
      case 'text': return 'default';
      default: return 'default';
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <Page maxWidth={800}>
      <Block>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ScanOutlined style={{ color: '#1677ff' }} />
          <Text strong>二维码扫描</Text>
        </div>

        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          点击开始扫描，将摄像头对准二维码即可自动识别
          <br />
          <Text type="warning" style={{ fontSize: 12 }}>
            需要授予摄像头权限。如果无法启动，请使用"上传图片"功能
          </Text>
        </Paragraph>

        {/* 扫描区域 */}
        <div style={{ 
          width: '100%', 
          maxWidth: 400, 
          margin: '0 auto 24px',
          aspectRatio: '1',
          background: '#f0f0f0',
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {isScanning ? (
            <>
              <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                autoPlay
                playsInline
                muted
                disablePictureInPicture
                webkit-playsinline="true"
              />
              {/* 扫描框 */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 200,
                height: 200,
                border: '2px solid rgba(22, 119, 255, 0.8)',
                borderRadius: 8,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
              }}>
                {/* 扫描线动画 */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: '#1677ff',
                  animation: 'scanLine 2s linear infinite',
                }} />
              </div>
              <style>{`
                @keyframes scanLine {
                  0% { top: 0; }
                  50% { top: 100%; }
                  100% { top: 0; }
                }
              `}</style>
            </>
          ) : (
            <div
              onClick={startScan}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                cursor: 'pointer',
              }}
            >
              <CameraOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />
              <Text type="secondary">点击开始扫描</Text>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}>
          {isScanning ? (
            <Button danger size="large" onClick={stopScan} block>
              停止扫描
            </Button>
          ) : (
            <>
              <Button
                type="primary"
                size="large"
                icon={<ScanOutlined />}
                onClick={startScan}
                style={{ flex: 1, minWidth: 120, maxWidth: 160 }}
              >
                开始扫描
              </Button>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  decodeFromImage(file);
                  return false;
                }}
              >
                <Button
                  size="large"
                  icon={<UploadOutlined />}
                  style={{ flex: 1, minWidth: 120, maxWidth: 160 }}
                >
                  选择图片
                </Button>
              </Upload>
            </>
          )}
        </div>

        {/* 上次扫描结果 */}
        {lastScanned && (
          <>
            <Divider />
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text strong>扫描结果</Text>
                <Tag color={getTypeColor(lastScanned.type)}>{lastScanned.type.toUpperCase()}</Tag>
              </div>
              <div style={{ 
                padding: 12, 
                background: '#f6ffed', 
                borderRadius: 8,
                border: '1px solid #b7eb8f',
                wordBreak: 'break-all',
              }}>
                <Text copyable={{ text: lastScanned.content }}>
                  {lastScanned.content}
                </Text>
              </div>
              {lastScanned.type === 'url' && (
                <Button
                  type="link"
                  onClick={() => window.open(lastScanned.content, '_blank')}
                  style={{ paddingLeft: 0, marginTop: 8 }}
                >
                  打开链接 →
                </Button>
              )}
            </div>
          </>
        )}
      </Block>

      {/* 扫描历史 */}
      <Block>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ScanOutlined style={{ color: '#722ed1' }} />
            <Text strong>扫描历史</Text>
            <Tag>{history.length}</Tag>
          </div>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            onClick={clearHistory}
            disabled={history.length === 0}
          >
            清空
          </Button>
        </div>

        {history.length === 0 ? (
          <Empty description="暂无扫描记录" />
        ) : (
          <List
            size="small"
            dataSource={history}
            renderItem={(item) => (
              <List.Item
                onClick={() => copyRecord(item.content)}
                style={{ cursor: 'pointer', padding: '12px 0' }}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatTime(item.timestamp)}
                      </Text>
                    </Space>
                  }
                  description={
                    <Text style={{ maxWidth: '100%' }}>
                      {item.content}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Block>
    </Page>
  );
};

export default QRCodeScanner;
