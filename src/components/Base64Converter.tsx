import React, { useState } from "react";
import {
  Input,
  Button,
  Typography,
  message,
  Row,
  Col,
  theme,
} from "antd";
import {
  CopyOutlined,
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import { nativeAPI } from "../services/nativeAPI";
import Block from '../lib/Block';

const { Text } = Typography;
const { TextArea } = Input;

const Base64Converter: React.FC = () => {
  // 编码区域状态
  const [encodeInput, setEncodeInput] = useState<string>("");
  const [encodeOutput, setEncodeOutput] = useState<string>("");
  // 解码区域状态
  const [decodeInput, setDecodeInput] = useState<string>("");
  const [decodeOutput, setDecodeOutput] = useState<string>("");
  
  const { token } = theme.useToken();

  // Base64 编码
  const encodeToBase64 = (text: string): string => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const binaryString = Array.from(data)
      .map((byte) => String.fromCharCode(byte))
      .join("");
    return btoa(binaryString);
  };

  // Base64 解码
  const decodeFromBase64 = (base64: string): string => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  };

  // 执行编码
  const handleEncode = () => {
    if (!encodeInput.trim()) {
      message.warning("请输入要编码的内容");
      return;
    }
    try {
      const result = encodeToBase64(encodeInput);
      setEncodeOutput(result);
    } catch {
      message.error("编码失败");
    }
  };

  // 执行解码
  const handleDecode = () => {
    if (!decodeInput.trim()) {
      message.warning("请输入要解码的内容");
      return;
    }
    try {
      const result = decodeFromBase64(decodeInput.trim());
      setDecodeOutput(result);
    } catch {
      message.error("解码失败，请检查输入是否为有效的 Base64 字符串");
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    if (!text) {
      message.warning("没有可复制的内容");
      return;
    }
    await nativeAPI.clipboard.write(text);
    message.success("已复制");
  };

  return (
    <div style={{ padding: '8px 0', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* 编码区域 */}
        <Block>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LockOutlined style={{ color: token.colorPrimary }} />
              <Text strong>文本 → Base64 编码</Text>
            </div>
            <Row gutter={16}>
              <Col xs={24} lg={12}>
                <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                  原始文本
                </Text>
                <TextArea
                  value={encodeInput}
                  onChange={(e) => setEncodeInput(e.target.value)}
                  placeholder="请输入要编码的文本..."
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  style={{ fontFamily: "monospace" }}
                />
              </Col>
              <Col xs={24} lg={12}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text type="secondary">Base64 结果</Text>
                  <Button
                    type="link"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(encodeOutput)}
                    style={{ padding: 0, height: "auto" }}
                  >
                    复制
                  </Button>
                </div>
                <TextArea
                  value={encodeOutput}
                  readOnly
                  placeholder="编码结果"
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  style={{ fontFamily: "monospace", background: token.colorFillAlter }}
                />
              </Col>
            </Row>
            <Button
              type="primary"
              block
              onClick={handleEncode}
            >
              编码
            </Button>
          </div>
        </Block>

        {/* 解码区域 */}
        <Block>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UnlockOutlined style={{ color: token.colorPrimary }} />
              <Text strong>Base64 → 文本 解码</Text>
            </div>
            <Row gutter={16}>
              <Col xs={24} lg={12}>
                <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                  Base64 字符串
                </Text>
                <TextArea
                  value={decodeInput}
                  onChange={(e) => setDecodeInput(e.target.value)}
                  placeholder="请输入要解码的 Base64 字符串..."
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  style={{ fontFamily: "monospace" }}
                />
              </Col>
              <Col xs={24} lg={12}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text type="secondary">解码结果</Text>
                  <Button
                    type="link"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(decodeOutput)}
                    style={{ padding: 0, height: "auto" }}
                  >
                    复制
                  </Button>
                </div>
                <TextArea
                  value={decodeOutput}
                  readOnly
                  placeholder="解码结果"
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  style={{ fontFamily: "monospace", background: token.colorFillAlter }}
                />
              </Col>
            </Row>
            <Button
              type="primary"
              block
              onClick={handleDecode}
            >
              解码
            </Button>
          </div>
        </Block>
      </div>
    </div>
  );
};

export default Base64Converter;
