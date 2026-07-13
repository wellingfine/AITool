import React, { useMemo, useState } from 'react';
import { Input, Button, Typography, theme } from 'antd';
import { FileSearchOutlined, ClearOutlined } from '@ant-design/icons';
import Block from '../lib/Block';

const { Text } = Typography;
const { TextArea } = Input;

const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Cascadia Mono", "Courier New", monospace';

// ==================== 解析 ====================

interface ParsedRow {
  key: string;
  value: string;
}

// 只做一次严格 JSON.parse；失败就返回 null，让调用方决定"原样输出"
function tryParseJSON(input: string): Record<string, any> | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
  } catch {
    // 不合法
  }
  // 兜底：截取首个 { 到最后 }
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    try {
      const obj = JSON.parse(trimmed.slice(first, last + 1));
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
    } catch {
      // 忽略
    }
  }
  return null;
}

interface LineResult {
  raw: string;
  rows: ParsedRow[] | null; // null = 不是 JSON，原样显示 raw
}

function explainLine(input: string): LineResult {
  const trimmed = input.trim();
  if (!trimmed) return { raw: input, rows: [] };

  const obj = tryParseJSON(input);
  if (!obj) return { raw: input, rows: null };

  const rows: ParsedRow[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const strVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
    rows.push({ key: k, value: strVal });
  }
  return { raw: input, rows };
}

function splitLines(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

// ==================== 展示 ====================

const LogCard: React.FC<{
  index: number;
  total: number;
  result: LineResult;
}> = ({ index, total, result }) => {
  const { token } = theme.useToken();

  return (
    <Block style={{ marginTop: 12 }}>
      <div
        style={{
          marginBottom: 8,
          paddingBottom: 8,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          fontFamily: MONO_FONT,
          fontSize: 12,
          color: token.colorTextSecondary,
        }}
      >
        #{index + 1}
        {total > 1 ? ` / ${total}` : ''}
      </div>

      {result.rows === null ? (
        // 非 JSON：原样输出
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            color: token.colorText,
          }}
        >
          {result.raw}
        </div>
      ) : (
        // JSON: key: value 每行一行
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {result.rows.map((r, i) => (
            <div
              key={i}
              style={{
                fontFamily: MONO_FONT,
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                color: token.colorText,
                padding: '2px 0',
              }}
            >
              <span style={{ fontWeight: 600 }}>{r.key}</span>
              <span>: </span>
              <span>{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </Block>
  );
};

// ==================== 主组件 ====================

const JsonLogExplainer: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const { token } = theme.useToken();

  const results = useMemo<LineResult[]>(() => {
    const lines = splitLines(input);
    return lines.map((line) => {
      try {
        return explainLine(line);
      } catch {
        return { raw: line, rows: null };
      }
    });
  }, [input]);

  return (
    <div
      className="selectable json-log-explainer"
      style={{
        padding: '8px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: MONO_FONT,
      }}
    >
      <style>{`
        .json-log-explainer,
        .json-log-explainer *,
        .json-log-explainer .ant-typography,
        .json-log-explainer .ant-btn,
        .json-log-explainer .ant-input,
        .json-log-explainer textarea.ant-input {
          font-family: ${MONO_FONT} !important;
        }
      `}</style>

      <Block>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSearchOutlined style={{ color: token.colorPrimary }} />
            <Text strong>JSON 日志解释</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              每行一条日志，按 JSON 拆成 key: value 展示
            </Text>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              {results.length > 0
                ? `已解析 ${results.length} 条日志`
                : '在下方粘贴 JSON 日志'}
            </Text>
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={() => setInput('')}
              disabled={!input}
            >
              清空
            </Button>
          </div>

          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={'粘贴 JSON 日志，支持多行'}
            autoSize={{ minRows: 5, maxRows: 14 }}
            style={{ fontFamily: MONO_FONT, fontSize: 13 }}
          />
        </div>
      </Block>

      {results.map((r, i) => (
        <LogCard
          key={i}
          index={i}
          total={results.length}
          result={r}
        />
      ))}
    </div>
  );
};

export default JsonLogExplainer;
