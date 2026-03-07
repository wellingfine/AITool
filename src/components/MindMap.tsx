import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
} from "@xyflow/react";
import type { Node, Edge, NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Button,
  Segmented,
  Input,
  Tooltip,
  Popconfirm,
  message,
  theme,
  Modal,
  Dropdown,
} from "antd";
import type { InputRef } from "antd";
import type { MenuProps } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  FolderOpenOutlined,
  SaveOutlined,
  FileAddOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { nativeAPI } from "../services/nativeAPI";

// 布局类型
type LayoutType =
  | "right"
  | "left"
  | "down"
  | "up"
  | "horizontal"
  | "vertical"
  | "radial";

// 节点数据类型
interface MindMapNodeData {
  label: string;
  level: number;
  collapsed?: boolean;
  children?: string[];
  parentId?: string;
  [key: string]: unknown;
}

// 思维导图节点类型
type MindMapNode = Node<MindMapNodeData>;

// 渐变色主题
const gradientThemes = [
  {
    bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    border: "#667eea",
  },
  {
    bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    border: "#f093fb",
  },
  {
    bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    border: "#4facfe",
  },
  {
    bg: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    border: "#43e97b",
  },
  {
    bg: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    border: "#fa709a",
  },
  {
    bg: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    border: "#a8edea",
  },
];

// 获取节点样式
const getNodeStyle = (level: number) => {
  const themeIndex = level % gradientThemes.length;
  const theme = gradientThemes[themeIndex];

  const baseStyle: React.CSSProperties = {
    background: theme.bg,
    borderRadius: level === 0 ? 16 : 12,
    padding: level === 0 ? "12px 24px" : "8px 16px",
    fontSize: level === 0 ? 16 : 14,
    fontWeight: level === 0 ? 600 : 500,
    color: "#fff",
    border: `2px solid ${theme.border}`,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    cursor: "pointer",
    minWidth: level === 0 ? 120 : 80,
    textAlign: "center" as const,
    transition: "all 0.2s ease",
  };

  return baseStyle;
};

