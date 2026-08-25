import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Input,
  Button,
  Upload,
  Typography,
  App,
  theme,
  Empty,
  Space,
  Tag,
  Segmented,
  Descriptions,
  Switch,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  UploadOutlined,
  ClearOutlined,
  HighlightOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CloseOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import Page from '../lib/Page';
import Block from '../lib/Block';

const { Text } = Typography;
const { TextArea } = Input;

// ==================== 数据结构 ====================

interface Point {
  X: number;
  Y: number;
}

interface CoordBox {
  LeftTop: Point;
  RightTop: Point;
  RightBottom: Point;
  LeftBottom: Point;
}

interface AnnotationBase {
  Coord: CoordBox;
  Text?: string;
  Index?: number;
  GroupType?: string;
  ResultList?: ResultItem[];
}

interface ResultItem {
  Answer?: AnnotationBase[];
  Coord?: CoordBox[];
  Figure?: AnnotationBase[];
  Option?: AnnotationBase[];
  Parse?: AnnotationBase[];
  Question?: AnnotationBase[];
  Table?: AnnotationBase[];
}

interface QuestionInfo {
  Angle?: number;
  Width?: number;
  Height?: number;
  OrgWidth?: number;
  OrgHeight?: number;
  ImageBase64?: string;
  ResultList?: ResultItem[];
}

type HotspotType =
  | 'Question'
  | 'Answer'
  | 'Figure'
  | 'Option'
  | 'Parse'
  | 'Table'
  | 'Bbox';

interface Hotspot {
  id: string;
  type: HotspotType;
  color: string;
  coord: CoordBox;
  text: string;
  index?: number;
  path: string;
  groupType?: string;
  depth: number;
}

// ==================== 常量 ====================

const TYPE_COLORS: Record<HotspotType, string> = {
  Question: '#ff4d4f',
  Answer: '#52c41a',
  Figure: '#1677ff',
  Option: '#722ed1',
  Parse: '#faad14',
  Table: '#13c2c2',
  Bbox: '#eb2f96',
};

const TYPE_LABELS: Record<HotspotType, string> = {
  Question: '题目',
  Answer: '答案',
  Figure: '图形',
  Option: '选项',
  Parse: '解析',
  Table: '表格',
  Bbox: '标记',
};

// 主 JSON 中会出现的类型（用于遍历 ResultList）
const RESULT_TYPES: Exclude<HotspotType, 'Bbox'>[] = [
  'Question',
  'Answer',
  'Figure',
  'Option',
  'Parse',
  'Table',
];

// 类型过滤条上展示的顺序
const ALL_TYPES: HotspotType[] = [
  'Question',
  'Answer',
  'Figure',
  'Option',
  'Parse',
  'Table',
  'Bbox',
];

// ==================== 工具函数 ====================

// 递归收集热区
function walkResultList(
  items: ResultItem[] | undefined,
  pathPrefix: string,
  depth: number,
  out: Hotspot[],
) {
  if (!items || !Array.isArray(items)) return;
  items.forEach((item, i) => {
    const pathBase = `${pathPrefix}[${i + 1}]`;
    RESULT_TYPES.forEach((type) => {
      const arr = item[type];
      if (!Array.isArray(arr)) return;
      arr.forEach((ann, j) => {
        if (!ann || !ann.Coord) return;
        out.push({
          id: `${pathBase}-${type}-${j}`,
          type,
          color: TYPE_COLORS[type],
          coord: ann.Coord,
          text: ann.Text || '',
          index: ann.Index,
          path: `${pathBase}.${type}[${j + 1}]`,
          groupType: ann.GroupType,
          depth,
        });
        if (ann.ResultList && ann.ResultList.length > 0) {
          walkResultList(
            ann.ResultList,
            `${pathBase}.${type}[${j + 1}].ResultList`,
            depth + 1,
            out,
          );
        }
      });
    });
  });
}

// 从 CoordBox 计算 SVG polygon points
function coordToPoints(c: CoordBox): string {
  return [
    `${c.LeftTop.X},${c.LeftTop.Y}`,
    `${c.RightTop.X},${c.RightTop.Y}`,
    `${c.RightBottom.X},${c.RightBottom.Y}`,
    `${c.LeftBottom.X},${c.LeftBottom.Y}`,
  ].join(' ');
}

