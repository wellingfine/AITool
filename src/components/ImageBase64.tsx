import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Input,
  Button,
  Typography,
  App,
  theme,
  Modal,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  ZoomInOutlined,
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { nativeAPI } from "../services/nativeAPI";
import Block from '../lib/Block';
import Page from '../lib/Page';

const { Text } = Typography;
const { TextArea } = Input;

interface ImageItem {
  id: string;
  base64WithHeader: string;
  base64Raw: string;
  mimeType: string;
}

const ImageBase64: React.FC = () => {
  const [base64Input, setBase64Input] = useState<string>("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = theme.useToken();
  const { message } = App.useApp();

  // 根据 base64 解码后的魔数检测图片类型，非图片返回 null
  const detectImageMimeType = (raw: string): string | null => {
    try {
      const decoded = atob(raw);
      if (decoded.length < 4) return null;

      const bytes = new Uint8Array(4);
      for (let i = 0; i < 4; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }

      // PNG: 89 50 4E 47
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return "image/png";
      }
      // JPEG: FF D8 FF
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return "image/jpeg";
      }
      // GIF: 47 49 46
      if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        return "image/gif";
      }
      // WebP: 52 49 46 46 (RIFF)
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        return "image/webp";
      }
      // BMP: 42 4D
      if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
        return "image/bmp";
      }
      return null;
    } catch {
      return null;
    }
  };

  // 检测并解析单个 base64（带头或不带头）
  const parseBase64 = (input: string): { withHeader: string; raw: string; mimeType: string } | null => {
    const trimmed = input.trim();

    // 检测是否有 data:image 头
    const headerMatch = trimmed.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
    if (headerMatch) {
      return {
        withHeader: trimmed,
        raw: headerMatch[2],
        mimeType: headerMatch[1],
      };
    }

    // 没有头，尝试通过魔数验证是否为有效图片 base64
    const mimeType = detectImageMimeType(trimmed);
    if (mimeType) {
      return {
        withHeader: `data:${mimeType};base64,${trimmed}`,
        raw: trimmed,
        mimeType,
      };
    }
    return null;
  };

  // 从任意 JSON 值中递归收集所有字符串
  const collectStrings = (value: unknown, acc: string[]) => {
    if (typeof value === "string") {
      acc.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) collectStrings(item, acc);
    } else if (value && typeof value === "object") {
      for (const v of Object.values(value)) collectStrings(v, acc);
    }
  };

  // 从字符串中提取可能的 base64 图片候选：
  // 1) data:image/...;base64,xxx 形式
  // 2) 纯 base64（长度较长且字符集合法）
  const extractBase64Candidates = (str: string): string[] => {
    const candidates: string[] = [];

    // 匹配所有 data URI 形式（字符串中可能嵌入多个）
    const dataUriRegex = /data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/]+=*/g;
    const dataUriMatches = str.match(dataUriRegex);
    if (dataUriMatches) {
      candidates.push(...dataUriMatches);
      return candidates;
    }

    // 纯 base64：整串是合法 base64 字符集且长度足够
    const trimmed = str.trim();
    if (trimmed.length >= 24 && /^[A-Za-z0-9+/]+=*$/.test(trimmed)) {
      candidates.push(trimmed);
    }
    return candidates;
  };

  // 从 JSON 中提取所有 base64 图片
  const extractImagesFromJson = (parsedJson: unknown): ImageItem[] => {
    const strings: string[] = [];
    collectStrings(parsedJson, strings);

    const result: ImageItem[] = [];
    const seen = new Set<string>();

    strings.forEach((str, idx) => {
      const candidates = extractBase64Candidates(str);
      candidates.forEach((candidate, cIdx) => {
        const parsed = parseBase64(candidate);
        if (parsed && !seen.has(parsed.raw)) {
          seen.add(parsed.raw);
          result.push({
            id: `${Date.now()}-${idx}-${cIdx}`,
            base64WithHeader: parsed.withHeader,
            base64Raw: parsed.raw,
            mimeType: parsed.mimeType,
          });
        }
      });
    });

    return result;
  };

  // 转换为图片：自动识别是「JSON」还是「单个 Base64」
  const handleConvert = () => {
    const input = base64Input.trim();
    if (!input) {
      message.warning("请输入 Base64 字符串或 JSON");
      return;
    }

    // 优先尝试作为 JSON 解析：搜索整个 JSON 中的所有 base64 图片
    if (input.startsWith("{") || input.startsWith("[")) {
      try {
        const parsedJson = JSON.parse(input);
        const found = extractImagesFromJson(parsedJson);
        if (found.length > 0) {
          setImages((prev) => [...found, ...prev]);
          message.success(`从 JSON 中提取到 ${found.length} 张图片`);
          return;
        }
        message.warning("JSON 中未找到有效的图片 Base64");
        return;
      } catch {
        // 不是合法 JSON，继续按单个 Base64 处理
      }
    }

    const parsed = parseBase64(input);
    if (!parsed) {
      message.error("无效的 Base64 字符串");
      return;
    }

    const newImage: ImageItem = {
      id: Date.now().toString(),
      base64WithHeader: parsed.withHeader,
      base64Raw: parsed.raw,
      mimeType: parsed.mimeType,
    };

    setImages([newImage, ...images]);
    message.success("转换成功");
  };

  // 处理文件选择/拖放 - 同时添加到图片列表和输入框
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.error("请选择图片文件");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setBase64Input(result);
      
      // 同时添加到图片列表
      const parsed = parseBase64(result);
      if (parsed) {
        const newImage: ImageItem = {
          id: Date.now().toString(),
          base64WithHeader: parsed.withHeader,
          base64Raw: parsed.raw,
          mimeType: parsed.mimeType,
        };
        setImages((prev) => [newImage, ...prev]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string, label: string) => {
    await nativeAPI.clipboard.write(text);
    message.success(`已复制${label}`);
  };

  // 删除图片
  const handleDelete = (id: string) => {
    setImages(images.filter((img) => img.id !== id));
  };

  // 预览图片（按索引）
  const handlePreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  // 上一张 / 下一张（循环切换）
  const showPrev = useCallback(() => {
    setPreviewIndex((i) => (images.length === 0 ? -1 : (i - 1 + images.length) % images.length));
  }, [images.length]);

  const showNext = useCallback(() => {
    setPreviewIndex((i) => (images.length === 0 ? -1 : (i + 1) % images.length));
  }, [images.length]);

  // 预览时支持键盘左右方向键切换、Esc 关闭
  useEffect(() => {
    if (!previewVisible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") showPrev();
      else if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewVisible, showPrev, showNext]);

  const previewItem = previewIndex >= 0 ? images[previewIndex] : undefined;

  return (
    <Page maxWidth={800}>
      {/* Base64 输入区域 */}
      <Block>
        <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
          输入图片 Base64（自动检测是否带头），或粘贴 JSON（自动搜索其中所有图片 Base64）
        </Text>
        <TextArea
          value={base64Input}
          onChange={(e) => setBase64Input(e.target.value)}
          placeholder="粘贴图片 Base64 字符串（支持带头/不带头），或粘贴整个 JSON，将自动提取其中所有图片..."
          rows={5}
          style={{ fontFamily: "monospace", resize: "none" }}
        />
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          <Button type="primary" onClick={handleConvert}>
            转换为图片
          </Button>
          <Button onClick={() => setBase64Input("")} disabled={!base64Input}>
            清空
          </Button>
        </div>
      </Block>

      {/* 图片列表 */}
      <Block>
        <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
          图片列表
        </Text>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 16,
          }}
        >
          {/* 拖拽上传区域 - 放在第一个位置 */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            style={{
              aspectRatio: "1",
              border: `2px dashed ${token.colorBorder}`,
              borderRadius: token.borderRadius,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              background: token.colorFillAlter,
              transition: "border-color 0.3s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = token.colorPrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = token.colorBorder)}
          >
            <PlusOutlined style={{ fontSize: 24, color: token.colorTextSecondary }} />
            <Text type="secondary" style={{ marginTop: 8, fontSize: 12, textAlign: "center" }}>
              拖拽图片
              <br />
              或点击选择
            </Text>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />

          {images.map((img, index) => (
            <div
              key={img.id}
              style={{
                position: "relative",
                aspectRatio: "1",
                border: `1px solid ${token.colorBorder}`,
                borderRadius: token.borderRadius,
                overflow: "hidden",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHoveredId(img.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <img
                src={img.base64WithHeader}
                alt="preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  background: token.colorFillAlter,
                }}
                onClick={() => handlePreview(index)}
              />
              {/* Hover 操作层 */}
              {hoveredId === img.id && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.6)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Tooltip title="放大查看" placement="right">
                    <Button
                      type="primary"
                      size="small"
                      icon={<ZoomInOutlined />}
                      onClick={() => handlePreview(index)}
                    >
                      放大
                    </Button>
                  </Tooltip>
                  <Tooltip title="复制完整 Base64（带头）" placement="right">
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(img.base64WithHeader, "完整 Base64");
                      }}
                    >
                      复制 Base64
                    </Button>
                  </Tooltip>
                  <Tooltip title="复制纯 Base64（不带头）" placement="right">
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(img.base64Raw, "去头 Base64");
                      }}
                    >
                      复制去头
                    </Button>
                  </Tooltip>
                  <Tooltip title="删除" placement="right">
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(img.id);
                      }}
                    >
                      删除
                    </Button>
                  </Tooltip>
                </div>
              )}
            </div>
          ))}
        </div>
      </Block>

      {/* 图片预览 Modal - 全屏、图片占满窗口、支持左右切换 */}
      <Modal
        open={previewVisible}
        footer={null}
        closable={false}
        onCancel={() => setPreviewVisible(false)}
        width="100vw"
        style={{ top: 0, maxWidth: "100vw", paddingBottom: 0 }}
        styles={{
          container: {
            padding: 0,
            height: "100vh",
            borderRadius: 0,
            background: "rgba(0,0,0,0.92)",
            boxShadow: "none",
          },
          body: { padding: 0, height: "100vh" },
          mask: { background: "rgba(0,0,0,0.6)" },
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {previewItem && (
            <img
              alt="preview"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
                objectFit: "contain",
              }}
              src={previewItem.base64WithHeader}
            />
          )}

          {/* 关闭按钮 */}
          <Button
            type="text"
            icon={<CloseOutlined style={{ fontSize: 22, color: "#fff" }} />}
            onClick={() => setPreviewVisible(false)}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.45)",
            }}
          />

          {/* 图片序号 */}
          {images.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: 20,
                left: "50%",
                transform: "translateX(-50%)",
                color: "#fff",
                fontSize: 14,
                background: "rgba(0,0,0,0.45)",
                padding: "4px 12px",
                borderRadius: 16,
              }}
            >
              {previewIndex + 1} / {images.length}
            </div>
          )}

          {/* 左右切换按钮 - 多于一张时显示 */}
          {images.length > 1 && (
            <>
              <Button
                type="text"
                icon={<LeftOutlined style={{ fontSize: 24, color: "#fff" }} />}
                onClick={showPrev}
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.45)",
                }}
              />
              <Button
                type="text"
                icon={<RightOutlined style={{ fontSize: 24, color: "#fff" }} />}
                onClick={showNext}
                style={{
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.45)",
                }}
              />
            </>
          )}
        </div>
      </Modal>
    </Page>
  );
};

export default ImageBase64;