// 自定义节点组件
const MindMapNodeComponent: React.FC<NodeProps<MindMapNode>> = ({
  data,
  id,
  selected,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const inputRef = useRef<InputRef>(null);
  const level = data.level || 0;
  const nodeStyle = getNodeStyle(level);

  // 获取当前布局方向对应的 handle 位置
  const layoutDirection =
    (window as unknown as { __mindMapLayout?: LayoutType }).__mindMapLayout ||
    "right";

  const getHandlePositions = () => {
    switch (layoutDirection) {
      case "right":
        return { source: Position.Right, target: Position.Left };
      case "left":
        return { source: Position.Left, target: Position.Right };
      case "down":
        return { source: Position.Bottom, target: Position.Top };
      case "up":
        return { source: Position.Top, target: Position.Bottom };
      case "horizontal":
        return level === 0
          ? { source: Position.Right, target: Position.Left }
          : data.parentId && data.label.startsWith("L")
            ? { source: Position.Left, target: Position.Right }
            : { source: Position.Right, target: Position.Left };
      case "vertical":
        return level === 0
          ? { source: Position.Bottom, target: Position.Top }
          : { source: Position.Bottom, target: Position.Top };
      case "radial":
        return { source: Position.Right, target: Position.Left };
      default:
        return { source: Position.Right, target: Position.Left };
    }
  };

  const handlePositions = getHandlePositions();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(data.label);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== data.label) {
      const event = new CustomEvent("mindmap:updateNode", {
        detail: { id, label: editValue.trim() },
      });
      window.dispatchEvent(event);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(data.label);
    }
  };

  const hasChildren = data.children && data.children.length > 0;
  const isCollapsed = data.collapsed;

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    const event = new CustomEvent("mindmap:toggleCollapse", { detail: { id } });
    window.dispatchEvent(event);
  };

  return (
    <div
      style={{
        ...nodeStyle,
        outline: selected ? "3px solid #1890ff" : "none",
        outlineOffset: 2,
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* 所有方向的 Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ visibility: "hidden" }}
        id="left-target"
      />
      <Handle
        type="source"
        position={Position.Left}
        style={{ visibility: "hidden" }}
        id="left-source"
      />
      <Handle
        type="target"
        position={Position.Right}
        style={{ visibility: "hidden" }}
        id="right-target"
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ visibility: "hidden" }}
        id="right-source"
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{ visibility: "hidden" }}
        id="top-target"
      />
      <Handle
        type="source"
        position={Position.Top}
        style={{ visibility: "hidden" }}
        id="top-source"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        style={{ visibility: "hidden" }}
        id="bottom-target"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ visibility: "hidden" }}
        id="bottom-source"
      />

      {/* 主要 Handle（用于布局） */}
      <Handle
        type="target"
        position={handlePositions.target}
        style={{ background: "transparent", border: "none" }}
      />
      <Handle
        type="source"
        position={handlePositions.source}
        style={{ background: "transparent", border: "none" }}
      />

      {isEditing ? (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            background: "rgba(255,255,255,0.9)",
            border: "none",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: "inherit",
            textAlign: "center",
            color: "#333",
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span style={{ userSelect: "none" }}>{data.label}</span>
      )}

      {/* 折叠/展开按钮 - 根据布局方向动态调整位置 */}
      {hasChildren && (
        <div
          onClick={toggleCollapse}
          style={{
            position: "absolute",
            // 根据布局方向设置按钮位置
            ...(layoutDirection === "right" ||
            layoutDirection === "horizontal" ||
            layoutDirection === "radial"
              ? { right: -10, top: "50%", transform: "translateY(-50%)" }
              : layoutDirection === "left"
                ? { left: -10, top: "50%", transform: "translateY(-50%)" }
                : layoutDirection === "down" || layoutDirection === "vertical"
                  ? { bottom: -10, left: "50%", transform: "translateX(-50%)" }
                  : layoutDirection === "up"
                    ? { top: -10, left: "50%", transform: "translateX(-50%)" }
                    : {
                        right: -10,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }),
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            border: "2px solid #1890ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 12,
            color: "#1890ff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            zIndex: 10,
          }}
        >
          {isCollapsed ? "+" : "-"}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  mindmap: MindMapNodeComponent,
};

// 计算树形布局
const calculateLayout = (
  nodes: MindMapNode[],
  _edges: Edge[],
  layoutType: LayoutType,
  rootId: string,
): MindMapNode[] => {
  const nodeMap = new Map(
    nodes.map((n) => [n.id, { ...n, data: { ...n.data } }]),
  );

  // 从节点的 parentId 构建子节点映射（而不是从 edges）
  const childrenMap = new Map<string, string[]>();
  nodes.forEach((node) => {
    if (node.data.parentId) {
      const parentId = node.data.parentId;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(node.id);
    }
  });

  // 更新节点的 children 属性（在克隆的 nodeMap 上）
  nodeMap.forEach((node, nodeId) => {
    const children = childrenMap.get(nodeId) || [];
    node.data = { ...node.data, children };
  });

  // 计算子树高度
  const getSubtreeHeight = (
    nodeId: string,
    visitedNodes = new Set<string>(),
  ): number => {
    if (visitedNodes.has(nodeId)) return 0;
    visitedNodes.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node || node.data.collapsed) return 60;

    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return 60;

    return (
      children.reduce(
        (sum, childId) => sum + getSubtreeHeight(childId, visitedNodes),
        0,
      ) +
      (children.length - 1) * 20
    );
  };

  const positionedNodes: MindMapNode[] = [];
  const horizontalGap = 200;
  const verticalGap = 80;

  // 递归布局
  const layoutNode = (
    nodeId: string,
    x: number,
    y: number,
    direction: "right" | "left" | "down" | "up",
    visitedNodes = new Set<string>(),
  ): void => {
    if (visitedNodes.has(nodeId)) return;
    visitedNodes.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return;

    positionedNodes.push({
      ...node,
      position: { x, y },
    });

    if (node.data.collapsed) return;

    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;

    // 计算子节点总高度
    const totalHeight =
      children.reduce((sum, childId) => {
        return sum + getSubtreeHeight(childId, new Set(visitedNodes));
      }, 0) +
      (children.length - 1) * 20;

    let offset = -totalHeight / 2;

    children.forEach((childId) => {
      const childHeight = getSubtreeHeight(childId, new Set(visitedNodes));
      const childY = y + offset + childHeight / 2;
      const childX =
        direction === "right"
          ? x + horizontalGap
          : direction === "left"
            ? x - horizontalGap
            : x;
      const actualY =
        direction === "down"
          ? y + verticalGap
          : direction === "up"
            ? y - verticalGap
            : childY;
      const actualX =
        direction === "down" || direction === "up"
          ? x + offset + childHeight / 2
          : childX;

      layoutNode(
        childId,
        direction === "down" || direction === "up" ? actualX : childX,
        direction === "down" || direction === "up" ? actualY : childY,
        direction,
        visitedNodes,
      );
      offset += childHeight + 20;
    });
  };

  // 放射状布局
  const layoutRadial = (nodeId: string, centerX: number, centerY: number) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    positionedNodes.push({
      ...node,
      position: { x: centerX, y: centerY },
    });

    if (node.data.collapsed) return;

    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;

    const angleStep = (2 * Math.PI) / children.length;
    const radius = 200;

    children.forEach((childId, index) => {
      const angle = angleStep * index - Math.PI / 2;
      const childX = centerX + Math.cos(angle) * radius;
      const childY = centerY + Math.sin(angle) * radius;

      const childNode = nodeMap.get(childId);
      if (childNode) {
        positionedNodes.push({
          ...childNode,
          position: { x: childX, y: childY },
        });

        // 递归布局子节点的子节点
        if (!childNode.data.collapsed) {
          const grandChildren = childrenMap.get(childId) || [];
          const subRadius = 150;
          const subAngleRange = Math.PI / 3;
          const subAngleStep =
            grandChildren.length > 1
              ? subAngleRange / (grandChildren.length - 1)
              : 0;

          grandChildren.forEach((grandChildId, gcIndex) => {
            const subAngle = angle - subAngleRange / 2 + subAngleStep * gcIndex;
            const gcX = childX + Math.cos(subAngle) * subRadius;
            const gcY = childY + Math.sin(subAngle) * subRadius;

            const gcNode = nodeMap.get(grandChildId);
            if (gcNode) {
              positionedNodes.push({
                ...gcNode,
                position: { x: gcX, y: gcY },
              });
            }
          });
        }
      }
    });
  };

  // 双向布局
  const layoutBidirectional = (
    nodeId: string,
    x: number,
    y: number,
    isHorizontal: boolean,
  ) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    positionedNodes.push({
      ...node,
      position: { x, y },
    });

    if (node.data.collapsed) return;

    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;

    const halfIndex = Math.ceil(children.length / 2);
    const leftChildren = children.slice(0, halfIndex);
    const rightChildren = children.slice(halfIndex);

    // 左侧/上侧子节点
    let offset = -(leftChildren.length * 60) / 2;
    leftChildren.forEach((childId) => {
      if (isHorizontal) {
        layoutNode(childId, x - horizontalGap, y + offset, "left", new Set());
      } else {
        layoutNode(childId, x + offset, y - verticalGap, "up", new Set());
      }
      offset += 80;
    });

    // 右侧/下侧子节点
    offset = -(rightChildren.length * 60) / 2;
    rightChildren.forEach((childId) => {
      if (isHorizontal) {
        layoutNode(childId, x + horizontalGap, y + offset, "right", new Set());
      } else {
        layoutNode(childId, x + offset, y + verticalGap, "down", new Set());
      }
      offset += 80;
    });
  };

  // 根据布局类型执行布局
  switch (layoutType) {
    case "right":
      layoutNode(rootId, 100, 300, "right");
      break;
    case "left":
      layoutNode(rootId, 800, 300, "left");
      break;
    case "down":
      layoutNode(rootId, 400, 50, "down");
      break;
    case "up":
      layoutNode(rootId, 400, 550, "up");
      break;
    case "horizontal":
      layoutBidirectional(rootId, 450, 300, true);
      break;
    case "vertical":
      layoutBidirectional(rootId, 450, 300, false);
      break;
    case "radial":
      layoutRadial(rootId, 450, 300);
      break;
  }

  // 确保所有节点都被包含（包括折叠隐藏的节点）
  const positionedIds = new Set(positionedNodes.map((n) => n.id));
  nodeMap.forEach((node, nodeId) => {
    if (!positionedIds.has(nodeId)) {
      // 隐藏的节点保留原位置，但添加到结果中
      positionedNodes.push(node);
    }
  });

  return positionedNodes;
};

