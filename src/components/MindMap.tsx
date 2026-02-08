/**
 * 思维导图工具
 * 使用 AntV G6 实现，支持保存到 JSON 文件
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Input, Modal, List, Space, Typography, message, Empty } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  FileAddOutlined,
  ExportOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import { Graph, treeToGraphData } from '@antv/g6';
import { nativeAPI } from '../services/nativeAPI';

const { Text } = Typography;

// 思维导图数据类型
interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
  style?: {
    fill?: string;
    stroke?: string;
  };
}

interface MindMapData {
  id: string;
  name: string;
  data: MindMapNode;
  createTime: number;
  updateTime: number;
}

interface MindMapIndex {
  maps: { id: string; name: string; updateTime: number }[];
}

// 默认思维导图数据
const defaultData: MindMapNode = {
  id: 'root',
  label: '中心主题',
  children: [],
};

// 生成唯一 ID
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // G6 Graph 类型
type G6Graph = {
  destroy: () => void;
  setSize: (width: number, height: number) => void;
  setData: (data: unknown) => void;
  render: () => Promise<void>;
  getData: () => unknown;
  addNodeData: (nodes: unknown[]) => void;
  addEdgeData: (edges: unknown[]) => void;
  updateNodeData: (nodes: unknown[]) => void;
  removeNodeData: (ids: string[]) => void;
  getNodeData: (id: string) => { id: string; label: string } | undefined;
  getChildrenData: (id: string) => Array<{ id: string }>;
  setElementState: (id: string, state: string) => void;
  on: (event: string, handler: (evt: { target: { id: string } }) => void) => void;
  off: () => void;
  layout: () => Promise<void>;
  getElementState: (id: string, state: string) => boolean;
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const MindMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<G6Graph | null>(null);
  const [graphReady, setGraphReady] = useState(false);

  // 思维导图列表
  const [mindMaps, setMindMaps] = useState<MindMapIndex['maps']>([]);
  const [currentMap, setCurrentMap] = useState<MindMapData | null>(null);

  // 当前选中的节点ID
  const selectedNodeRef = useRef<string>('root');

  // 状态条信息
  const [nodeCount, setNodeCount] = useState(0);
  const [fileSize, setFileSize] = useState(0);

  // 弹窗状态
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  // 索引文件路径
  const INDEX_FILE = 'index';
  const MAPS_PATH = 'mindmaps';

  // 加载索引文件
  const loadIndex = useCallback(async () => {
    try {
      const index = await nativeAPI.storage.load(MAPS_PATH, INDEX_FILE, { maps: [] }) as MindMapIndex;
      setMindMaps(index.maps || []);
    } catch (error) {
      console.error('加载索引失败:', error);
      setMindMaps([]);
    }
  }, []);

  // 保存索引文件
  const saveIndex = useCallback(async (maps: MindMapIndex['maps']) => {
    try {
      await nativeAPI.storage.save(MAPS_PATH, INDEX_FILE, { maps });
    } catch (error) {
      console.error('保存索引失败:', error);
    }
  }, []);

  // 初始化
  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

  // 初始化 G6 v5 图
  useEffect(() => {
    if (!containerRef.current || graphRef.current) return;

    const initGraph = async () => {
      const graph = new Graph({
        container: containerRef.current!,
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        data: { nodes: [], edges: [] },
        layout: {
          type: 'mindmap',
          direction: 'H',
          getHeight: () => 32,
          getWidth: (node: { label?: string }) => {
            const label = node.label || '';
            return Math.max(80, label.length * 14 + 24);
          },
          getVGap: () => 16,
          getHGap: () => 48,
        },
        node: {
          type: 'rect',
          style: {
            radius: 6,
            size: [120, 36],
            cursor: 'pointer',
            fill: (d: { id: string }) => d.id === 'root' ? '#1890ff' : '#f0f0f0',
            stroke: (d: { id: string }) => d.id === 'root' ? '#096dd9' : '#d9d9d9',
            lineWidth: 1,
            label: true,
            labelText: (d: { label?: string }) => d.label || '',
            labelFill: (d: { id: string }) => d.id === 'root' ? '#fff' : '#333',
            labelFontSize: 12,
            labelTextAlign: 'center',
            labelTextBaseline: 'middle',
            labelY: 18,
          },
          palette: null,
        },
        edge: {
          type: 'cubic-horizontal',
          style: {
            stroke: '#bfbfbf',
            lineWidth: 1.5,
          },
        },
        behaviors: ['drag-canvas', 'zoom-canvas', 'drag-node', 'click-select'],
        transforms: ['translate-canvas-to-center'],
        animation: false,
      }) as unknown as G6Graph;

      // 单击选中节点
      graph.on('node:click', (evt) => {
        const nodeId = evt.target.id;
        selectedNodeRef.current = nodeId;
        // 清除其他选中状态，只选中当前节点
        graph.setElementState(nodeId, 'selected');
      });

      // 双击编辑节点
      graph.on('node:dblclick', (evt) => {
        const nodeId = evt.target.id;
        const nodeData = graph.getNodeData(nodeId);
        if (!nodeData) return;

        const newLabel = window.prompt('编辑节点:', nodeData.label);
        if (newLabel !== null && newLabel.trim() !== '') {
          graph.updateNodeData([
            {
              id: nodeId,
              label: newLabel.trim(),
            },
          ]);
          graph.render();
        }
      });

      graphRef.current = graph;
      setGraphReady(true);
    };

    initGraph();

    return () => {
      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = null;
      }
    };
  }, []);

  // 窗口大小变化时调整画布
  useEffect(() => {
    const handleResize = () => {
      if (graphRef.current && containerRef.current) {
        graphRef.current.setSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 获取当前图数据
  const getGraphData = useCallback((): MindMapNode => {
    if (!graphRef.current) return defaultData;

    const graph = graphRef.current;
    const graphData = graph.getData() as { nodes?: Array<{ id: string; label?: string }>; edges?: Array<{ source: string; target: string }> };
    
    // 构建父子关系映射
    const childrenMap = new Map<string, string[]>();
    const nodeMap = new Map<string, string>();
    
    // 记录所有节点
    graphData.nodes?.forEach((node) => {
      nodeMap.set(node.id, node.label || '');
    });
    
    // 构建边关系
    graphData.edges?.forEach((edge) => {
      const children = childrenMap.get(edge.source) || [];
      children.push(edge.target);
      childrenMap.set(edge.source, children);
    });
    
    const buildTree = (nodeId: string): MindMapNode => {
      const label = nodeMap.get(nodeId) || '';
      const children = childrenMap.get(nodeId) || [];

      const result: MindMapNode = {
        id: nodeId,
        label,
      };

      if (children.length > 0) {
        result.children = children.map((childId) => buildTree(childId));
      }

      return result;
    };

    return buildTree('root');
  }, []);

  // 更新状态条信息
  const updateStatusBar = useCallback(() => {
    if (!graphRef.current || !currentMap) {
      setNodeCount(0);
      setFileSize(0);
      return;
    }

    const graph = graphRef.current;
    const data = graph.getData() as { nodes?: unknown[] };
    const count = data.nodes?.length || 0;
    setNodeCount(count);

    // 估算文件大小（JSON 字符串长度）
    const mapData = getGraphData();
    const jsonStr = JSON.stringify(mapData);
    setFileSize(new Blob([jsonStr]).size);
  }, [currentMap, getGraphData]);

  // 加载思维导图到画布
  const loadToGraph = useCallback(async (data: MindMapNode) => {
    if (!graphRef.current) return;

    const graph = graphRef.current;
    const g6Data = treeToGraphData(data);
    
    graph.setData(g6Data);
    await graph.render();
    updateStatusBar();
  }, [updateStatusBar]);

  // 创建新思维导图
  const handleCreate = useCallback(async () => {
    if (!newMapName.trim()) {
      message.warning('请输入思维导图名称');
      return;
    }

    const newMap: MindMapData = {
      id: generateId(),
      name: newMapName.trim(),
      data: JSON.parse(JSON.stringify(defaultData)),
      createTime: Date.now(),
      updateTime: Date.now(),
    };

    try {
      await nativeAPI.storage.save(MAPS_PATH, newMap.id, newMap);

      const newMaps = [...mindMaps, { id: newMap.id, name: newMap.name, updateTime: newMap.updateTime }];
      await saveIndex(newMaps);
      setMindMaps(newMaps);

      setCurrentMap(newMap);
      await loadToGraph(newMap.data);

      setNewMapName('');
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('创建失败:', error);
      message.error('创建失败');
    }
  }, [newMapName, mindMaps, saveIndex, loadToGraph]);

  // 加载思维导图
  const handleLoad = useCallback(async (mapId: string) => {
    try {
      const mapData = await nativeAPI.storage.load(MAPS_PATH, mapId, null) as MindMapData | null;
      if (mapData) {
        setCurrentMap(mapData);
        await loadToGraph(mapData.data);
        setIsListModalOpen(false);
      } else {
        message.error('思维导图不存在');
      }
    } catch (error) {
      console.error('加载失败:', error);
      message.error('加载失败');
    }
  }, [loadToGraph]);

  // 保存当前思维导图
  const handleSave = useCallback(async () => {
    if (!currentMap) {
      message.warning('请先创建或打开一个思维导图');
      return;
    }

    const data = getGraphData();
    const updatedMap: MindMapData = {
      ...currentMap,
      data,
      updateTime: Date.now(),
    };

    try {
      await nativeAPI.storage.save(MAPS_PATH, currentMap.id, updatedMap);

      const newMaps = mindMaps.map((m) =>
        m.id === currentMap.id ? { ...m, updateTime: updatedMap.updateTime } : m
      );
      await saveIndex(newMaps);
      setMindMaps(newMaps);
      setCurrentMap(updatedMap);

      message.success('保存成功');
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    }
  }, [currentMap, getGraphData, mindMaps, saveIndex]);

  // 删除思维导图
  const handleDelete = useCallback(async (mapId: string) => {
    try {
      await nativeAPI.storage.delete(MAPS_PATH, mapId);

      const newMaps = mindMaps.filter((m) => m.id !== mapId);
      await saveIndex(newMaps);
      setMindMaps(newMaps);

      if (currentMap?.id === mapId) {
        setCurrentMap(null);
        if (graphRef.current) {
          graphRef.current.setData({ nodes: [], edges: [] });
          await graphRef.current.render();
        }
      }

      message.success('删除成功');
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  }, [mindMaps, currentMap, saveIndex]);

  // 重命名思维导图
  const handleRename = useCallback(async () => {
    if (!selectedMapId || !renameValue.trim()) return;

    try {
      const mapData = await nativeAPI.storage.load(MAPS_PATH, selectedMapId, null) as MindMapData | null;
      if (mapData) {
        const updatedMap = { ...mapData, name: renameValue.trim(), updateTime: Date.now() };
        await nativeAPI.storage.save(MAPS_PATH, selectedMapId, updatedMap);

        const newMaps = mindMaps.map((m) =>
          m.id === selectedMapId ? { ...m, name: renameValue.trim(), updateTime: updatedMap.updateTime } : m
        );
        await saveIndex(newMaps);
        setMindMaps(newMaps);

        if (currentMap?.id === selectedMapId) {
          setCurrentMap(updatedMap);
        }

        message.success('重命名成功');
      }
    } catch (error) {
      console.error('重命名失败:', error);
      message.error('重命名失败');
    }

    setIsRenameModalOpen(false);
    setSelectedMapId(null);
    setRenameValue('');
  }, [selectedMapId, renameValue, mindMaps, saveIndex, currentMap]);

  // 添加子节点
  const handleAddChild = useCallback(() => {
    if (!graphRef.current) return;

    const graph = graphRef.current;
    const newNodeId = generateId();

    // 使用当前选中的节点作为父节点
    const parentId = selectedNodeRef.current || 'root';

    graph.addNodeData([
      {
        id: newNodeId,
        label: '新节点',
        style: {
          fill: '#f0f0f0',
          stroke: '#d9d9d9',
          label: true,
          labelText: '新节点',
          labelFill: '#333',
          labelFontSize: 12,
          labelTextAlign: 'center',
          labelTextBaseline: 'middle',
          labelY: 18,
        },
      },
    ]);

    graph.addEdgeData([
      {
        source: parentId,
        target: newNodeId,
      },
    ]);

    graph.render();
    graph.layout();
    updateStatusBar();
  }, [updateStatusBar]);

  // 导出为 JSON
  const handleExport = useCallback(() => {
    if (!currentMap) {
      message.warning('请先打开一个思维导图');
      return;
    }

    const data = getGraphData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentMap.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  }, [currentMap, getGraphData]);

  // 导入 JSON
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text) as MindMapNode;

        if (!data.id || !data.label) {
          message.error('无效的思维导图文件');
          return;
        }

        await loadToGraph(data);
      } catch (error) {
        console.error('导入失败:', error);
        message.error('导入失败，请检查文件格式');
      }
    };
    input.click();
  }, [loadToGraph]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 工具栏 */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e8e8e8',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Space wrap>
          <Button
            icon={<FileAddOutlined />}
            type="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            新建
          </Button>
          <Button icon={<FolderOpenOutlined />} onClick={() => setIsListModalOpen(true)}>
            打开
          </Button>
          <Button icon={<SaveOutlined />} onClick={handleSave} disabled={!currentMap}>
            保存
          </Button>
        </Space>

        <Space wrap>
          {currentMap && (
            <Text type="secondary" style={{ marginRight: 12 }}>
              当前: {currentMap.name}
            </Text>
          )}
          <Button icon={<PlusOutlined />} onClick={handleAddChild} disabled={!graphReady}>
            添加节点
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport} disabled={!currentMap}>
            导出
          </Button>
          <Button icon={<ImportOutlined />} onClick={handleImport}>
            导入
          </Button>
        </Space>
      </div>

      {/* 画布区域 */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          background: '#f5f5f5',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {!currentMap && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <Empty
              description="暂无思维导图，点击【新建】创建一个"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}
      </div>

      {/* 状态条 */}
      <div
        style={{
          padding: '6px 16px',
          background: '#f0f0f0',
          borderTop: '1px solid #d9d9d9',
          fontSize: 12,
          color: '#666',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>提示：拖拽画布移动，滚轮缩放，拖拽节点调整位置，双击节点编辑文本</span>
        {currentMap && (
          <span style={{ fontWeight: 500 }}>
            节点数: <strong>{nodeCount}</strong> | 文件大小: <strong>{formatFileSize(fileSize)}</strong>
          </span>
        )}
      </div>

      {/* 新建弹窗 */}
      <Modal
        title="新建思维导图"
        open={isCreateModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setIsCreateModalOpen(false);
          setNewMapName('');
        }}
      >
        <Input
          placeholder="请输入思维导图名称"
          value={newMapName}
          onChange={(e) => setNewMapName(e.target.value)}
          onPressEnter={handleCreate}
        />
      </Modal>

      {/* 列表弹窗 */}
      <Modal
        title="打开思维导图"
        open={isListModalOpen}
        onCancel={() => setIsListModalOpen(false)}
        footer={null}
        width={600}
      >
        <List
          dataSource={mindMaps.sort((a, b) => b.updateTime - a.updateTime)}
          locale={{ emptyText: '暂无思维导图' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="load"
                  type="link"
                  onClick={() => handleLoad(item.id)}
                >
                  打开
                </Button>,
                <Button
                  key="rename"
                  type="link"
                  onClick={() => {
                    setSelectedMapId(item.id);
                    setRenameValue(item.name);
                    setIsRenameModalOpen(true);
                  }}
                >
                  重命名
                </Button>,
                <Button
                  key="delete"
                  type="link"
                  danger
                  onClick={() => handleDelete(item.id)}
                >
                  删除
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={item.name}
                description={`更新时间: ${new Date(item.updateTime).toLocaleString()}`}
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* 重命名弹窗 */}
      <Modal
        title="重命名思维导图"
        open={isRenameModalOpen}
        onOk={handleRename}
        onCancel={() => {
          setIsRenameModalOpen(false);
          setSelectedMapId(null);
          setRenameValue('');
        }}
      >
        <Input
          placeholder="请输入新名称"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={handleRename}
        />
      </Modal>
    </div>
  );
};

export default MindMap;