// 从 CoordBox 计算标签位置（左上角）
function coordToLabelPos(c: CoordBox): { x: number; y: number } {
  return { x: c.LeftTop.X, y: c.LeftTop.Y };
}

// 尝试从任意 JSON 输入定位到 QuestionInfo 数组
function findQuestionInfos(parsed: any): QuestionInfo[] {
  if (!parsed) return [];
  // 常规位置
  const qs = parsed?.Response?.QuestionInfo;
  if (Array.isArray(qs)) return qs;
  // 兼容直接是 QuestionInfo 数组
  if (Array.isArray(parsed?.QuestionInfo)) return parsed.QuestionInfo;
  // 兼容用户直接把单个 QuestionInfo 传进来
  if (parsed?.ResultList && (parsed?.OrgWidth || parsed?.Width)) return [parsed];
  return [];
}

// 检测 base64 图片类型
function detectImageMimeType(raw: string): string | null {
  try {
    const decoded = atob(raw.slice(0, 32));
    const b = new Uint8Array(4);
    for (let i = 0; i < 4; i++) b[i] = decoded.charCodeAt(i);
    if (b[0] === 0x89 && b[1] === 0x50) return 'image/png';
    if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
    if (b[0] === 0x47 && b[1] === 0x49) return 'image/gif';
    if (b[0] === 0x42 && b[1] === 0x4d) return 'image/bmp';
    if (b[0] === 0x52 && b[1] === 0x49) return 'image/webp';
    return null;
  } catch {
    return null;
  }
}

function base64ToDataUrl(b64: string): string | null {
  const s = b64.trim();
  if (!s) return null;
  if (s.startsWith('data:image/')) return s;
  const mime = detectImageMimeType(s);
  if (!mime) return null;
  return `data:${mime};base64,${s}`;
}

// 解析自定义 bbox 标记
// 输入示例：{ "b": ["<bbox>120 142 820 238</bbox>", ...] }
// 也兼容纯数字数组 [[x1,y1,x2,y2], ...] 或直接一行行的 <bbox>...</bbox>
interface BboxParseResult {
  hotspots: Hotspot[];
  error: string;
  rows?: number;
  cols?: number;
  n?: number;
}

function parseBboxInput(input: string): BboxParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { hotspots: [], error: '' };

  const collectBboxTags = (arr: unknown[]): string[] => {
    const out: string[] = [];
    for (const v of arr) {
      if (typeof v === 'string') out.push(v);
    }
    return out;
  };

  // 提取 4 个数字，支持 <bbox>x1 y1 x2 y2</bbox> 或 "x1 y1 x2 y2" 或 [x1,y1,x2,y2]
  const parseOne = (v: unknown): [number, number, number, number] | null => {
    if (Array.isArray(v) && v.length >= 4) {
      const nums = v.slice(0, 4).map(Number);
      if (nums.every((n) => Number.isFinite(n))) {
        return nums as [number, number, number, number];
      }
      return null;
    }
    if (typeof v !== 'string') return null;
    const s = v.replace(/<\/?bbox>/gi, ' ').trim();
    const parts = s.split(/[\s,]+/).filter(Boolean).map(Number);
    if (parts.length >= 4 && parts.slice(0, 4).every((n) => Number.isFinite(n))) {
      return parts.slice(0, 4) as [number, number, number, number];
    }
    return null;
  };

  let raw: unknown[] = [];
  let meta: { rows?: number; cols?: number; n?: number } = {};

  // 尝试 JSON 解析
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      raw = parsed;
    } else if (parsed && typeof parsed === 'object') {
      meta = {
        rows: typeof parsed.rows === 'number' ? parsed.rows : undefined,
        cols: typeof parsed.cols === 'number' ? parsed.cols : undefined,
        n: typeof parsed.n === 'number' ? parsed.n : undefined,
      };
      if (Array.isArray(parsed.b)) raw = parsed.b;
      else if (Array.isArray(parsed.bboxes)) raw = parsed.bboxes;
      else if (Array.isArray(parsed.boxes)) raw = parsed.boxes;
      else {
        // 兜底：从对象里找第一个数组字段
        for (const v of Object.values(parsed)) {
          if (Array.isArray(v)) {
            raw = v;
            break;
          }
        }
      }
    }
  } catch {
    // 不是 JSON：按行提取 <bbox>...</bbox>
    const matches = trimmed.match(/<bbox>[^<]*<\/bbox>/gi);
    if (matches) {
      raw = matches;
    } else {
      // 按行按 4 个数字组解析
      raw = trimmed
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    }
  }

  if (raw.length === 0) {
    // 若是 JSON 对象但没能找到数组，raw 可能仍然为空
    return { hotspots: [], error: '未找到 bbox 数据', ...meta };
  }

  // 若是字符串数组，先把每个字符串拆出来
  if (raw.every((v) => typeof v === 'string')) {
    raw = collectBboxTags(raw as unknown[]);
  }

  const hotspots: Hotspot[] = [];
  let failed = 0;
  raw.forEach((v, i) => {
    const box = parseOne(v);
    if (!box) {
      failed++;
      return;
    }
    const [x1, y1, x2, y2] = box;
    const lx = Math.min(x1, x2);
    const rx = Math.max(x1, x2);
    const ty = Math.min(y1, y2);
    const by = Math.max(y1, y2);
    hotspots.push({
      id: `bbox-${i}`,
      type: 'Bbox',
      color: TYPE_COLORS.Bbox,
      coord: {
        LeftTop: { X: lx, Y: ty },
        RightTop: { X: rx, Y: ty },
        RightBottom: { X: rx, Y: by },
        LeftBottom: { X: lx, Y: by },
      },
      text: typeof v === 'string' ? v : JSON.stringify(v),
      index: i + 1,
      path: `bbox[${i + 1}]`,
      depth: 0,
    });
  });

  return {
    hotspots,
    error: failed > 0 ? `${failed} 个 bbox 解析失败` : '',
    ...meta,
  };
}

