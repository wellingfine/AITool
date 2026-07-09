import React, { useState, useMemo, useRef } from "react";
import {
  Button,
  Typography,
  Row,
  Col,
  Select,
  Upload,
  Table,
  Tag,
  Space,
  Alert,
  Input,
  theme,
  App,
  Empty,
  Checkbox,
} from "antd";
import {
  UploadOutlined,
  SwapOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import Block from "../lib/Block";
import Page from "../lib/Page";

const { Text, Title } = Typography;

/** 一份已解析的 CSV 文件 */
interface ParsedCSV {
  fileName: string;
  headers: string[];
  rows: string[][]; // 每行为字符串数组，长度与 headers 一致
  /** 原始解析出的所有行（未按表头切分），用于切换"首行是否为表头"时重算 */
  raw: string[][];
}

/** 对比结果中的一条记录 */
interface DiffRow {
  key: string;            // 由关键字组合生成
  keyValues: string[];    // 关键字列的值
  row: string[];          // 完整行数据
}

interface CompareResult {
  leftOnly: DiffRow[];   // 左侧独有（右文件缺少这些行）
  rightOnly: DiffRow[];  // 右侧独有（左文件缺少这些行）
  leftDupKeys: { key: string; count: number }[];   // 左侧关键字重复
  rightDupKeys: { key: string; count: number }[];  // 右侧关键字重复
  headersUnion: string[]; // 展示用的列合集（以左表头为准，右表头追加缺少的列）
}

/**
 * 简易但可靠的 CSV 解析器
 * - 支持双引号包裹
 * - 支持字段内的逗号、换行符、转义双引号（"" -> "）
 * - 自动处理 \r\n / \n
 */
const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  // 去除 BOM
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }

    if (ch === "\r") {
      // 忽略 \r，交给 \n 处理换行；若单独 \r 也视为换行
      if (text[i + 1] === "\n") {
        i++;
        continue;
      }
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
      i++;
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // 收尾
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // 过滤空行（全部字段为空字符串）
  return rows.filter(
    (r) => !(r.length === 1 && r[0].trim() === "") && r.length > 0
  );
};

