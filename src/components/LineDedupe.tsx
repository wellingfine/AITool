import { useState } from 'react';
import { Input, Button, Space, Typography, message, Statistic, Row, Col, Switch, Tag } from 'antd';
import { CopyOutlined, ClearOutlined, DeleteOutlined } from '@ant-design/icons';
import Block from '../lib/Block';

const { TextArea } = Input;
const { Text } = Typography;

interface LineItem {
  text: string;
  count: number;
}

const LineDedupe: React.FC = () => {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<LineItem[]>([]);
  const [showCount, setShowCount] = useState(true);
  const [stats, setStats] = useState({ original: 0, deduped: 0, removed: 0 });

  const handleDedupe = () => {
    if (!input.trim()) {
      message.warning('请输入需要去重的内容');
      return;
    }

    const lines = input.split('\n');
    const trimmedLines = lines.map(line => line.trim()).filter(line => line);
    const countMap = new Map<string, number>();

    for (const line of trimmedLines) {
      countMap.set(line, (countMap.get(line) || 0) + 1);
    }

    const uniqueLines: LineItem[] = [];
    const seen = new Set<string>();
    for (const line of trimmedLines) {
      if (!seen.has(line)) {
        seen.add(line);
        uniqueLines.push({ text: line, count: countMap.get(line) || 1 });
      }
    }

    setResults(uniqueLines);
    setStats({
      original: trimmedLines.length,
      deduped: uniqueLines.length,
      removed: trimmedLines.length - uniqueLines.length
    });
  };

  const handleCopy = async () => {
    if (results.length === 0) {
      message.warning('没有可复制的内容');
      return;
    }
    try {
      const text = showCount 
        ? results.map(item => `${item.text} (${item.count})`).join('\n')
        : results.map(item => item.text).join('\n');
      await navigator.clipboard.writeText(text);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  };

  const handleClear = () => {
    setInput('');
    setResults([]);
    setStats({ original: 0, deduped: 0, removed: 0 });
  };

  return (
    <div style={{ padding: '8px 0', maxWidth: 800, margin: '0 auto' }}>
      <Block>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>输入文本（每行一条数据）</Text>
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请输入需要去重的内容，每行一条数据..."
              rows={10}
              style={{ marginTop: 8, fontFamily: 'monospace' }}
            />
          </div>

          <Space wrap>
            <Button type="primary" icon={<DeleteOutlined />} onClick={handleDedupe}>
              行去重
            </Button>
            <Button icon={<ClearOutlined />} onClick={handleClear}>
              清空
            </Button>
          </Space>
        </Space>
      </Block>

      {stats.original > 0 && (
        <Block>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic title="原始行数" value={stats.original} />
            </Col>
            <Col span={8}>
              <Statistic title="去重后行数" value={stats.deduped} />
            </Col>
            <Col span={8}>
              <Statistic title="移除重复" value={stats.removed} valueStyle={{ color: stats.removed > 0 ? '#cf1322' : undefined }} />
            </Col>
          </Row>
        </Block>
      )}

      {results.length > 0 && (
        <Block>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Space>
              <Text strong>去重结果</Text>
              <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>
                复制
              </Button>
            </Space>
            <Space>
              <Text>显示次数：</Text>
              <Switch checked={showCount} onChange={setShowCount} size="small" />
            </Space>
          </div>
          <div style={{
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            padding: 12,
            background: '#fafafa'
          }}>
            {results.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '6px 0',
                  borderBottom: index < results.length - 1 ? '1px solid #f0f0f0' : 'none',
                  fontFamily: 'monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <span style={{ flex: 1, wordBreak: 'break-all' }}>{item.text}</span>
                {showCount && (
                  <Tag color={item.count > 1 ? 'orange' : 'default'}>
                    {item.count}
                  </Tag>
                )}
              </div>
            ))}
          </div>
        </Block>
      )}
    </div>
  );
};

export default LineDedupe;
