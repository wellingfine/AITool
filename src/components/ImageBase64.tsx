import React, { useState, useRef } from "react";
import {
  Input,
  Button,
  Typography,
  Space,
  message,
  theme,
  Modal,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  ZoomInOutlined,
} from "@ant-design/icons";
import { nativeAPI } from "../services/nativeAPI";

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
  const [previewImage, setPreviewImage] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = theme.useToken();

  // 检测并解析 base64
  const parseBase64 = (input: string): { withHeader: string; raw: string; mimeType: string } | null => {
    const trimmed = input.trim();
    
    // 检测是否有 data:image 头
    const headerMatch = trimmed.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (headerMatch) {
      return {
        withHeader: trimmed,
        raw: headerMatch[2],
        mimeType: headerMatch[1],
      };
    }

    // 没有头，尝试验证是否为有效 base64
    try {
      const decoded = atob(trimmed);
      // 检测图片类型
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      
      let mimeType = "image/png"; // 默认
      // PNG: 89 50 4E 47
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        mimeType = "image/png";
      }
      // JPEG: FF D8 FF
      else if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        mimeType = "image/jpeg";
      }
      // GIF: 47 49 46
      else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        mimeType = "image/gif";
      }
      // WebP: 52 49 46 46 ... 57 45 42 50
      else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        mimeType = "image/webp";
      }

      return {
        withHeader: `data:${mimeType};base64,${trimmed}`,
        raw: trimmed,
        mimeType,
      };
    } catch {
      return null;
    }
  };

  // 转换为图片
  const handleConvert = () => {
    if (!base64Input.trim()) {
      message.warning("请输入 Base64 字符串");
      return;
    }

    const parsed = parseBase64(base64Input);
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
    setBase64Input("");
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

  // 预览图片
  const handlePreview = (base64: string) => {
    setPreviewImage(base64);
    setPreviewVisible(true);
  };

  return (
    <div style={{ padding: "0 20px" }}>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        {/* Base64 输入区域 */}
        <div>
          <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
            输入图片 Base64（自动检测是否带头）
          </Text>
          <TextArea
            value={base64Input}
            onChange={(e) => setBase64Input(e.target.value)}
            placeholder="粘贴图片 Base64 字符串，支持带头或不带头格式..."
            rows={5}
            style={{ fontFamily: "monospace", resize: "none" }}
          />
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <Button type="primary" onClick={handleConvert}>
              转换为图片
            </Button>
          </div>
        </div>

        {/* 图片列表 */}
        <div>
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

            {images.map((img) => (
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
                  onClick={() => handlePreview(img.base64WithHeader)}
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
                        onClick={() => handlePreview(img.base64WithHeader)}
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
        </div>
      </Space>

      {/* 图片预览 Modal */}
      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="80%"
        style={{ maxWidth: 800 }}
        centered
      >
        <img
          alt="preview"
          style={{ width: "100%", maxHeight: "80vh", objectFit: "contain" }}
          src={previewImage}
        />
      </Modal>
    </div>
  );
};

export default ImageBase64;