// 生成边
const generateEdges = (
  nodes: MindMapNode[],
  layoutType: LayoutType,
): Edge[] => {
  const edges: Edge[] = [];

  const getHandleIds = (isSource: boolean, layout: LayoutType) => {
    switch (layout) {
      case "right":
        return isSource ? "right-source" : "left-target";
      case "left":
        return isSource ? "left-source" : "right-target";
      case "down":
        return isSource ? "bottom-source" : "top-target";
      case "up":
        return isSource ? "top-source" : "bottom-target";
      case "horizontal":
      case "vertical":
      case "radial":
      default:
        return isSource ? "right-source" : "left-target";
    }
  };

  nodes.forEach((node) => {
    if (node.data.parentId) {
      edges.push({
        id: `e-${node.data.parentId}-${node.id}`,
        source: node.data.parentId,
        target: node.id,
        sourceHandle: getHandleIds(true, layoutType),
        targetHandle: getHandleIds(false, layoutType),
        type: "default",
        style: {
          stroke: "#94a3b8",
          strokeWidth: 2,
        },
        animated: false,
      });
    }
  });

  return edges;
};

// 初始节点数据
const initialNodesData: MindMapNode[] = [
  {
    id: "root",
    type: "mindmap",
    position: { x: 0, y: 0 },
    data: { label: "中心主题", level: 0, children: [] },
  },
];

