import { useState, useEffect, useCallback } from 'react';
import { Card, Input, Button, Space, Typography, Tag, Row, Col, Badge } from 'antd';
import { EyeOutlined, BranchesOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

// 常用正则表达式预设
const PRESETS = [
  { name: '手机号', pattern: '^1[3-9]\\d{9}$', desc: '中国大陆手机号' },
  { name: '邮箱', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', desc: '电子邮件地址' },
  { name: '身份证号', pattern: '^\\d{17}[\\dXx]$', desc: '18位身份证号' },
  { name: 'IP地址', pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$', desc: 'IPv4地址' },
  { name: 'URL', pattern: '^https?://[^\\s/$.?#].[^\\s]*$', desc: 'HTTP/HTTPS链接' },
  { name: '日期(YYYY-MM-DD)', pattern: '^\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])$', desc: 'YYYY-MM-DD格式' },
  { name: '数字', pattern: '^-?\\d+(?:\\.\\d+)?$', desc: '整数或小数' },
  { name: '中文', pattern: '^[\\u4e00-\\u9fa5]+$', desc: '纯中文字符' },
  { name: '用户名', pattern: '^[a-zA-Z0-9_]{4,16}$', desc: '4-16位字母数字下划线' },
  { name: '密码(强)', pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$', desc: '至少8位，包含大小写、数字和特殊字符' },
];

// 解析正则表达式为可视化结构
interface RegexNode {
  type: string;
  value: string;
  desc: string;
  children?: RegexNode[];
  quantifier?: string;
  branches?: RegexNode[][];
}

const parseRegex = (pattern: string): RegexNode[] => {
  const tokens: RegexNode[] = [];
  let i = 0;

  const parseGroup = (endChar: string): { nodes: RegexNode[], nextIndex: number } => {
    const nodes: RegexNode[] = [];
    while (i < pattern.length && pattern[i] !== endChar) {
      const result = parseToken();
      if (result) {
        nodes.push(result.node);
        i = result.nextIndex;
      }
    }
    return { nodes, nextIndex: i };
  };

  const parseToken = (): { node: RegexNode, nextIndex: number } | null => {
    if (i >= pattern.length) return null;

    const char = pattern[i];
    let node: RegexNode;
    let nextI = i + 1;

    // 转义序列
    if (char === '\\' && i + 1 < pattern.length) {
      const nextChar = pattern[i + 1];
      const escapeMap: Record<string, string> = {
        'd': '数字 (0-9)',
        'D': '非数字',
        'w': '单词字符 (a-zA-Z0-9_)',
        'W': '非单词字符',
        's': '空白字符',
        'S': '非空白字符',
        'n': '换行符',
        't': '制表符',
        'r': '回车符',
        'b': '单词边界',
        'B': '非单词边界',
        '.': '点号',
        '*': '星号',
        '+': '加号',
        '?': '问号',
        '^': '开始符',
        '$': '结束符',
        '[': '左方括号',
        ']': '右方括号',
        '(': '左圆括号',
        ')': '右圆括号',
        '{': '左花括号',
        '}': '右花括号',
        '|': '或',
        '/': '斜杠',
      };
      node = {
        type: 'escape',
        value: '\\' + nextChar,
        desc: escapeMap[nextChar] || `转义 ${nextChar}`
      };
      nextI = i + 2;
    }
    // 字符类
    else if (char === '[') {
      let j = i + 1;
      let content = '[';
      while (j < pattern.length && pattern[j] !== ']') {
        if (pattern[j] === '\\' && j + 1 < pattern.length) {
          content += pattern[j] + pattern[j + 1];
          j += 2;
        } else {
          content += pattern[j];
          j++;
        }
      }
      if (j < pattern.length) {
        content += ']';
        let quantifier = '';
        if (j + 1 < pattern.length && ['*', '+', '?', '{'].includes(pattern[j + 1])) {
          if (pattern[j + 1] === '{') {
            let k = j + 2;
            while (k < pattern.length && pattern[k] !== '}') k++;
            quantifier = pattern.slice(j + 1, k + 1);
            j = k;
          } else {
            quantifier = pattern[j + 1];
          }
        }
        node = {
          type: 'charClass',
          value: content,
          desc: content.startsWith('[^') ? '否定字符类' : '字符类',
          quantifier
        };
        nextI = j + 1 + (quantifier ? quantifier.length : 0);
      } else {
        node = { type: 'literal', value: char, desc: `字符 "${char}"` };
        nextI = i + 1;
      }
    }
    // 分组
    else if (char === '(') {
      let j = i + 1;
      let groupType = '';

      if (pattern[j] === '?') {
        if (pattern[j + 1] === ':') groupType = '?:';
        else if (pattern[j + 1] === '=') groupType = '?=';
        else if (pattern[j + 1] === '!') groupType = '?!';
        else if (pattern.slice(j + 1, j + 3) === '<=') groupType = '?<=';
        else if (pattern.slice(j + 1, j + 3) === '<!') groupType = '?<!';
      }

      const groupPrefix = groupType ? `(${groupType}` : '(';
      i = j + (groupType ? groupType.length : 0);

      const { nodes, nextIndex } = parseGroup(')');
      i = nextIndex;

      let desc = '捕获组';
      if (groupType === '?:') desc = '非捕获组';
      else if (groupType === '?=') desc = '正向肯定先行断言';
      else if (groupType === '?!') desc = '正向否定先行断言';
      else if (groupType === '?<=') desc = '反向肯定后发断言';
      else if (groupType === '?<!') desc = '反向否定后发断言';

      let quantifier = '';
      if (i + 1 < pattern.length && ['*', '+', '?', '{'].includes(pattern[i + 1])) {
        if (pattern[i + 1] === '{') {
          let k = i + 2;
          while (k < pattern.length && pattern[k] !== '}') k++;
          quantifier = pattern.slice(i + 1, k + 1);
        } else {
          quantifier = pattern[i + 1];
        }
      }

      const branches = splitByAlternation(nodes);

      node = {
        type: 'group',
        value: groupPrefix,
        desc,
        children: branches.length > 1 ? undefined : nodes,
        branches: branches.length > 1 ? branches : undefined,
        quantifier
      };
      nextI = i + 1 + (quantifier ? quantifier.length : 0);
    }
    // 或操作符
    else if (char === '|') {
      node = { type: 'alternation', value: '|', desc: '或' };
      nextI = i + 1;
    }
    // 位置锚点
    else if (char === '^' || char === '$') {
      node = {
        type: 'anchor',
        value: char,
        desc: char === '^' ? '字符串开始' : '字符串结束'
      };
      nextI = i + 1;
    }
    // 量词
    else if (['*', '+', '?'].includes(char)) {
      node = {
        type: 'quantifier',
        value: char,
        desc: char === '*' ? '零次或多次' : char === '+' ? '一次或多次' : '零次或一次'
      };
      nextI = i + 1;
    }
    // 花括号量词
    else if (char === '{') {
      let j = i + 1;
      let content = '{';
      while (j < pattern.length && pattern[j] !== '}') {
        content += pattern[j];
        j++;
      }
      if (j < pattern.length) {
        content += '}';
        node = { type: 'quantifier', value: content, desc: '指定次数' };
        nextI = j + 1;
      } else {
        node = { type: 'literal', value: char, desc: `字符 "${char}"` };
        nextI = i + 1;
      }
    }
    // 普通字符
    else {
      node = { type: 'literal', value: char, desc: `字符 "${char}"` };
      nextI = i + 1;
    }

    return { node, nextIndex: nextI };
  };

  const splitByAlternation = (nodes: RegexNode[]): RegexNode[][] => {
    const branches: RegexNode[][] = [];
    let currentBranch: RegexNode[] = [];

    for (const node of nodes) {
      if (node.type === 'alternation') {
        if (currentBranch.length > 0) {
          branches.push(currentBranch);
          currentBranch = [];
        }
      } else {
        currentBranch.push(node);
      }
    }

    if (currentBranch.length > 0 || branches.length > 0) {
      branches.push(currentBranch);
    }

    return branches;
  };

  while (i < pattern.length) {
    const result = parseToken();
    if (result) {
      tokens.push(result.node);
      i = result.nextIndex;
    } else {
      break;
    }
  }

  return tokens;
};

// 获取颜色
const getTokenColor = (type: string): string => {
  const colors: Record<string, string> = {
    escape: '#1890ff',
    charClass: '#52c41a',
    group: '#722ed1',
    quantifier: '#fa8c16',
    anchor: '#eb2f96',
    alternation: '#13c2c2',
    literal: '#595959'
  };
  return colors[type] || '#595959';
};

// 渲染单个节点
const TokenNode: React.FC<{ node: RegexNode }> = ({ node }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        padding: '6px 12px',
        background: 'white',
        border: `2px solid ${getTokenColor(node.type)}`,
        borderRadius: '6px',
        cursor: 'help',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        margin: '2px'
      }}
      title={node.desc}
    >
      <span style={{
        color: getTokenColor(node.type),
        fontWeight: 'bold',
        fontSize: '14px',
        fontFamily: 'monospace'
      }}>
        {node.value}
        {node.quantifier && (
          <span style={{ color: '#fa8c16' }}>{node.quantifier}</span>
        )}
      </span>
      <span style={{
        fontSize: '10px',
        color: '#666',
        marginTop: '2px'
      }}>
        {node.desc}
      </span>
    </div>
  );
};

// 渲染分支结构
const BranchView: React.FC<{ branches: RegexNode[][], level?: number }> = ({ branches, level = 0 }) => {
  if (!branches || branches.length <= 1) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginLeft: level > 0 ? '20px' : '0'
    }}>
      {branches.map((branch, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            minWidth: '60px'
          }}>
            <BranchesOutlined style={{
              color: '#13c2c2',
              fontSize: '16px',
              transform: 'rotate(90deg)'
            }} />
            <span style={{
              marginLeft: '4px',
              color: '#13c2c2',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              分支{index + 1}
            </span>
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            padding: '8px',
            background: '#f0f5ff',
            borderRadius: '6px',
            border: '1px dashed #1890ff',
            flex: 1
          }}>
            {branch.length === 0 ? (
              <Text type="secondary" style={{ fontSize: '12px' }}>空</Text>
            ) : (
              branch.map((child, childIndex) => (
                <div key={childIndex} style={{ display: 'inline-block' }}>
                  {child.branches ? (
                    <div>
                      <TokenNode node={child} />
                      <BranchView branches={child.branches} level={level + 1} />
                    </div>
                  ) : child.children ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <TokenNode node={child} />
                      <div style={{
                        display: 'inline-flex',
                        padding: '4px',
                        marginLeft: '4px',
                        background: '#f6ffed',
                        borderRadius: '4px',
                        border: '1px dashed #52c41a'
                      }}>
                        {child.children.map((grandChild, gIndex) => (
                          grandChild.branches ? (
                            <div key={gIndex}>
                              <TokenNode node={grandChild} />
                              <BranchView branches={grandChild.branches} level={level + 1} />
                            </div>
                          ) : (
                            <TokenNode key={gIndex} node={grandChild} />
                          )
                        ))}
                      </div>
                    </div>
                  ) : (
                    <TokenNode node={child} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// 渲染可视化节点
const RegexVisualizer: React.FC<{ nodes: RegexNode[] }> = ({ nodes }) => {
  if (!nodes || nodes.length === 0) return null;

  const branches: RegexNode[][] = [];
  let currentBranch: RegexNode[] = [];

  for (const node of nodes) {
    if (node.type === 'alternation') {
      if (currentBranch.length > 0) {
        branches.push(currentBranch);
        currentBranch = [];
      }
    } else {
      currentBranch.push(node);
    }
  }
  if (currentBranch.length > 0 || branches.length > 0) {
    branches.push(currentBranch);
  }

  if (branches.length > 1) {
    return <BranchView branches={branches} />;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
      {nodes.map((node, index) => (
        <div key={index} style={{ display: 'inline-flex', alignItems: 'center' }}>
          {node.branches ? (
            <div>
              <TokenNode node={node} />
              <BranchView branches={node.branches} />
            </div>
          ) : node.children ? (
            <div style={{ display: 'inline-flex', alignItems: 'center' }}>
              <TokenNode node={node} />
              <div style={{
                display: 'inline-flex',
                flexWrap: 'wrap',
                padding: '6px',
                marginLeft: '4px',
                background: '#f6ffed',
                borderRadius: '6px',
                border: '1px dashed #52c41a'
              }}>
                {node.children.map((child, childIndex) => (
                  child.branches ? (
                    <div key={childIndex}>
                      <TokenNode node={child} />
                      <BranchView branches={child.branches} />
                    </div>
                  ) : (
                    <TokenNode key={childIndex} node={child} />
                  )
                ))}
              </div>
            </div>
          ) : (
            <TokenNode node={node} />
          )}
        </div>
      ))}
    </div>
  );
};

// 匹配结果类型
interface MatchResult {
  matches: string[];
  highlightedText: React.ReactNode;
  error: string | null;
  matchCount: number;
}

const RegexTester: React.FC = () => {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [testText, setTestText] = useState('');
  const [result, setResult] = useState<MatchResult>({
    matches: [],
    highlightedText: null,
    error: null,
    matchCount: 0
  });

  // 实时匹配
  const performMatch = useCallback(() => {
    if (!pattern || !testText) {
      setResult({ matches: [], highlightedText: null, error: null, matchCount: 0 });
      return;
    }

    try {
      const regex = new RegExp(pattern, flags);
      const results: string[] = [];
      let match;

      if (flags.includes('g')) {
        while ((match = regex.exec(testText)) !== null) {
          results.push(match[0]);
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }
      } else {
        match = regex.exec(testText);
        if (match) {
          results.push(match[0]);
        }
      }

      // 高亮显示
      let highlightedText: React.ReactNode;
      if (results.length > 0) {
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        const globalRegex = new RegExp(pattern, 'g');

        while ((match = globalRegex.exec(testText)) !== null) {
          if (match.index > lastIndex) {
            parts.push(<span key={`text-${lastIndex}`}>{testText.slice(lastIndex, match.index)}</span>);
          }
          parts.push(
            <mark key={`match-${match.index}`} style={{
              background: '#1890ff',
              color: 'white',
              padding: '2px 4px',
              borderRadius: '3px',
              fontWeight: 'bold'
            }}>
              {match[0]}
            </mark>
          );
          lastIndex = globalRegex.lastIndex;
          if (match.index === globalRegex.lastIndex) {
            globalRegex.lastIndex++;
          }
        }

        if (lastIndex < testText.length) {
          parts.push(<span key={`text-${lastIndex}`}>{testText.slice(lastIndex)}</span>);
        }

        highlightedText = <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{parts}</div>;
      } else {
        highlightedText = <Text type="secondary">无匹配结果</Text>;
      }

      setResult({
        matches: results,
        highlightedText,
        error: null,
        matchCount: results.length
      });
    } catch (err) {
      setResult({
        matches: [],
        highlightedText: null,
        error: (err as Error).message,
        matchCount: 0
      });
    }
  }, [pattern, flags, testText]);

  // 实时匹配效果
  useEffect(() => {
    performMatch();
  }, [performMatch]);

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    setPattern(preset.pattern);
  };

  const toggleFlag = (flag: string) => {
    setFlags(prev =>
      prev.includes(flag)
        ? prev.replace(flag, '')
        : prev + flag
    );
  };

  const tokens = pattern ? parseRegex(pattern) : [];

  return (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 正则表达式输入 */}
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              placeholder="输入正则表达式，例如: ^\\d+$"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              addonBefore="/"
              addonAfter={`/${flags}`}
              style={{ fontFamily: 'monospace' }}
            />

            {/* 标志位选择 */}
            <div>
              <Text type="secondary" style={{ marginRight: 8 }}>标志位:</Text>
              {['g', 'i', 'm', 's', 'u'].map(flag => (
                <Tag
                  key={flag}
                  color={flags.includes(flag) ? 'blue' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleFlag(flag)}
                >
                  {flag}
                </Tag>
              ))}
              <Text type="secondary" style={{ marginLeft: 16, fontSize: 12 }}>
                g:全局 i:忽略大小写 m:多行 s:点匹配换行 u:Unicode
              </Text>
            </div>
          </Space>
        </Card>

        {/* 可视化解析 */}
        {tokens.length > 0 && (
          <Card size="small">
            <div style={{ marginBottom: 12 }}>
              <EyeOutlined style={{ marginRight: 8 }} />
              <Text strong>正则可视化解析:</Text>
            </div>
            <div style={{
              padding: '16px',
              background: '#f5f5f5',
              borderRadius: '8px',
              overflowX: 'auto'
            }}>
              <RegexVisualizer nodes={tokens} />
            </div>
          </Card>
        )}

        {/* 测试文本和结果 */}
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>测试文本</Text>
              {result.error ? (
                <Badge
                  count={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                  style={{ backgroundColor: 'transparent' }}
                />
              ) : result.matchCount > 0 ? (
                <Badge
                  count={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  style={{ backgroundColor: 'transparent' }}
                />
              ) : null}
            </div>

            <TextArea
              rows={6}
              placeholder="输入要测试的文本..."
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              style={{ borderColor: result.error ? '#ff4d4f' : undefined }}
            />

            {/* 轻提示错误 */}
            {result.error && (
              <div style={{
                padding: '8px 12px',
                background: '#fff2f0',
                border: '1px solid #ffccc7',
                borderRadius: '4px',
                color: '#ff4d4f',
                fontSize: '13px'
              }}>
                ⚠️ {result.error}
              </div>
            )}

            {/* 匹配结果 */}
            {testText && !result.error && (
              <div style={{
                padding: '12px',
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: '4px'
              }}>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong style={{ color: '#389e0d' }}>
                    匹配结果 ({result.matchCount}个)
                  </Text>
                </div>

                {/* 高亮显示 */}
                <div style={{
                  padding: '8px',
                  background: 'white',
                  borderRadius: '4px',
                  marginBottom: 12,
                  minHeight: 40
                }}>
                  {result.highlightedText}
                </div>

                {/* 匹配列表 */}
                {result.matches.length > 0 && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>匹配列表:</Text>
                    <div style={{ marginTop: 4 }}>
                      {result.matches.map((match, index) => (
                        <Tag key={index} color="success" style={{ margin: '2px' }}>
                          {index + 1}: {match}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Space>
        </Card>

        {/* 常用正则预设 */}
        <Card size="small">
          <div style={{ marginBottom: 8 }}>
            <Text strong>常用正则表达式:</Text>
          </div>
          <Row gutter={[8, 8]}>
            {PRESETS.map((preset) => (
              <Col key={preset.name}>
                <Button
                  size="small"
                  onClick={() => handlePresetClick(preset)}
                  title={preset.desc}
                >
                  {preset.name}
                </Button>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 正则语法参考 */}
        <Card size="small">
          <Row gutter={[16, 8]}>
            <Col span={8}>
              <Text strong>字符类</Text>
              <div><code>.</code> - 任意字符</div>
              <div><code>\d</code> - 数字</div>
              <div><code>\w</code> - 单词字符</div>
              <div><code>\s</code> - 空白字符</div>
            </Col>
            <Col span={8}>
              <Text strong>量词</Text>
              <div><code>*</code> - 0次或多次</div>
              <div><code>+</code> - 1次或多次</div>
              <div><code>?</code> - 0次或1次</div>
              <div><code>{'{n,m}'}</code> - n到m次</div>
            </Col>
            <Col span={8}>
              <Text strong>位置</Text>
              <div><code>^</code> - 行首</div>
              <div><code>$</code> - 行尾</div>
              <div><code>\b</code> - 单词边界</div>
              <div><code>(?=)</code> - 正向肯定</div>
            </Col>
          </Row>
        </Card>
      </Space>
    </div>
  );
};

export default RegexTester;
