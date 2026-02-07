import { useState, useRef, useCallback } from 'react';
import { Input, Button, Typography, Space, Radio, Slider, message, Card, Divider } from 'antd';
import { QrcodeOutlined, DownloadOutlined, CopyOutlined, ClearOutlined } from '@ant-design/icons';
import QRCode from 'qrcode';
import Block from '../lib/Block';
import Page from '../lib/Page';
import { nativeAPI } from '../services/nativeAPI';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;



const QRCodeGenerator: React.FC = () => {
  const [text, setText] = useState('');
  const [size, setSize] = useState(256);
  const [margin, setMargin] = useState(4);
  const [errorLevel, setErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [colorDark, setColorDark] = useState('#000000');
  const [colorLight, setColorLight] = useState('#ffffff');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);

  // 生成二维码
  const generateQRCode = useCallback(async () => {
    if (!text.trim()) {
      message.warning('请输入要生成二维码的内容');
      return;
    }

    if (!canvasRef.current) return;

    try {
      await QRCode.toCanvas(
        canvasRef.current,
        text,
        {
          width: size,
          margin: margin,
          color: {
            dark: colorDark,
            light: colorLight,
          },
          errorCorrectionLevel: errorLevel,
        }
      );
      setGenerated(true);
      message.success('二维码生成成功');
    } catch (err) {
      message.error('生成二维码失败');
      console.error(err);
    }
  }, [text, size, margin, colorDark, colorLight, errorLevel]);

  // 下载二维码
  const downloadQRCode = useCallback(async () => {
    if (!canvasRef.current || !generated) {
      message.warning('请先生成二维码');
      return;
    }

    const dataUrl = canvasRef.current.toDataURL('image/png');
    const success = await nativeAPI.file.saveBase64Image(dataUrl, `qrcode-${Date.now()}.png`);
    if (success) {
      message.success('已保存');
    } else {
      message.error('保存失败');
    }
  }, [generated]);

  // 复制二维码图片
  const copyQRCode = useCallback(async () => {
    if (!canvasRef.current || !generated) {
      message.warning('请先生成二维码');
      return;
    }

    try {
      canvasRef.current.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          message.success('已复制到剪贴板');
        }
      });
    } catch {
      message.error('复制失败');
    }
  }, [generated]);

  // 清空内容
  const clearContent = () => {
    setText('');
    setGenerated(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  // 预设颜色
  const colorPresets = [
    { dark: '#000000', light: '#ffffff', name: '黑白' },
    { dark: '#1677ff', light: '#ffffff', name: '蓝色' },
    { dark: '#52c41a', light: '#ffffff', name: '绿色' },
    { dark: '#722ed1', light: '#ffffff', name: '紫色' },
    { dark: '#eb2f96', light: '#ffffff', name: '粉色' },
    { dark: '#fa541c', light: '#ffffff', name: '橙色' },
    { dark: '#135200', light: '#d9f7be', name: '深绿' },
  ];

  return (
    <Page maxWidth={800}>
      <Block>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <QrcodeOutlined style={{ color: '#1677ff' }} />
          <Text strong>二维码生成</Text>
        </div>

        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          输入文本内容，生成对应的二维码图片
        </Paragraph>

        {/* 输入区域 */}
        <TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入要生成二维码的文本，如网址、联系方式、WiFi密码等..."
          rows={4}
          style={{ marginBottom: 16 }}
          maxLength={2000}
          showCount
        />

        {/* 快捷输入 */}
        <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <Text type="secondary">快捷：</Text>
          <Button size="small" onClick={() => setText('https://')}>网址</Button>
          <Button size="small" onClick={() => setText('WIFI:T:WPA;S:WiFi名称;P:密码;;')}>WiFi</Button>
          <Button size="small" onClick={() => setText('mailto:example@email.com')}>邮箱</Button>
          <Button size="small" onClick={() => setText('tel:+8612345678900')}>电话</Button>
          <Button size="small" danger icon={<ClearOutlined />} onClick={clearContent}>
            清空
          </Button>
        </Space>
      </Block>

      {/* 设置选项 */}
      <Block>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Text strong>生成选项</Text>
        </div>

        <Space style={{ width: '100%' }} size="large" vertical>
          {/* 尺寸 */}
          <div>
            <Text style={{ display: 'block', marginBottom: 8 }}>尺寸：{size}x{size}</Text>
            <Slider
              min={128}
              max={1024}
              step={64}
              value={size}
              onChange={setSize}
              marks={{ 128: '128', 256: '256', 512: '512', 1024: '1024' }}
            />
          </div>

          {/* 边距 */}
          <div>
            <Text style={{ display: 'block', marginBottom: 8 }}>边距：{margin}</Text>
            <Slider
              min={0}
              max={10}
              value={margin}
              onChange={setMargin}
              marks={{ 0: '0', 2: '2', 4: '4', 6: '6', 8: '8', 10: '10' }}
            />
          </div>

          {/* 纠错级别 */}
          <div>
            <Text style={{ display: 'block', marginBottom: 8 }}>纠错级别</Text>
            <Radio.Group value={errorLevel} onChange={(e) => setErrorLevel(e.target.value)}>
              <Radio.Button value="L">低 (7%)</Radio.Button>
              <Radio.Button value="M">中 (15%)</Radio.Button>
              <Radio.Button value="Q">较高 (25%)</Radio.Button>
              <Radio.Button value="H">高 (30%)</Radio.Button>
            </Radio.Group>
          </div>

          {/* 颜色预设 */}
          <div>
            <Text style={{ display: 'block', marginBottom: 8 }}>颜色风格</Text>
            <Space wrap>
              {colorPresets.map((preset) => (
                <Button
                  key={preset.name}
                  size="small"
                  style={{
                    background: preset.light,
                    color: preset.dark,
                    border: `2px solid ${colorDark === preset.dark ? '#1677ff' : preset.dark}`,
                  }}
                  onClick={() => {
                    setColorDark(preset.dark);
                    setColorLight(preset.light);
                  }}
                >
                  {preset.name}
                </Button>
              ))}
            </Space>
          </div>

          {/* 自定义颜色 */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <Text style={{ display: 'block', marginBottom: 4 }}>前景色</Text>
              <input
                type="color"
                value={colorDark}
                onChange={(e) => setColorDark(e.target.value)}
                style={{ width: 60, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }}
              />
            </div>
            <div>
              <Text style={{ display: 'block', marginBottom: 4 }}>背景色</Text>
              <input
                type="color"
                value={colorLight}
                onChange={(e) => setColorLight(e.target.value)}
                style={{ width: 60, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }}
              />
            </div>
          </div>
        </Space>

        <Divider />

        {/* 生成按钮 */}
        <Button 
          type="primary" 
          size="large" 
          block 
          icon={<QrcodeOutlined />}
          onClick={generateQRCode}
          disabled={!text.trim()}
        >
          生成二维码
        </Button>
      </Block>

      {/* 二维码展示 */}
      <Block>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Text strong>二维码预览</Text>
        </div>

        <Card style={{ textAlign: 'center', background: '#f5f5f5', minHeight: 200 }}>
          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            style={{
              maxWidth: '100%',
              height: 'auto',
              boxShadow: generated ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
              borderRadius: 4,
              display: generated ? 'block' : 'none',
              margin: '0 auto',
            }}
          />
          {!generated && (
            <div style={{ 
              height: 200, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#999',
            }}>
              <Text type="secondary">点击上方按钮生成二维码</Text>
            </div>
          )}
        </Card>

        {generated && (
          <Space style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>
            <Button type="primary" icon={<DownloadOutlined />} onClick={downloadQRCode}>
              下载图片
            </Button>
            <Button icon={<CopyOutlined />} onClick={copyQRCode}>
              复制图片
            </Button>
          </Space>
        )}
      </Block>
    </Page>
  );
};

export default QRCodeGenerator;