// 思维导图数据接口
interface MindMapFileData {
  nodes: MindMapNode[];
  layoutType: LayoutType;
  version: string;
}

const MindMap: React.FC = () => {
  const { token } = theme.useToken();
  const [nodes, setNodes, onNodesChange] =
    useNodesState<MindMapNode>(initialNodesData);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [layoutType, setLayoutType] = useState<LayoutType>("right");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeIdCounter = useRef(1);

  // 文件状态
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [isModified, setIsModified] = useState(false);
  const [dataPath, setDataPath] = useState<string>("");

  // 获取数据目录
  useEffect(() => {
    nativeAPI.config.getDataPath().then((path) => {
      if (path) setDataPath(path);
    });
  }, []);

  // 存储布局类型到全局变量供节点组件使用
  useEffect(() => {
    (window as unknown as { __mindMapLayout?: LayoutType }).__mindMapLayout =
      layoutType;
  }, [layoutType]);

  // 标记已修改
  const markModified = useCallback(() => {
    setIsModified(true);
  }, []);

  // 打开文件
  const handleOpen = useCallback(async () => {
    try {
      const result = await nativeAPI.dialog.openFile(dataPath);
      if (!result) return;

      let fileData: MindMapFileData;

      // 如果返回的是文件路径（Tauri环境）
      if (typeof result === "string" && !result.startsWith("{")) {
        // 通过Tauri读取文件内容（使用绝对路径）
        const content = await nativeAPI.dialog.readFile(result);
        if (!content) {
          message.error("读取文件失败");
          return;
        }
        try {
          fileData = JSON.parse(content);
        } catch {
          message.error("文件格式错误");
          return;
        }
        setCurrentFilePath(result);
      } else {
        // 浏览器环境，返回的是文件内容
        fileData = JSON.parse(result as string);
        setCurrentFilePath(null);
      }

      if (fileData.nodes && Array.isArray(fileData.nodes)) {
        setNodes(fileData.nodes);
        if (fileData.layoutType) {
          setLayoutType(fileData.layoutType);
        }
        // 延迟重新生成连接线
        setTimeout(() => {
          const newEdges = generateEdges(
            fileData.nodes,
            fileData.layoutType || "right",
          );
          setEdges(newEdges);
        }, 0);
        setIsModified(false);
        message.success("文件打开成功");
      } else {
        message.error("无效的文件格式");
      }
    } catch (error) {
      console.error("打开文件失败:", error);
      message.error("打开文件失败");
    }
  }, [dataPath, setNodes, setEdges]);

  // 保存到指定路径
  const saveToPath = useCallback(
    async (filePath: string | null) => {
      try {
        const data: MindMapFileData = {
          nodes,
          layoutType,
          version: "1.0",
        };

        if (filePath) {
          // 保存到指定路径（使用绝对路径写入）
          const content = JSON.stringify(data, null, 2);
          const success = await nativeAPI.dialog.writeFile(filePath, content);
          if (!success) {
            message.error("保存失败");
            return false;
          }
        } else {
          // 浏览器环境，使用下载方式
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `mindmap_${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }

        setCurrentFilePath(filePath);
        setIsModified(false);
        return true;
      } catch (error) {
        console.error("保存失败:", error);
        message.error("保存失败");
        return false;
      }
    },
    [nodes, layoutType],
  );

  // 保存（智能判断）
  const handleSave = useCallback(async () => {
    if (currentFilePath) {
      // 已有文件路径，直接保存
      const success = await saveToPath(currentFilePath);
      if (success) message.success("保存成功");
    } else {
      // 新文件，弹出保存对话框，默认打开数据目录
      const result = await nativeAPI.dialog.saveFileDialog(
        dataPath,
        `mindmap_${Date.now()}.json`,
      );
      if (result) {
        const success = await saveToPath(result);
        if (success) message.success("保存成功");
      }
    }
  }, [currentFilePath, dataPath, saveToPath]);

  // 另存为
  const handleSaveAs = useCallback(async () => {
    const result = await nativeAPI.dialog.saveFileDialog(
      dataPath,
      `mindmap_${Date.now()}.json`,
    );
    if (result) {
      const success = await saveToPath(result);
      if (success) message.success("另存为成功");
    }
  }, [dataPath, saveToPath]);

  // 新建
  const handleNew = useCallback(() => {
    if (isModified) {
      Modal.confirm({
        title: "当前文件未保存",
        content: "是否保存当前文件？",
        onOk: async () => {
          await handleSave();
          resetToNew();
        },
        onCancel: () => {
          resetToNew();
        },
      });
    } else {
      resetToNew();
    }
  }, [isModified, handleSave]);

  const resetToNew = () => {
    setNodes(initialNodesData);
    setLayoutType("right");
    setCurrentFilePath(null);
    setIsModified(false);
    setSelectedNode(null);
    nodeIdCounter.current = 1;
    message.success("新建成功");
  };

  // 自动布局
  const applyLayout = useCallback(() => {
    const rootNode = nodes.find((n) => n.id === "root");
    if (!rootNode) return;

    const newEdges = generateEdges(nodes, layoutType);
    const positionedNodes = calculateLayout(
      nodes,
      newEdges,
      layoutType,
      "root",
    );

    setNodes(positionedNodes);
    setEdges(newEdges);
  }, [nodes, layoutType, setNodes, setEdges]);

  // 布局类型变化时重新布局
  useEffect(() => {
    applyLayout();
  }, [layoutType]);

  // 添加子节点
  const addChildNode = useCallback(() => {
    const parentId = selectedNode || "root";
    const parentNode = nodes.find((n) => n.id === parentId);
    if (!parentNode) return;

    const newNodeId = `node-${nodeIdCounter.current++}`;
    const newNode: MindMapNode = {
      id: newNodeId,
      type: "mindmap",
      position: { x: 0, y: 0 },
      data: {
        label: `节点 ${nodeIdCounter.current}`,
        level: (parentNode.data.level || 0) + 1,
        parentId,
        children: [],
      },
    };

    // 更新父节点的 children
    const updatedNodes = nodes.map((n) => {
      if (n.id === parentId) {
        return {
          ...n,
          data: {
            ...n.data,
            children: [...(n.data.children || []), newNodeId],
          },
        };
      }
      return n;
    });

    setNodes([...updatedNodes, newNode]);
    setIsModified(true);

    // 延迟应用布局
    setTimeout(() => {
      const allNodes = [...updatedNodes, newNode];
      const newEdges = generateEdges(allNodes, layoutType);
      const positionedNodes = calculateLayout(
        allNodes,
        newEdges,
        layoutType,
        "root",
      );
      setNodes(positionedNodes);
      setEdges(newEdges);
    }, 0);

    message.success("已添加子节点");
  }, [selectedNode, nodes, layoutType, setNodes, setEdges]);

  // 添加同级节点
  const addSiblingNode = useCallback(() => {
    if (!selectedNode || selectedNode === "root") {
      message.warning("请先选择一个非根节点");
      return;
    }

    const currentNode = nodes.find((n) => n.id === selectedNode);
    if (!currentNode || !currentNode.data.parentId) return;

    const parentId = currentNode.data.parentId;
    const newNodeId = `node-${nodeIdCounter.current++}`;
    const newNode: MindMapNode = {
      id: newNodeId,
      type: "mindmap",
      position: { x: 0, y: 0 },
      data: {
        label: `节点 ${nodeIdCounter.current}`,
        level: currentNode.data.level,
        parentId,
        children: [],
      },
    };

    // 更新父节点的 children
    const updatedNodes = nodes.map((n) => {
      if (n.id === parentId) {
        return {
          ...n,
          data: {
            ...n.data,
            children: [...(n.data.children || []), newNodeId],
          },
        };
      }
      return n;
    });

    setNodes([...updatedNodes, newNode]);
    setIsModified(true);

    // 延迟应用布局
    setTimeout(() => {
      const allNodes = [...updatedNodes, newNode];
      const newEdges = generateEdges(allNodes, layoutType);
      const positionedNodes = calculateLayout(
        allNodes,
        newEdges,
        layoutType,
        "root",
      );
      setNodes(positionedNodes);
      setEdges(newEdges);
    }, 0);

    message.success("已添加同级节点");
  }, [selectedNode, nodes, layoutType, setNodes, setEdges]);

  // 删除节点
  const deleteNode = useCallback(() => {
    if (!selectedNode || selectedNode === "root") {
      message.warning("无法删除根节点");
      return;
    }

    // 收集要删除的节点（包括所有子节点）
    const nodesToDelete = new Set<string>();
    const collectChildren = (nodeId: string) => {
      nodesToDelete.add(nodeId);
      const node = nodes.find((n) => n.id === nodeId);
      if (node?.data.children) {
        node.data.children.forEach((childId) => collectChildren(childId));
      }
    };
    collectChildren(selectedNode);

    // 从父节点的 children 中移除
    const currentNode = nodes.find((n) => n.id === selectedNode);
    const parentId = currentNode?.data.parentId;

    const filteredNodes = nodes
      .filter((n) => !nodesToDelete.has(n.id))
      .map((n) => {
        if (n.id === parentId) {
          return {
            ...n,
            data: {
              ...n.data,
              children: (n.data.children || []).filter(
                (id) => !nodesToDelete.has(id),
              ),
            },
          };
        }
        return n;
      });

    setNodes(filteredNodes);
    setSelectedNode(null);
    setIsModified(true);

    // 延迟应用布局
    setTimeout(() => {
      const newEdges = generateEdges(filteredNodes, layoutType);
      const positionedNodes = calculateLayout(
        filteredNodes,
        newEdges,
        layoutType,
        "root",
      );
      setNodes(positionedNodes);
      setEdges(newEdges);
    }, 0);

    message.success("已删除节点");
  }, [selectedNode, nodes, layoutType, setNodes, setEdges]);

  // 监听节点更新事件
  useEffect(() => {
    const handleUpdateNode = (
      e: CustomEvent<{ id: string; label: string }>,
    ) => {
      const { id, label } = e.detail;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id) {
            return { ...n, data: { ...n.data, label } };
          }
          return n;
        }),
      );
      setIsModified(true);
    };

    const handleToggleCollapse = (e: CustomEvent<{ id: string }>) => {
      const { id } = e.detail;
      setNodes((nds) => {
        const updated = nds.map((n) => {
          if (n.id === id) {
            return { ...n, data: { ...n.data, collapsed: !n.data.collapsed } };
          }
          return n;
        });

        // 同步重新布局（避免闭包问题）
        const newEdges = generateEdges(updated, layoutType);
        const positionedNodes = calculateLayout(
          updated,
          newEdges,
          layoutType,
          "root",
        );
        setEdges(newEdges);
        return positionedNodes;
      });
    };

    window.addEventListener(
      "mindmap:updateNode",
      handleUpdateNode as EventListener,
    );
    window.addEventListener(
      "mindmap:toggleCollapse",
      handleToggleCollapse as EventListener,
    );

    return () => {
      window.removeEventListener(
        "mindmap:updateNode",
        handleUpdateNode as EventListener,
      );
      window.removeEventListener(
        "mindmap:toggleCollapse",
        handleToggleCollapse as EventListener,
      );
    };
  }, [layoutType, setNodes, setEdges]);

  // 节点选择
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  // 面板点击取消选择
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // 过滤隐藏的节点和边（折叠时）
  const visibleNodes = useMemo(() => {
    const hiddenNodeIds = new Set<string>();

    const collectHiddenChildren = (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node?.data.children) {
        node.data.children.forEach((childId) => {
          hiddenNodeIds.add(childId);
          collectHiddenChildren(childId);
        });
      }
    };

    nodes.forEach((node) => {
      if (node.data.collapsed) {
        collectHiddenChildren(node.id);
      }
    });

    return nodes.filter((n) => !hiddenNodeIds.has(n.id));
  }, [nodes]);

  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
    return edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target),
    );
  }, [visibleNodes, edges]);

  const layoutOptions = [
    { label: "向右", value: "right" },
    { label: "向左", value: "left" },
    { label: "向下", value: "down" },
    { label: "向上", value: "up" },
    { label: "左右", value: "horizontal" },
    { label: "上下", value: "vertical" },
    { label: "放射", value: "radial" },
  ];

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: token.colorBgContainer,
      }}
    >
      {/* 工具栏 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 16px",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${token.colorBorder}`,
          background: token.colorBgElevated,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* 文件操作下拉菜单 */}
          <Dropdown
            menu={{
              items: [
                {
                  key: "new",
                  label: "新建",
                  icon: <FileAddOutlined />,
                  onClick: handleNew,
                },
                {
                  key: "open",
                  label: "打开",
                  icon: <FolderOpenOutlined />,
                  onClick: handleOpen,
                },
                {
                  type: "divider",
                },
                {
                  key: "save",
                  label: (
                    <span>
                      保存
                      {isModified && (
                        <span style={{ color: "#ff4d4f", marginLeft: 4 }}>
                          *
                        </span>
                      )}
                    </span>
                  ),
                  icon: <SaveOutlined />,
                  onClick: handleSave,
                },
                {
                  key: "saveAs",
                  label: "另存为",
                  onClick: handleSaveAs,
                },
              ] as MenuProps["items"],
            }}
          >
            <Button>
              文件 <DownOutlined />
            </Button>
          </Dropdown>

          <div
            style={{
              width: 1,
              height: 24,
              background: token.colorBorder,
              margin: "0 8px",
            }}
          />

          {/* 节点操作 */}
          <Tooltip title="添加子节点">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={addChildNode}
            >
              子节点
            </Button>
          </Tooltip>
          <Tooltip title="添加同级节点">
            <Button
              icon={<PlusCircleOutlined />}
              onClick={addSiblingNode}
              disabled={!selectedNode || selectedNode === "root"}
            >
              同级
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定删除该节点及其所有子节点吗？"
            onConfirm={deleteNode}
            okText="确定"
            cancelText="取消"
            disabled={!selectedNode || selectedNode === "root"}
          >
            <Tooltip title="删除节点">
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={!selectedNode || selectedNode === "root"}
              >
                删除
              </Button>
            </Tooltip>
          </Popconfirm>
        </div>

        {/* 布局选择 */}
        <Segmented
          value={layoutType}
          onChange={(v) => setLayoutType(v as LayoutType)}
          options={layoutOptions}
        />
      </div>

      {/* 画布 - 占满剩余空间 */}
      <div style={{ flex: 1, position: "relative" }}>
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnDoubleClick={false}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color={token.colorBorder} gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => {
              const level = (node.data as MindMapNodeData)?.level || 0;
              return gradientThemes[level % gradientThemes.length].border;
            }}
            maskColor="rgba(0,0,0,0.1)"
          />
        </ReactFlow>
      </div>

      {/* 底部状态栏 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 16px",
          background: token.colorFillAlter,
          fontSize: 12,
          color: token.colorTextSecondary,
          borderTop: `1px solid ${token.colorBorder}`,
        }}
      >
        <span>
          <strong>使用说明：</strong>
          点击节点选中 | 双击编辑文字 | 点击 +/- 折叠/展开 | 滚轮缩放 |
          拖动画布平移
        </span>
        <span style={{ fontWeight: 500, color: token.colorText }}>
          {currentFilePath ? currentFilePath.split(/[\\/]/).pop() : "未命名"}
          {isModified && " *"} | 节点数量: {nodes.length}
        </span>
      </div>
    </div>
  );
};

export default MindMap;