/** 将一行数据转成 CSV 的一行文本 */
const rowToCSVLine = (row: string[]): string => {
  return row
    .map((v) => {
      const needQuote = /[",\r\n]/.test(v);
      const escaped = v.replace(/"/g, '""');
      return needQuote ? `"${escaped}"` : escaped;
    })
    .join(",");
};

/** 根据多个关键字列生成 key，使用不可见分隔符避免冲突 */
const buildKey = (row: string[], keyIndexes: number[]): string => {
  return keyIndexes.map((idx) => row[idx] ?? "").join("\u0001");
};

const OrderedCompare: React.FC = () => {
  const { token } = theme.useToken();
  const { message } = App.useApp();

  const [leftCSV, setLeftCSV] = useState<ParsedCSV | null>(null);
  const [rightCSV, setRightCSV] = useState<ParsedCSV | null>(null);
  const [leftKeyCols, setLeftKeyCols] = useState<string[]>([]);
  const [rightKeyCols, setRightKeyCols] = useState<string[]>([]);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  /** 首行是否作为表头 */
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  /** 两个结果表格的分页状态（受控） */
  const [leftPage, setLeftPage] = useState<{ current: number; pageSize: number }>({
    current: 1,
    pageSize: 20,
  });
  const [rightPage, setRightPage] = useState<{ current: number; pageSize: number }>({
    current: 1,
    pageSize: 20,
  });
  /** 两个结果表格的选中行 key（_rowKey） */
  const [leftSelectedKeys, setLeftSelectedKeys] = useState<React.Key[]>([]);
  const [rightSelectedKeys, setRightSelectedKeys] = useState<React.Key[]>([]);

  // 用于存储上次的 keyCols 顺序，避免因 Select 回显把顺序打乱
  const leftKeyOrderRef = useRef<string[]>([]);
  const rightKeyOrderRef = useRef<string[]>([]);

  /** 读取文件为文本（兼容 Web 与 Tauri） */
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("读取文件失败"));
      reader.readAsText(file, "utf-8");
    });
  };

  /** 根据"是否首行为表头"把原始行拆分为 headers / rows，并把每行长度对齐 headers */
  const buildParsed = (
    fileName: string,
    raw: string[][],
    withHeader: boolean
  ): ParsedCSV => {
    if (raw.length === 0) {
      return { fileName, headers: [], rows: [], raw };
    }
    const maxCols = raw.reduce((m, r) => Math.max(m, r.length), 0);
    let headers: string[];
    let dataRows: string[][];
    if (withHeader) {
      headers = raw[0].map((h) => (h ?? "").trim());
      // 若表头列数不足最大列数，补齐空列名
      while (headers.length < maxCols) {
        headers.push(`列${headers.length + 1}`);
      }
      dataRows = raw.slice(1);
    } else {
      headers = Array.from({ length: maxCols }, (_, i) => `列${i + 1}`);
      dataRows = raw;
    }
    const rows = dataRows.map((r) => {
      if (r.length < headers.length) {
        return [...r, ...new Array(headers.length - r.length).fill("")];
      }
      if (r.length > headers.length) {
        return r.slice(0, headers.length);
      }
      return r;
    });
    return { fileName, headers, rows, raw };
  };

  const handleUpload = async (
    file: File,
    side: "left" | "right"
  ): Promise<boolean> => {
    try {
      const text = await readFileAsText(file);
      const raw = parseCSV(text);
      if (raw.length === 0) {
        message.error("CSV 文件为空或格式不正确");
        return false;
      }
      const data = buildParsed(file.name, raw, hasHeader);
      if (side === "left") {
        setLeftCSV(data);
        setLeftKeyCols([]);
        leftKeyOrderRef.current = [];
      } else {
        setRightCSV(data);
        setRightKeyCols([]);
        rightKeyOrderRef.current = [];
      }
      setResult(null);
      message.success(`已加载 ${file.name}，共 ${data.rows.length} 行`);
    } catch (err) {
      console.error(err);
      message.error("解析 CSV 文件失败");
    }
    return false; // 阻止 antd 默认上传
  };

  /** 切换"首行是否为表头"时重新计算两边数据 */
  const handleToggleHasHeader = (checked: boolean) => {
    setHasHeader(checked);
    if (leftCSV) {
      setLeftCSV(buildParsed(leftCSV.fileName, leftCSV.raw, checked));
      setLeftKeyCols([]);
      leftKeyOrderRef.current = [];
    }
    if (rightCSV) {
      setRightCSV(buildParsed(rightCSV.fileName, rightCSV.raw, checked));
      setRightKeyCols([]);
      rightKeyOrderRef.current = [];
    }
    setResult(null);
  };

  const uploadPropsFor = (side: "left" | "right"): UploadProps => ({
    accept: ".csv,text/csv",
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => handleUpload(file as File, side),
  });

  /** 可选的关键字列交集（两文件都存在的列名） */
  const commonHeaders = useMemo(() => {
    if (!leftCSV || !rightCSV) return [];
    const rightSet = new Set(rightCSV.headers);
    return leftCSV.headers.filter((h) => rightSet.has(h));
  }, [leftCSV, rightCSV]);

  /** 快速使用相同列作为两侧的关键字 */
  const handleSyncKeyCols = (cols: string[]) => {
    setLeftKeyCols(cols);
    setRightKeyCols(cols);
    leftKeyOrderRef.current = cols;
    rightKeyOrderRef.current = cols;
  };

  const doCompare = () => {
    if (!leftCSV || !rightCSV) {
      message.warning("请先上传两个 CSV 文件");
      return;
    }
    if (leftKeyCols.length === 0 || rightKeyCols.length === 0) {
      message.warning("请为两侧分别选择至少一个关键字列");
      return;
    }
    if (leftKeyCols.length !== rightKeyCols.length) {
      message.warning("两侧关键字列数量需要一致");
      return;
    }

    const leftKeyIdx = leftKeyCols.map((c) => leftCSV.headers.indexOf(c));
    const rightKeyIdx = rightKeyCols.map((c) => rightCSV.headers.indexOf(c));

    if (leftKeyIdx.includes(-1) || rightKeyIdx.includes(-1)) {
      message.error("关键字列不存在，请重新选择");
      return;
    }

    // 构建左侧 key -> 行 集合（保留出现次数）
    const leftMap = new Map<string, DiffRow[]>();
    leftCSV.rows.forEach((row) => {
      const keyValues = leftKeyIdx.map((i) => row[i] ?? "");
      const key = buildKey(row, leftKeyIdx);
      const item: DiffRow = { key, keyValues, row };
      const arr = leftMap.get(key);
      if (arr) arr.push(item);
      else leftMap.set(key, [item]);
    });

    const rightMap = new Map<string, DiffRow[]>();
    rightCSV.rows.forEach((row) => {
      const keyValues = rightKeyIdx.map((i) => row[i] ?? "");
      const key = buildKey(row, rightKeyIdx);
      const item: DiffRow = { key, keyValues, row };
      const arr = rightMap.get(key);
      if (arr) arr.push(item);
      else rightMap.set(key, [item]);
    });

    const leftOnly: DiffRow[] = [];
    leftMap.forEach((items, key) => {
      if (!rightMap.has(key)) {
        leftOnly.push(...items);
      }
    });

    const rightOnly: DiffRow[] = [];
    rightMap.forEach((items, key) => {
      if (!leftMap.has(key)) {
        rightOnly.push(...items);
      }
    });

    const leftDupKeys: { key: string; count: number }[] = [];
    leftMap.forEach((items) => {
      if (items.length > 1) {
        leftDupKeys.push({
          key: items[0].keyValues.join(" | "),
          count: items.length,
        });
      }
    });
    const rightDupKeys: { key: string; count: number }[] = [];
    rightMap.forEach((items) => {
      if (items.length > 1) {
        rightDupKeys.push({
          key: items[0].keyValues.join(" | "),
          count: items.length,
        });
      }
    });

    // 展示列合集：以左表头为准，追加右表头中缺少的列
    const headersUnion = [...leftCSV.headers];
    rightCSV.headers.forEach((h) => {
      if (!headersUnion.includes(h)) headersUnion.push(h);
    });

    setResult({
      leftOnly,
      rightOnly,
      leftDupKeys,
      rightDupKeys,
      headersUnion,
    });
    setLeftPage((p) => ({ ...p, current: 1 }));
    setRightPage((p) => ({ ...p, current: 1 }));
    setLeftSelectedKeys([]);
    setRightSelectedKeys([]);

    message.success(
      `对比完成：左多 ${leftOnly.length} 行，右多 ${rightOnly.length} 行`
    );
  };

  /** 将 row 按某侧的 headers 映射到展示用的 headersUnion 顺序 */
  const mapRowToUnion = (
    row: string[],
    sourceHeaders: string[],
    unionHeaders: string[]
  ): Record<string, string> => {
    const obj: Record<string, string> = {};
    unionHeaders.forEach((h) => {
      const idx = sourceHeaders.indexOf(h);
      obj[h] = idx >= 0 ? row[idx] ?? "" : "";
    });
    return obj;
  };

  /** 导出差异结果为 CSV；若存在勾选则只导出勾选行 */
  const handleExport = () => {
    if (!result || !leftCSV || !rightCSV) return;

    const hasSelection =
      leftSelectedKeys.length > 0 || rightSelectedKeys.length > 0;
    const leftSelSet = new Set(leftSelectedKeys.map((k) => String(k)));
    const rightSelSet = new Set(rightSelectedKeys.map((k) => String(k)));

    const headers = ["来源", ...result.headersUnion];
    const lines: string[] = [rowToCSVLine(headers)];

    result.leftOnly.forEach((d, i) => {
      if (hasSelection && !leftSelSet.has(`L-${i}`)) return;
      const obj = mapRowToUnion(d.row, leftCSV.headers, result.headersUnion);
      lines.push(
        rowToCSVLine([
          "左侧独有（右缺少）",
          ...result.headersUnion.map((h) => obj[h] ?? ""),
        ])
      );
    });
    result.rightOnly.forEach((d, i) => {
      if (hasSelection && !rightSelSet.has(`R-${i}`)) return;
      const obj = mapRowToUnion(d.row, rightCSV.headers, result.headersUnion);
      lines.push(
        rowToCSVLine([
          "右侧独有（左缺少）",
          ...result.headersUnion.map((h) => obj[h] ?? ""),
        ])
      );
    });

    if (lines.length === 1) {
      message.warning("没有可导出的数据");
      return;
    }

    const csv = lines.join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ordered-compare-result-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(
      hasSelection
        ? `已导出勾选的 ${lines.length - 1} 行`
        : `已导出全部 ${lines.length - 1} 行`
    );
  };

  /** 过滤搜索 */
  const filterBySearch = (rows: DiffRow[]): DiffRow[] => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (d) =>
        d.keyValues.some((v) => v.toLowerCase().includes(q)) ||
        d.row.some((v) => (v ?? "").toLowerCase().includes(q))
    );
  };

  /** 构造 antd Table 列 */
  const buildColumns = (
    sourceHeaders: string[],
    unionHeaders: string[],
    keyCols: string[]
  ) => {
    return unionHeaders.map((h) => ({
      title: (
        <span>
          {h}
          {keyCols.includes(h) ? (
            <Tag
              color="geekblue"
              style={{ marginLeft: 4, fontSize: 10, lineHeight: "16px" }}
            >
              key
            </Tag>
          ) : null}
        </span>
      ),
      dataIndex: h,
      key: h,
      ellipsis: true,
      width: 160,
      render: (val: string) => {
        const exists = sourceHeaders.includes(h);
        if (!exists) {
          return <Text type="secondary" italic>—</Text>;
        }
        return <span style={{ fontFamily: "monospace" }}>{val}</span>;
      },
    }));
  };

  const leftOnlyFiltered = result ? filterBySearch(result.leftOnly) : [];
  const rightOnlyFiltered = result ? filterBySearch(result.rightOnly) : [];

  const leftOnlyData = useMemo(() => {
    if (!result || !leftCSV) return [];
    return leftOnlyFiltered.map((d, i) => ({
      _rowKey: `L-${i}`,
      ...mapRowToUnion(d.row, leftCSV.headers, result.headersUnion),
    }));
  }, [leftOnlyFiltered, result, leftCSV]);

  const rightOnlyData = useMemo(() => {
    if (!result || !rightCSV) return [];
    return rightOnlyFiltered.map((d, i) => ({
      _rowKey: `R-${i}`,
      ...mapRowToUnion(d.row, rightCSV.headers, result.headersUnion),
    }));
  }, [rightOnlyFiltered, result, rightCSV]);

  return (
    <Page maxWidth="100%">
      {/* 允许结果表格里用鼠标拖选文本复制（antd 默认在某些元素上会禁用 user-select） */}
      <style>{`
        .ordered-compare-selectable .ant-table-cell,
        .ordered-compare-selectable .ant-table-cell * {
          user-select: text !important;
          -webkit-user-select: text !important;
          cursor: text;
        }
        .ordered-compare-selectable .ant-table-selection-column,
        .ordered-compare-selectable .ant-table-selection-column * {
          cursor: pointer;
          user-select: none !important;
        }
      `}</style>
      {/* 上传区 */}
      <Block>
        <div style={{ marginBottom: 12 }}>
          <Checkbox
            checked={hasHeader}
            onChange={(e) => handleToggleHasHeader(e.target.checked)}
          >
            首行作为表头
          </Checkbox>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            {hasHeader
              ? "CSV 的第一行将被视为列名"
              : "没有表头，自动生成列名（列1、列2…）"}
          </Text>
        </div>
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
              左侧 CSV 文件
            </Text>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Upload.Dragger
                {...uploadPropsFor("left")}
                style={{ padding: "12px 8px" }}
              >
                <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}>
                  <UploadOutlined />
                </p>
                <p className="ant-upload-text" style={{ fontSize: 13 }}>
                  点击或拖拽 CSV 文件到此处
                </p>
                <p
                  className="ant-upload-hint"
                  style={{ fontSize: 12, marginBottom: 0 }}
                >
                  仅支持单个 .csv 文件
                </p>
              </Upload.Dragger>
              {leftCSV && (
                <div
                  style={{
                    padding: 8,
                    background: token.colorFillAlter,
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <Text strong>{leftCSV.fileName}</Text>
                  </div>
                  <div>
                    <Text type="secondary">
                      {leftCSV.rows.length} 行 · {leftCSV.headers.length} 列
                    </Text>
                  </div>
                </div>
              )}
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  关键字列（可多选）
                </Text>
                <Select
                  mode="multiple"
                  style={{ width: "100%" }}
                  placeholder="选择作为关键字的列"
                  value={leftKeyCols}
                  disabled={!leftCSV}
                  options={(leftCSV?.headers ?? []).map((h) => ({
                    label: h,
                    value: h,
                  }))}
                  onChange={(vals) => {
                    setLeftKeyCols(vals);
                    leftKeyOrderRef.current = vals;
                  }}
                />
              </div>
            </Space>
          </Col>
          <Col xs={24} lg={12}>
            <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
              右侧 CSV 文件
            </Text>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Upload.Dragger
                {...uploadPropsFor("right")}
                style={{ padding: "12px 8px" }}
              >
                <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}>
                  <UploadOutlined />
                </p>
                <p className="ant-upload-text" style={{ fontSize: 13 }}>
                  点击或拖拽 CSV 文件到此处
                </p>
                <p
                  className="ant-upload-hint"
                  style={{ fontSize: 12, marginBottom: 0 }}
                >
                  仅支持单个 .csv 文件
                </p>
              </Upload.Dragger>
              {rightCSV && (
                <div
                  style={{
                    padding: 8,
                    background: token.colorFillAlter,
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <Text strong>{rightCSV.fileName}</Text>
                  </div>
                  <div>
                    <Text type="secondary">
                      {rightCSV.rows.length} 行 · {rightCSV.headers.length} 列
                    </Text>
                  </div>
                </div>
              )}
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  关键字列（可多选）
                </Text>
                <Select
                  mode="multiple"
                  style={{ width: "100%" }}
                  placeholder="选择作为关键字的列"
                  value={rightKeyCols}
                  disabled={!rightCSV}
                  options={(rightCSV?.headers ?? []).map((h) => ({
                    label: h,
                    value: h,
                  }))}
                  onChange={(vals) => {
                    setRightKeyCols(vals);
                    rightKeyOrderRef.current = vals;
                  }}
                />
              </div>
            </Space>
          </Col>
        </Row>

        {/* 提示：两侧列名有交集时可一键同步 */}
        {commonHeaders.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              检测到共同列：
            </Text>
            <Space wrap size={[4, 4]} style={{ marginLeft: 6 }}>
              {commonHeaders.map((h) => (
                <Tag
                  key={h}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  color={
                    leftKeyCols.includes(h) && rightKeyCols.includes(h)
                      ? "geekblue"
                      : "default"
                  }
                  onClick={() => {
                    const already =
                      leftKeyCols.includes(h) && rightKeyCols.includes(h);
                    const next = already
                      ? leftKeyCols.filter((x) => x !== h)
                      : Array.from(new Set([...leftKeyCols, h]));
                    handleSyncKeyCols(next);
                  }}
                >
                  {h}
                </Tag>
              ))}
            </Space>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          <Button
            type="primary"
            icon={<SwapOutlined />}
            onClick={doCompare}
            disabled={!leftCSV || !rightCSV}
          >
            开始对比
          </Button>
          <Button
            onClick={() => {
              setLeftCSV(null);
              setRightCSV(null);
              setLeftKeyCols([]);
              setRightKeyCols([]);
              setResult(null);
              setLeftSelectedKeys([]);
              setRightSelectedKeys([]);
            }}
          >
            清空
          </Button>
          {result && (
            <>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                {leftSelectedKeys.length + rightSelectedKeys.length > 0
                  ? `导出已选 (${
                      leftSelectedKeys.length + rightSelectedKeys.length
                    })`
                  : "导出差异 CSV"}
              </Button>
              {(leftSelectedKeys.length > 0 || rightSelectedKeys.length > 0) && (
                <Button
                  onClick={() => {
                    setLeftSelectedKeys([]);
                    setRightSelectedKeys([]);
                  }}
                >
                  取消选择
                </Button>
              )}
            </>
          )}
        </div>
      </Block>

      {/* 使用说明 */}
      {!result && (
        <Block>
          <Alert
            type="info"
            showIcon
            message="使用说明"
            description={
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                <li>上传两个 CSV 文件（首行为列名）。</li>
                <li>
                  分别选择 <Text strong>作为关键字的列</Text>
                  （可多选，多列组合作为唯一标识）。
                </li>
                <li>
                  左右两侧关键字列的 <Text strong>数量需要一致</Text>
                  ，按选择顺序一一对应。
                </li>
                <li>
                  对比结果将告诉你：
                  <Tag color="red" style={{ marginLeft: 4 }}>
                    右文件缺少
                  </Tag>
                  <Tag color="green">左文件缺少</Tag>
                  分别是哪些行。
                </li>
              </ul>
            }
          />
        </Block>
      )}

      {/* 对比结果 */}
      {result && leftCSV && rightCSV && (
        <>
          {/* 汇总信息 */}
          <Block>
            <Space size={[8, 8]} wrap>
              <Tag color="red" style={{ fontSize: 13, padding: "2px 8px" }}>
                右文件缺少（左独有）：{result.leftOnly.length} 行
              </Tag>
              <Tag color="green" style={{ fontSize: 13, padding: "2px 8px" }}>
                左文件缺少（右独有）：{result.rightOnly.length} 行
              </Tag>
              {result.leftDupKeys.length > 0 && (
                <Tag color="orange">
                  左侧关键字重复：{result.leftDupKeys.length}
                </Tag>
              )}
              {result.rightDupKeys.length > 0 && (
                <Tag color="orange">
                  右侧关键字重复：{result.rightDupKeys.length}
                </Tag>
              )}
            </Space>

            {(result.leftDupKeys.length > 0 ||
              result.rightDupKeys.length > 0) && (
              <Alert
                style={{ marginTop: 12 }}
                type="warning"
                showIcon
                message="关键字存在重复，对比以『关键字是否存在于另一侧』为准，重复条目均会被列出"
              />
            )}

            <div style={{ marginTop: 12 }}>
              <Input.Search
                allowClear
                placeholder="在结果中搜索（匹配任意字段）"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setLeftPage((p) => ({ ...p, current: 1 }));
                  setRightPage((p) => ({ ...p, current: 1 }));
                }}
                onSearch={(v) => {
                  setSearchText(v);
                  setLeftPage((p) => ({ ...p, current: 1 }));
                  setRightPage((p) => ({ ...p, current: 1 }));
                }}
                style={{ maxWidth: 360 }}
              />
            </div>
          </Block>

          {/* 左侧独有 */}
          <Block>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <Tag color="red" style={{ marginRight: 8 }}>
                右文件缺少 ({leftOnlyFiltered.length}/{result.leftOnly.length})
              </Tag>
              {leftSelectedKeys.length > 0 && (
                <Tag color="blue" style={{ marginRight: 8 }}>
                  已选 {leftSelectedKeys.length}
                </Tag>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                这些行在左文件 <Text strong>{leftCSV.fileName}</Text> 中存在，但右文件中没有
              </Text>
            </div>
            {result.leftOnly.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="右文件没有缺少任何行"
              />
            ) : (
              <Table
                size="small"
                rowKey="_rowKey"
                bordered
                className="ordered-compare-selectable"
                dataSource={leftOnlyData}
                columns={buildColumns(
                  leftCSV.headers,
                  result.headersUnion,
                  leftKeyCols
                )}
                scroll={{ x: "max-content", y: 320 }}
                rowSelection={{
                  selectedRowKeys: leftSelectedKeys,
                  onChange: (keys) => setLeftSelectedKeys(keys),
                  preserveSelectedRowKeys: true,
                  columnWidth: 40,
                  fixed: true,
                }}
                onRow={() => ({
                  // 允许在单元格里拖选文本复制
                  style: { userSelect: "text", cursor: "text" },
                })}
                onChange={(p) =>
                  setLeftPage({
                    current: p.current ?? 1,
                    pageSize: p.pageSize ?? leftPage.pageSize,
                  })
                }
                pagination={{
                  current: leftPage.current,
                  pageSize: leftPage.pageSize,
                  showSizeChanger: true,
                  pageSizeOptions: ["10", "20", "50", "100", "200"],
                  showTotal: (t) => `共 ${t} 条`,
                }}
              />
            )}
          </Block>

          {/* 右侧独有 */}
          <Block>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <Tag color="green" style={{ marginRight: 8 }}>
                左文件缺少 ({rightOnlyFiltered.length}/{result.rightOnly.length})
              </Tag>
              {rightSelectedKeys.length > 0 && (
                <Tag color="blue" style={{ marginRight: 8 }}>
                  已选 {rightSelectedKeys.length}
                </Tag>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                这些行在右文件 <Text strong>{rightCSV.fileName}</Text> 中存在，但左文件中没有
              </Text>
            </div>
            {result.rightOnly.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="左文件没有缺少任何行"
              />
            ) : (
              <Table
                size="small"
                rowKey="_rowKey"
                bordered
                className="ordered-compare-selectable"
                dataSource={rightOnlyData}
                columns={buildColumns(
                  rightCSV.headers,
                  result.headersUnion,
                  rightKeyCols
                )}
                scroll={{ x: "max-content", y: 320 }}
                rowSelection={{
                  selectedRowKeys: rightSelectedKeys,
                  onChange: (keys) => setRightSelectedKeys(keys),
                  preserveSelectedRowKeys: true,
                  columnWidth: 40,
                  fixed: true,
                }}
                onRow={() => ({
                  // 允许在单元格里拖选文本复制
                  style: { userSelect: "text", cursor: "text" },
                })}
                onChange={(p) =>
                  setRightPage({
                    current: p.current ?? 1,
                    pageSize: p.pageSize ?? rightPage.pageSize,
                  })
                }
                pagination={{
                  current: rightPage.current,
                  pageSize: rightPage.pageSize,
                  showSizeChanger: true,
                  pageSizeOptions: ["10", "20", "50", "100", "200"],
                  showTotal: (t) => `共 ${t} 条`,
                }}
              />
            )}
          </Block>

          {/* 重复 key 明细 */}
          {(result.leftDupKeys.length > 0 || result.rightDupKeys.length > 0) && (
            <Block>
              <Title level={5} style={{ marginTop: 0 }}>
                关键字重复明细
              </Title>
              <Row gutter={16}>
                <Col xs={24} lg={12}>
                  <Text type="secondary">
                    左侧重复（{result.leftDupKeys.length}）
                  </Text>
                  <div
                    style={{
                      fontFamily: "monospace",
                      background: token.colorFillAlter,
                      padding: 8,
                      borderRadius: 6,
                      maxHeight: 200,
                      overflowY: "auto",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {result.leftDupKeys.length === 0 ? (
                      <Text type="secondary">无</Text>
                    ) : (
                      result.leftDupKeys.map((d, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "2px 0",
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {d.key}
                          </span>
                          <Tag color="orange">×{d.count}</Tag>
                        </div>
                      ))
                    )}
                  </div>
                </Col>
                <Col xs={24} lg={12}>
                  <Text type="secondary">
                    右侧重复（{result.rightDupKeys.length}）
                  </Text>
                  <div
                    style={{
                      fontFamily: "monospace",
                      background: token.colorFillAlter,
                      padding: 8,
                      borderRadius: 6,
                      maxHeight: 200,
                      overflowY: "auto",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {result.rightDupKeys.length === 0 ? (
                      <Text type="secondary">无</Text>
                    ) : (
                      result.rightDupKeys.map((d, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "2px 0",
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {d.key}
                          </span>
                          <Tag color="orange">×{d.count}</Tag>
                        </div>
                      ))
                    )}
                  </div>
                </Col>
              </Row>
            </Block>
          )}
        </>
      )}
    </Page>
  );
};

export default OrderedCompare;
