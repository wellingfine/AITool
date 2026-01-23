import React, { useState, useRef } from "react";
import {
  Card,
  Input,
  Button,
  Typography,
  Space,
  message,
  Progress,
  theme,
  Checkbox,
} from "antd";
import {
  CopyOutlined,
  InboxOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import CryptoJS from "crypto-js";
import { nativeAPI } from "../services/nativeAPI";

const { Text } = Typography;
const { TextArea } = Input;

type HashType = "MD5" | "SHA1" | "SHA256";

interface HashResults {
  MD5?: string;
  SHA1?: string;
  SHA256?: string;
}

const HashCalculator: React.FC = () => {
  // 选中的算法
  const [selectedAlgos, setSelectedAlgos] = useState<HashType[]>(["MD5"]);

  // 字符串计算状态
  const [textInput, setTextInput] = useState<string>("");
  const [textHashResults, setTextHashResults] = useState<HashResults>({});

  // 文件计算状态
  const [fileHashResults, setFileHashResults] = useState<HashResults>({});
  const [progress, setProgress] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { token } = theme.useToken();

  // 处理算法选择
  const handleAlgoChange = (algo: HashType, checked: boolean) => {
    if (checked) {
      setSelectedAlgos([...selectedAlgos, algo]);
    } else {
      // 至少保留一个
      if (selectedAlgos.length > 1) {
        setSelectedAlgos(selectedAlgos.filter((a) => a !== algo));
      } else {
        message.warning("至少选择一种算法");
      }
    }
  };

  // 计算字符串的 Hash
  const calculateTextHash = () => {
    if (!textInput.trim()) {
      message.warning("请输入要计算的文本");
      return;
    }
    const results: HashResults = {};
    if (selectedAlgos.includes("MD5")) {
      results.MD5 = CryptoJS.MD5(textInput).toString().toUpperCase();
    }
    if (selectedAlgos.includes("SHA1")) {
      results.SHA1 = CryptoJS.SHA1(textInput).toString().toUpperCase();
    }
    if (selectedAlgos.includes("SHA256")) {
      results.SHA256 = CryptoJS.SHA256(textInput).toString().toUpperCase();
    }
    setTextHashResults(results);
    message.success("计算完成");
  };

  // 计算文件的 Hash（分块读取，显示进度）
  const calculateFileHash = async (file: File) => {
    setIsCalculating(true);
    setProgress(0);
    setFileHashResults({});
    setFileName(file.name);

    const chunkSize = 2 * 1024 * 1024; // 2MB 分块
    const chunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;

    // 创建所有需要的哈希器
    const hashers: { type: HashType; hasher: any }[] = [];
    if (selectedAlgos.includes("MD5")) {
      hashers.push({ type: "MD5", hasher: CryptoJS.algo.MD5.create() });
    }
    if (selectedAlgos.includes("SHA1")) {
      hashers.push({ type: "SHA1", hasher: CryptoJS.algo.SHA1.create() });
    }
    if (selectedAlgos.includes("SHA256")) {
      hashers.push({ type: "SHA256", hasher: CryptoJS.algo.SHA256.create() });
    }

    const readChunk = (start: number): Promise<ArrayBuffer> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const blob = file.slice(start, start + chunkSize);
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
    };

    try {
      for (let i = 0; i < chunks; i++) {
        const chunk = await readChunk(i * chunkSize);
        const wordArray = CryptoJS.lib.WordArray.create(chunk as any);
        // 更新所有哈希器
        hashers.forEach((h) => h.hasher.update(wordArray));
        currentChunk++;
        setProgress(Math.round((currentChunk / chunks) * 100));
      }

      // 获取所有结果
      const results: HashResults = {};
      hashers.forEach((h) => {
        results[h.type] = h.hasher.finalize().toString().toUpperCase();
      });
      setFileHashResults(results);
      message.success("计算完成");
    } catch (error) {
      message.error("文件读取失败");
    } finally {
      setIsCalculating(false);
    }
  };

  // 处理文件拖放
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      calculateFileHash(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      calculateFileHash(files[0]);
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

  // 清除文件
  const clearFile = () => {
    setFileName("");
    setFileHashResults({});
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 渲染结果列表
  const renderHashResults = (results: HashResults) => {
    const entries = Object.entries(results).filter(([_, value]) => value);
    if (entries.length === 0) return null;

    return (
      <div style={{ marginTop: 12 }}>
        {entries.map(([type, value]) => (
          <div key={type} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <Text type="secondary">{type === "SHA1" ? "SHA-1" : type === "SHA256" ? "SHA-256" : type}</Text>
              <Button
                type="link"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(value!)}
                style={{ padding: 0, height: "auto" }}
              >
                复制
              </Button>
            </div>
            <Input
              value={value}
              readOnly
              style={{ fontFamily: "monospace", background: token.colorFillAlter }}
            />
          </div>
        ))}
      </div>
    );
  };

  // 算法选择区域
  const AlgoCheckboxes = (
    <Space style={{ marginBottom: 16 }}>
      <Text type="secondary">算法:</Text>
      <Checkbox
        checked={selectedAlgos.includes("MD5")}
        onChange={(e) => handleAlgoChange("MD5", e.target.checked)}
      >
        MD5
      </Checkbox>
      <Checkbox
        checked={selectedAlgos.includes("SHA1")}
        onChange={(e) => handleAlgoChange("SHA1", e.target.checked)}
      >
        SHA-1
      </Checkbox>
      <Checkbox
        checked={selectedAlgos.includes("SHA256")}
        onChange={(e) => handleAlgoChange("SHA256", e.target.checked)}
      >
        SHA-256
      </Checkbox>
    </Space>
  );

  return (
    <div style={{ padding: "0 20px" }}>
      {AlgoCheckboxes}
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        {/* 字符串 Hash 计算 */}
        <Card title="字符串 Hash 计算">
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Text type="secondary">输入文本</Text>
            <TextArea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="请输入要计算 Hash 的文本..."
              autoSize={{ minRows: 3, maxRows: 6 }}
              style={{ fontFamily: "monospace" }}
            />
            <Button type="primary" onClick={calculateTextHash}>
              计算
            </Button>
            {renderHashResults(textHashResults)}
          </Space>
        </Card>

        {/* 文件 Hash 计算 */}
        <Card title="文件 Hash 计算">
          <Space orientation="vertical" style={{ width: "100%" }}>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${token.colorBorder}`,
                borderRadius: token.borderRadius,
                padding: "40px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: token.colorFillAlter,
                transition: "border-color 0.3s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = token.colorPrimary)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = token.colorBorder)}
            >
              <InboxOutlined style={{ fontSize: 48, color: token.colorPrimary }} />
              <p style={{ marginTop: 8, marginBottom: 0, color: token.colorTextSecondary }}>
                点击或拖拽文件到此区域
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />

            {fileName && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text>
                    文件: <Text strong>{fileName}</Text>
                  </Text>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={clearFile}
                    disabled={isCalculating}
                  >
                    清除
                  </Button>
                </div>

                {isCalculating && (
                  <Progress percent={progress} status="active" style={{ marginTop: 8 }} />
                )}

                {renderHashResults(fileHashResults)}
              </div>
            )}
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default HashCalculator;