// 从任意 JSON 中提取 RequestId（多个可能的位置）
function findRequestId(parsed: any): string {
  if (!parsed) return '';
  return (
    parsed?.Response?.RequestId ||
    parsed?.RequestId ||
    parsed?.requestId ||
    ''
  );
}

// ==================== 历史记录 ====================

interface HistoryItem {
  id: string; // 唯一 key
  requestId: string;
  json: string;
  createdAt: number;
}

const MAX_HISTORY = 10;

// ==================== 主组件 ====================

const ImageAnnotator: React.FC = () => {
  const { token } = theme.useToken();
  const { message } = App.useApp();

  const [jsonInput, setJsonInput] = useState<string>('');
  const [bboxInput, setBboxInput] = useState<string>('');
  const [imageSrc, setImageSrc] = useState<string>('');
  const [parseError, setParseError] = useState<string>('');
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [imageNaturalSize, setImageNaturalSize] = useState<{
    w: number;
    h: number;
  }>({ w: 0, h: 0 });
  const [visibleTypes, setVisibleTypes] =
    useState<Record<HotspotType, boolean>>({
      Question: true,
      Answer: true,
      Figure: true,
      Option: true,
      Parse: true,
      Table: true,
      Bbox: true,
    });
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string>('');

  const imgRef = useRef<HTMLImageElement>(null);

  // 解析 JSON
  const parsedResult = useMemo(() => {
    const trimmed = jsonInput.trim();
    if (!trimmed) return { infos: [] as QuestionInfo[], requestId: '', error: '' };
    try {
      const parsed = JSON.parse(trimmed);
      const infos = findQuestionInfos(parsed);
      return {
        infos,
        requestId: findRequestId(parsed),
        error: infos.length ? '' : '未找到 QuestionInfo 数据',
      };
    } catch (e) {
      return {
        infos: [] as QuestionInfo[],
        requestId: '',
        error: 'JSON 格式错误：' + (e as Error).message,
      };
    }
  }, [jsonInput]);

  const questionInfos = parsedResult.infos;

  // 同步 parseError 状态（避免在 useMemo 中调用 setState）
  useEffect(() => {
    setParseError(parsedResult.error);
  }, [parsedResult.error]);

  // 当解析成功时，加入/更新历史记录（500ms 防抖，避免输入过程中频繁抖动）
  useEffect(() => {
    if (questionInfos.length === 0) return;
    const currentJson = jsonInput.trim();
    if (!currentJson) return;

    const timer = setTimeout(() => {
      setHistory((prev) => {
        // 若与最近一条内容完全一致，则不重复加入
        if (prev.length > 0 && prev[0].json === currentJson) {
          return prev;
        }
        // 若已存在同样的 json 内容，则把它提到最前面
        const existingIdx = prev.findIndex((h) => h.json === currentJson);
        if (existingIdx !== -1) {
          const item = prev[existingIdx];
          const rest = prev.filter((_, i) => i !== existingIdx);
          setActiveHistoryId(item.id);
          return [item, ...rest];
        }
        const newItem: HistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          requestId: parsedResult.requestId,
          json: currentJson,
          createdAt: Date.now(),
        };
        setActiveHistoryId(newItem.id);
        return [newItem, ...prev].slice(0, MAX_HISTORY);
      });
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonInput, questionInfos.length]);

  // 当前页数据
  const currentInfo: QuestionInfo | null =
    questionInfos.length > 0
      ? questionInfos[Math.min(pageIndex, questionInfos.length - 1)]
      : null;

  // 从 JSON 中提取 ImageBase64（若存在）
  const jsonImageSrc = useMemo(() => {
    if (!currentInfo?.ImageBase64) return '';
    return base64ToDataUrl(currentInfo.ImageBase64) || '';
  }, [currentInfo]);

  // 实际渲染的图片：优先使用用户上传的，其次使用 JSON 中自带的
  const effectiveImageSrc = imageSrc || jsonImageSrc;

  // 收集热区
  // 从主 JSON 中收集的热区
  const resultHotspots = useMemo<Hotspot[]>(() => {
    if (!currentInfo?.ResultList) return [];
    const out: Hotspot[] = [];
    walkResultList(currentInfo.ResultList, 'ResultList', 0, out);
    return out;
  }, [currentInfo]);

  // 自定义 bbox 解析
  const bboxParsed = useMemo(() => parseBboxInput(bboxInput), [bboxInput]);

  // 合并热区
  const hotspots = useMemo<Hotspot[]>(
    () => [...resultHotspots, ...bboxParsed.hotspots],
    [resultHotspots, bboxParsed.hotspots],
  );

  // 计算 viewBox 尺寸：优先使用 JSON 中的 OrgWidth/OrgHeight，兜底用图片原始尺寸
  const viewSize = useMemo(() => {
    const w =
      currentInfo?.OrgWidth ||
      currentInfo?.Width ||
      imageNaturalSize.w ||
      0;
    const h =
      currentInfo?.OrgHeight ||
      currentInfo?.Height ||
      imageNaturalSize.h ||
      0;
    return { w, h };
  }, [currentInfo, imageNaturalSize]);

  // 统计每种类型的数量
  const typeCounts = useMemo(() => {
    const c: Record<HotspotType, number> = {
      Question: 0,
      Answer: 0,
      Figure: 0,
      Option: 0,
      Parse: 0,
      Table: 0,
      Bbox: 0,
    };
    hotspots.forEach((h) => c[h.type]++);
    return c;
  }, [hotspots]);

  // 上传图片
  const uploadProps: UploadProps = {
    accept: 'image/*',
    showUploadList: false,
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageNaturalSize({ w: 0, h: 0 });
        setImageSrc((e.target?.result as string) || '');
        message.success('图片已加载');
      };
      reader.readAsDataURL(file);
      return false;
    },
  };

  const handleClear = () => {
    setJsonInput('');
    setBboxInput('');
    setImageSrc('');
    setSelected(null);
    setPageIndex(0);
    setParseError('');
    setActiveHistoryId('');
    setImageNaturalSize({ w: 0, h: 0 });
  };

  // 切换到某条历史记录
  const handleSwitchHistory = (item: HistoryItem) => {
    setJsonInput(item.json);
    setActiveHistoryId(item.id);
    setSelected(null);
    setPageIndex(0);
  };

  // 删除某条历史记录
  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    if (activeHistoryId === id) {
      setActiveHistoryId('');
    }
  };

  // 清空所有历史
  const handleClearHistory = () => {
    setHistory([]);
    setActiveHistoryId('');
  };

  const toggleType = (type: HotspotType) => {
    setVisibleTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const visibleHotspots = useMemo(
    () => hotspots.filter((h) => visibleTypes[h.type]),
    [hotspots, visibleTypes],
  );

  // 打开示例（隐藏功能，通过按钮触发填充示例结构，帮助用户理解格式）
  const fillSample = useCallback(() => {
    const sample = {
      Response: {
        QuestionInfo: [
          {
            OrgWidth: 800,
            OrgHeight: 600,
            ImageBase64: '',
            ResultList: [
              {
                Question: [
                  {
                    Index: 1,
                    Text: '示例题目',
                    Coord: {
                      LeftTop: { X: 50, Y: 50 },
                      RightTop: { X: 400, Y: 50 },
                      RightBottom: { X: 400, Y: 200 },
                      LeftBottom: { X: 50, Y: 200 },
                    },
                  },
                ],
                Answer: [
                  {
                    Index: 1,
                    Text: '示例答案',
                    Coord: {
                      LeftTop: { X: 450, Y: 100 },
                      RightTop: { X: 700, Y: 100 },
                      RightBottom: { X: 700, Y: 250 },
                      LeftBottom: { X: 450, Y: 250 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    setJsonInput(JSON.stringify(sample, null, 2));
  }, []);

  return (
    <Page maxWidth="100%">
      <Block>
        <Space
          direction="vertical"
          size="middle"
          style={{ width: '100%' }}
        >
          <Space wrap>
            <HighlightOutlined style={{ color: token.colorPrimary }} />
            <Text strong>图片标注</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              粘贴 JSON 并选择图片，将根据 JSON 中的 Coord 在图片上绘制可点击热区
            </Text>
          </Space>

          <TextArea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="粘贴识别结果 JSON（包含 Response.QuestionInfo[].ResultList[]）"
            autoSize={{ minRows: 4, maxRows: 10 }}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />

          {history.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <Space size={4} style={{ paddingTop: 2 }}>
                <HistoryOutlined style={{ color: token.colorTextSecondary }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  历史 ({history.length}/{MAX_HISTORY})
                </Text>
              </Space>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {history.map((h, i) => {
                  const isActive = activeHistoryId === h.id;
                  const label =
                    h.requestId ||
                    `未命名 · ${new Date(h.createdAt).toLocaleTimeString()}`;
                  // requestId 太长做截断显示
                  const displayLabel =
                    label.length > 20
                      ? label.slice(0, 8) + '…' + label.slice(-8)
                      : label;
                  return (
                    <Tag
                      key={h.id}
                      title={label}
                      color={isActive ? 'processing' : 'default'}
                      style={{
                        cursor: 'pointer',
                        userSelect: 'none',
                        margin: 0,
                        padding: '2px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                      onClick={() => handleSwitchHistory(h)}
                    >
                      <span style={{ opacity: 0.6 }}>#{i + 1}</span>
                      <span>{displayLabel}</span>
                      <CloseOutlined
                        style={{
                          fontSize: 10,
                          marginLeft: 2,
                          color: token.colorTextSecondary,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistory(h.id);
                        }}
                      />
                    </Tag>
                  );
                })}
                <Button
                  size="small"
                  type="link"
                  onClick={handleClearHistory}
                  style={{ padding: '0 4px', height: 22, fontSize: 12 }}
                >
                  清空历史
                </Button>
              </div>
            </div>
          )}

          {parseError && (
            <Text type="danger" style={{ fontSize: 12 }}>
              {parseError}
            </Text>
          )}

          {/* 自定义 bbox 标记输入 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              border: `1px dashed ${token.colorBorder}`,
              borderRadius: token.borderRadius,
              padding: 8,
            }}
          >
            <Space wrap size={8}>
              <Tag
                color={TYPE_COLORS.Bbox}
                style={{
                  color: '#fff',
                  background: TYPE_COLORS.Bbox,
                  border: 'none',
                  margin: 0,
                }}
              >
                自定义标记
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                支持 {'{"b":["<bbox>x1 y1 x2 y2</bbox>"]}'} 或纯 bbox 行
              </Text>
              {bboxParsed.hotspots.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  已解析 {bboxParsed.hotspots.length} 个
                  {bboxParsed.n != null ? ` / n=${bboxParsed.n}` : ''}
                  {bboxParsed.rows != null && bboxParsed.cols != null
                    ? ` (${bboxParsed.rows}×${bboxParsed.cols})`
                    : ''}
                </Text>
              )}
              {bboxInput && (
                <Button
                  size="small"
                  type="text"
                  onClick={() => setBboxInput('')}
                >
                  清空标记
                </Button>
              )}
            </Space>
            <TextArea
              value={bboxInput}
              onChange={(e) => setBboxInput(e.target.value)}
              placeholder={
                '粘贴自定义标记，例如：\n{\n  "n": 5,\n  "rows": 5,\n  "cols": 1,\n  "b": ["<bbox>120 142 820 238</bbox>", ...]\n}'
              }
              autoSize={{ minRows: 3, maxRows: 8 }}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            {bboxParsed.error && (
              <Text type="warning" style={{ fontSize: 12 }}>
                {bboxParsed.error}
              </Text>
            )}
          </div>

          <Space wrap>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>选择图片</Button>
            </Upload>
            {jsonImageSrc && !imageSrc && (
              <Tag color="blue">已使用 JSON 中的 ImageBase64</Tag>
            )}
            {imageSrc && (
              <Button
                size="small"
                onClick={() => {
                  setImageSrc('');
                  setImageNaturalSize({ w: 0, h: 0 });
                }}
                disabled={!imageSrc}
              >
                清除上传图片
              </Button>
            )}
            <Button
              icon={<ClearOutlined />}
              onClick={handleClear}
              disabled={!jsonInput && !imageSrc}
            >
              全部清空
            </Button>
            <Button size="small" type="dashed" onClick={fillSample}>
              填入示例
            </Button>
          </Space>

          {questionInfos.length > 1 && (
            <Space>
              <Text type="secondary">页面：</Text>
              <Segmented
                value={pageIndex}
                onChange={(v) => setPageIndex(Number(v))}
                options={questionInfos.map((_, i) => ({
                  label: `第 ${i + 1} 页`,
                  value: i,
                }))}
              />
            </Space>
          )}
        </Space>
      </Block>

      {(effectiveImageSrc || currentInfo || hotspots.length > 0) && (
        <Block>
          <Space
            direction="vertical"
            size="small"
            style={{ width: '100%' }}
          >
            {hotspots.length > 0 && (
              <Space wrap size={[8, 8]}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  类型过滤：
                </Text>
                {ALL_TYPES.map((t) => {
                  const count = typeCounts[t];
                  const active = visibleTypes[t];
                  return (
                    <Tag
                      key={t}
                      color={active ? t.toLowerCase() : 'default'}
                      style={{
                        cursor: 'pointer',
                        borderColor: TYPE_COLORS[t],
                        color: active ? '#fff' : TYPE_COLORS[t],
                        background: active ? TYPE_COLORS[t] : 'transparent',
                        userSelect: 'none',
                      }}
                      onClick={() => toggleType(t)}
                    >
                      {active ? <EyeOutlined /> : <EyeInvisibleOutlined />}{' '}
                      {TYPE_LABELS[t]} ({count})
                    </Tag>
                  );
                })}
                <span style={{ marginLeft: 8 }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  显示序号：
                </Text>
                <Switch
                  size="small"
                  checked={showLabels}
                  onChange={setShowLabels}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  共 {hotspots.length} 个热区
                </Text>
              </Space>
            )}

            {!effectiveImageSrc ? (
              <Empty
                description="请选择一张图片，或让 JSON 中包含 ImageBase64"
                style={{ padding: '32px 0' }}
              />
            ) : (
            <div
              className="image-annotator-split"
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                width: '100%',
                flexWrap: 'wrap',
              }}
            >
              <style>{`
                @media (max-width: 900px) {
                  .image-annotator-split > .anno-detail {
                    width: 100% !important;
                    position: static !important;
                    max-height: none !important;
                  }
                }
              `}</style>
              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  minWidth: 0,
                  background: token.colorFillAlter,
                  borderRadius: token.borderRadius,
                  overflow: 'hidden',
                }}
              >
                <img
                  ref={imgRef}
                  src={effectiveImageSrc}
                  alt="annotated"
                  style={{
                    display: 'block',
                    width: '100%',
                    height: 'auto',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                  draggable={false}
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    setImageNaturalSize({
                      w: el.naturalWidth,
                      h: el.naturalHeight,
                    });
                  }}
                />
                {hotspots.length > 0 && viewSize.w > 0 && viewSize.h > 0 && (
                <svg
                  viewBox={`0 0 ${viewSize.w} ${viewSize.h}`}
                  preserveAspectRatio="none"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                  }}
                >
                  {visibleHotspots.map((h) => {
                    const isHover = hoveredId === h.id;
                    const isSel = selected?.id === h.id;
                    const labelPos = coordToLabelPos(h.coord);
                    const labelW = Math.max(
                      40,
                      TYPE_LABELS[h.type].length * 12 + 24,
                    );
                    const labelH = 22;
                    return (
                      <g key={h.id} style={{ pointerEvents: 'auto' }}>
                        <polygon
                          points={coordToPoints(h.coord)}
                          fill={h.color}
                          fillOpacity={isSel ? 0.35 : isHover ? 0.25 : 0.12}
                          stroke={h.color}
                          strokeWidth={isSel ? 4 : isHover ? 3 : 2}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredId(h.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onClick={() => setSelected(h)}
                        />
                        {showLabels && (
                          <g
                            style={{ pointerEvents: 'none' }}
                            transform={`translate(${labelPos.x}, ${
                              labelPos.y - labelH - 2
                            })`}
                          >
                            <rect
                              width={labelW}
                              height={labelH}
                              fill={h.color}
                              rx={4}
                              ry={4}
                            />
                            <text
                              x={labelW / 2}
                              y={labelH / 2 + 5}
                              fill="#fff"
                              textAnchor="middle"
                              fontSize={14}
                              fontFamily="sans-serif"
                            >
                              {TYPE_LABELS[h.type]}
                              {h.index != null ? ` #${h.index}` : ''}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
                )}
              </div>

              {/* 右侧详情面板 */}
              <div
                className="anno-detail"
                style={{
                  width: 360,
                  flexShrink: 0,
                  position: 'sticky',
                  top: 8,
                  maxHeight: 'calc(100vh - 32px)',
                  overflowY: 'auto',
                  padding: 12,
                  background: token.colorBgContainer,
                  borderRadius: token.borderRadius,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                {selected ? (
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ width: '100%' }}
                  >
                    <Space wrap>
                      <Tag
                        color={selected.color}
                        style={{
                          color: '#fff',
                          background: selected.color,
                          border: 'none',
                        }}
                      >
                        {TYPE_LABELS[selected.type]}
                      </Tag>
                      {selected.index != null && (
                        <Text strong>#{selected.index}</Text>
                      )}
                      {selected.depth > 0 && (
                        <Tag>嵌套层级 {selected.depth}</Tag>
                      )}
                      <Button
                        size="small"
                        type="text"
                        onClick={() => setSelected(null)}
                      >
                        取消选中
                      </Button>
                    </Space>
                    <Descriptions
                      column={1}
                      size="small"
                      bordered
                      styles={{ label: { width: 80 } }}
                    >
                      <Descriptions.Item label="类型">
                        {TYPE_LABELS[selected.type]} ({selected.type})
                      </Descriptions.Item>
                      {selected.index != null && (
                        <Descriptions.Item label="Index">
                          {selected.index}
                        </Descriptions.Item>
                      )}
                      {selected.groupType && (
                        <Descriptions.Item label="GroupType">
                          {selected.groupType}
                        </Descriptions.Item>
                      )}
                      <Descriptions.Item label="路径">
                        <Text code style={{ fontSize: 12 }}>
                          {selected.path}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="坐标">
                        <div
                          style={{ fontFamily: 'monospace', fontSize: 12 }}
                        >
                          <div>
                            LT: ({selected.coord.LeftTop.X},{' '}
                            {selected.coord.LeftTop.Y})
                          </div>
                          <div>
                            RT: ({selected.coord.RightTop.X},{' '}
                            {selected.coord.RightTop.Y})
                          </div>
                          <div>
                            RB: ({selected.coord.RightBottom.X},{' '}
                            {selected.coord.RightBottom.Y})
                          </div>
                          <div>
                            LB: ({selected.coord.LeftBottom.X},{' '}
                            {selected.coord.LeftBottom.Y})
                          </div>
                        </div>
                      </Descriptions.Item>
                      <Descriptions.Item label="Text">
                        <div
                          style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            maxHeight: 360,
                            overflowY: 'auto',
                          }}
                        >
                          {selected.text || (
                            <Text type="secondary">(空)</Text>
                          )}
                        </div>
                      </Descriptions.Item>
                    </Descriptions>
                  </Space>
                ) : (
                  <div
                    style={{
                      color: token.colorTextSecondary,
                      fontSize: 13,
                      lineHeight: 1.8,
                    }}
                  >
                    <Text strong>热区详情</Text>
                    <div style={{ marginTop: 8 }}>
                      点击图片上的任意热区，这里将显示对应字段的详细信息。
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </Space>
        </Block>
      )}
    </Page>
  );
};

export default ImageAnnotator;
