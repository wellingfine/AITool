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
  SwapOutlined,
} from "@ant-design/icons";
import { nativeAPI } from "../services/nativeAPI";
import Block from '../lib/Block';
import Page from '../lib/Page';

const { Text } = Typography;
const { TextArea } = Input;

const UnicodeConverter: React.FC = () => {
  const [input, setInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  
  const { token } = theme.useToken();

  // 中文转 Unicode
  const chineseToUnicode = (text: string): string => {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code > 127) {
        result += "\\u" + code.toString(16).padStart(4, "0");
      } else {
        result += text[i];
      }
    }
    return result;
  };

  // Unicode 转中文
  const unicodeToChinese = (text: string): string => {
    return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
  };

  // ASCII 转 Unicode
  const asciiToUnicode = (text: string): string => {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      result += "\\u" + code.toString(16).padStart(4, "0");
    }
    return result;
  };

  // Unicode 转 ASCII
  const unicodeToAscii = (text: string): string => {
    return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
      const code = parseInt(hex, 16);
      // 只保留 ASCII 范围内的字符
      if (code <= 127) {
        return String.fromCharCode(code);
      }
      return String.fromCharCode(code);
    });
  };

  // 全部转 Unicode（包括所有字符）
  const allToUnicode = (text: string): string => {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      result += "\\u" + code.toString(16).padStart(4, "0");
    }
    return result;
  };

  // Unicode 转字符（全部）
  const unicodeToAll = (text: string): string => {
    return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
  };

  // 处理转换
  const handleConvert = (type: string) => {
    if (!input.trim()) {
      message.warning("请输入要转换的内容");
      return;
    }
    
    try {
      let result = "";
      switch (type) {
        case "chineseToUnicode":
          result = chineseToUnicode(input);
          break;
        case "unicodeToChinese":
          result = unicodeToChinese(input);
          break;
        case "asciiToUnicode":
          result = asciiToUnicode(input);
          break;
        case "unicodeToAscii":
          result = unicodeToAscii(input);
          break;
        case "allToUnicode":
          result = allToUnicode(input);
          break;
        case "unicodeToAll":
          result = unicodeToAll(input);
          break;
        default:
          result = input;
      }
      setOutput(result);
      message.success("转换成功");
    } catch {
      message.error("转换失败，请检查输入内容");
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

  // 清空内容
  const handleClear = () => {
    setInput("");
    setOutput("");
  };

  // 交换输入输出
  const handleSwap = () => {
    const temp = input;
    setInput(output);
    setOutput(temp);
  };

  return (
    <Page maxWidth={900}>
        <Block>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SwapOutlined style={{ color: token.colorPrimary }} />
              <Text strong>Unicode 编码转换</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              支持中文与 Unicode 互转、ASCII 与 Unicode 互转，在输入框中输入内容后点击对应按钮即可转换。
            </Text>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text strong>输入内容</Text>
                  <Button
                    type="link"
                    size="small"
                    onClick={handleClear}
                    style={{ padding: 0, height: "auto" }}
                  >
                    清空
                  </Button>
                </div>
                <TextArea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="请输入要转换的内容..."
                  autoSize={{ minRows: 6, maxRows: 12 }}
                  style={{ fontFamily: "monospace" }}
                />
              </Col>
              <Col xs={24} lg={12}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text strong>转换结果</Text>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      type="link"
                      size="small"
                      icon={<SwapOutlined />}
                      onClick={handleSwap}
                      style={{ padding: 0, height: "auto" }}
                    >
                      交换
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(output)}
                      style={{ padding: 0, height: "auto" }}
                    >
                      复制
                    </Button>
                  </div>
                </div>
                <TextArea
                  value={output}
                  readOnly
                  placeholder="转换结果将显示在这里..."
                  autoSize={{ minRows: 6, maxRows: 12 }}
                  style={{ fontFamily: "monospace", background: token.colorFillAlter }}
                />
              </Col>
            </Row>

            <Row gutter={[8, 8]}>
              <Col xs={12} sm={8} md={6} lg={4}>
                <Button type="primary" block onClick={() => handleConvert("chineseToUnicode")}>
                  中文 → Unicode
                </Button>
              </Col>
              <Col xs={12} sm={8} md={6} lg={4}>
                <Button type="primary" block onClick={() => handleConvert("unicodeToChinese")}>
                  Unicode → 中文
                </Button>
              </Col>
              <Col xs={12} sm={8} md={6} lg={4}>
                <Button block onClick={() => handleConvert("asciiToUnicode")}>
                  ASCII → Unicode
                </Button>
              </Col>
              <Col xs={12} sm={8} md={6} lg={4}>
                <Button block onClick={() => handleConvert("unicodeToAscii")}>
                  Unicode → ASCII
                </Button>
              </Col>
              <Col xs={12} sm={8} md={6} lg={4}>
                <Button block onClick={() => handleConvert("allToUnicode")}>
                  全部 → Unicode
                </Button>
              </Col>
              <Col xs={12} sm={8} md={6} lg={4}>
                <Button block onClick={() => handleConvert("unicodeToAll")}>
                  Unicode → 全部
                </Button>
              </Col>
            </Row>
          </div>
        </Block>

        {/* 说明 */}
        <Block>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <Text strong>说明</Text>
            <ul style={{ margin: 0, paddingLeft: 16, color: token.colorTextSecondary, fontSize: 13 }}>
              <li><Text strong>中文 → Unicode</Text>：将中文字符转换为 Unicode 编码格式（如：你好 → \u4f60\u597d）</li>
              <li><Text strong>Unicode → 中文</Text>：将 Unicode 编码转换回中文字符</li>
              <li><Text strong>ASCII → Unicode</Text>：将 ASCII 字符转换为 Unicode 编码格式</li>
              <li><Text strong>Unicode → ASCII</Text>：将 Unicode 编码转换回 ASCII 字符</li>
              <li><Text strong>全部 → Unicode</Text>：将所有字符全部转换为 Unicode 编码</li>
              <li><Text strong>Unicode → 全部</Text>：将所有 Unicode 编码转换回原始字符</li>
            </ul>
          </div>
        </Block>
    </Page>
  );
};

export default UnicodeConverter;
