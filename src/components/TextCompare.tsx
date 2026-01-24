import React, { useState } from "react";
import {
  Card,
  Input,
  Button,
  Typography,
  Row,
  Col,
  theme,
  Tag,
} from "antd";

const { Text } = Typography;
const { TextArea } = Input;

interface DuplicateItem {
  text: string;
  count: number;
}

interface CompareResult {
  leftOnly: string[];         // 只在左边出现的行
  rightOnly: string[];        // 只在右边出现的行
  leftDuplicate: DuplicateItem[];  // 左侧自身重复行（含次数）
  rightDuplicate: DuplicateItem[]; // 右侧自身重复行（含次数）
}

const TextCompare: React.FC = () => {
  const [leftText, setLeftText] = useState<string>("");
  const [rightText, setRightText] = useState<string>("");
  const [result, setResult] = useState<CompareResult | null>(null);
  
  const { token } = theme.useToken();

  // 解析文本为行数组（trim每行）
  const parseLines = (text: string): string[] => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  // 找出数组中自身重复的元素及次数
  const findDuplicatesWithCount = (lines: string[]): DuplicateItem[] => {
    const countMap = new Map<string, number>();
    for (const line of lines) {
      countMap.set(line, (countMap.get(line) || 0) + 1);
    }
    const duplicates: DuplicateItem[] = [];
    countMap.forEach((count, text) => {
      if (count > 1) {
        duplicates.push({ text, count });
      }
    });
    return duplicates;
  };

  // 执行对比
  const handleCompare = () => {
    const leftLines = parseLines(leftText);
    const rightLines = parseLines(rightText);

    const leftSet = new Set(leftLines);
    const rightSet = new Set(rightLines);

    // 只在左边出现的（去重）
    const leftOnly = [...new Set(leftLines.filter(line => !rightSet.has(line)))];
    // 只在右边出现的（去重）
    const rightOnly = [...new Set(rightLines.filter(line => !leftSet.has(line)))];
    // 左侧自身重复行（含次数）
    const leftDuplicate = findDuplicatesWithCount(leftLines);
    // 右侧自身重复行（含次数）
    const rightDuplicate = findDuplicatesWithCount(rightLines);

    setResult({
      leftOnly,
      rightOnly,
      leftDuplicate,
      rightDuplicate
    });
  };

  // 结果列表样式
  const resultListStyle: React.CSSProperties = {
    fontFamily: "monospace",
    background: token.colorFillAlter,
    padding: 12,
    borderRadius: 6,
    maxHeight: 200,
    overflowY: 'auto',
    fontSize: 13,
  };

  return (
    <div style={{ padding: "16px" }}>
      {/* 输入区域 */}
      <Card>
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
              左侧文本（每行一条）
            </Text>
            <TextArea
              value={leftText}
              onChange={(e) => setLeftText(e.target.value)}
              placeholder="请输入左侧文本，每行一条内容..."
              rows={10}
              style={{ fontFamily: "monospace" }}
            />
          </Col>
          <Col xs={24} lg={12}>
            <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
              右侧文本（每行一条）
            </Text>
            <TextArea
              value={rightText}
              onChange={(e) => setRightText(e.target.value)}
              placeholder="请输入右侧文本，每行一条内容..."
              rows={10}
              style={{ fontFamily: "monospace" }}
            />
          </Col>
        </Row>
        <Button
          type="primary"
          block
          onClick={handleCompare}
          style={{ marginTop: 16 }}
        >
          对比
        </Button>
      </Card>

      {/* 对比结果 */}
      {result && (
        <Card style={{ marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            {/* 左侧独有 */}
            <Col xs={24} lg={12}>
              <div style={{ marginBottom: 8 }}>
                <Tag color="red">左侧独有 ({result.leftOnly.length})</Tag>
              </div>
              <div style={resultListStyle}>
                {result.leftOnly.length > 0 ? (
                  result.leftOnly.map((line, index) => (
                    <div key={index} style={{ padding: '2px 0' }}>{line}</div>
                  ))
                ) : (
                  <Text type="secondary">无差异</Text>
                )}
              </div>
            </Col>
            {/* 右侧独有 */}
            <Col xs={24} lg={12}>
              <div style={{ marginBottom: 8 }}>
                <Tag color="green">右侧独有 ({result.rightOnly.length})</Tag>
              </div>
              <div style={resultListStyle}>
                {result.rightOnly.length > 0 ? (
                  result.rightOnly.map((line, index) => (
                    <div key={index} style={{ padding: '2px 0' }}>{line}</div>
                  ))
                ) : (
                  <Text type="secondary">无差异</Text>
                )}
              </div>
            </Col>
            {/* 左侧重复行 */}
            <Col xs={24} lg={12}>
              <div style={{ marginBottom: 8 }}>
                <Tag color="blue">左侧重复行 ({result.leftDuplicate.length})</Tag>
              </div>
              <div style={resultListStyle}>
                {result.leftDuplicate.length > 0 ? (
                  result.leftDuplicate.map((item, index) => (
                    <div key={index} style={{ padding: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</span>
                      <Tag color="orange" style={{ marginLeft: 8, flexShrink: 0 }}>×{item.count}</Tag>
                    </div>
                  ))
                ) : (
                  <Text type="secondary">无重复</Text>
                )}
              </div>
            </Col>
            {/* 右侧重复行 */}
            <Col xs={24} lg={12}>
              <div style={{ marginBottom: 8 }}>
                <Tag color="blue">右侧重复行 ({result.rightDuplicate.length})</Tag>
              </div>
              <div style={resultListStyle}>
                {result.rightDuplicate.length > 0 ? (
                  result.rightDuplicate.map((item, index) => (
                    <div key={index} style={{ padding: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</span>
                      <Tag color="orange" style={{ marginLeft: 8, flexShrink: 0 }}>×{item.count}</Tag>
                    </div>
                  ))
                ) : (
                  <Text type="secondary">无重复</Text>
                )}
              </div>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default TextCompare;
