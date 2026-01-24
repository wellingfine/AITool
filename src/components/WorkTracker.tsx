import { useState, useEffect, useRef } from 'react';
import { Layout, Input, Button, Tag, Space, Tooltip, Popover, message, Popconfirm } from 'antd';
import {
  TagOutlined,
  CheckOutlined,
  CloseOutlined,
  PictureOutlined,
  SendOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  PlusOutlined,
  FolderOutlined,
  EditOutlined,
  SearchOutlined
} from '@ant-design/icons';
import workTrackerStorage, {
  type WorkProject,
  type WorkRecord,
  type Tag as TagType
} from '../services/workTrackerStorage';
import './WorkTracker.css';

const { Sider, Content } = Layout;

// 格式化日期为 yyyy-mm-dd HH:MM:SS
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const WorkTracker = () => {
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [allProjects, setAllProjects] = useState<WorkProject[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('');

  // 搜索
  const [searchText, setSearchText] = useState('');

  // 新建/编辑项目（原地编辑）
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  // 发送记录
  const [inputText, setInputText] = useState('');
  const [inputImages, setInputImages] = useState<string[]>([]);
  const [isTodo, setIsTodo] = useState(false);
  const [inputTags, setInputTags] = useState<string[]>([]);

  // 编辑记录
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingRecordContent, setEditingRecordContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const newProjectInputRef = useRef<HTMLInputElement>(null);

  // 加载数据
  useEffect(() => {
    loadTags();
    loadProjects();
  }, []);

  // 监听选中项目变化
  useEffect(() => {
    if (selectedProjectId) {
      loadRecords(selectedProjectId);
    } else {
      setRecords([]);
    }
  }, [selectedProjectId]);

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [records]);

  // 创建项目时聚焦输入框
  useEffect(() => {
    if (isCreatingProject && newProjectInputRef.current) {
      newProjectInputRef.current.focus();
    }
  }, [isCreatingProject]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTags = async () => {
    setTags(await workTrackerStorage.getTags());
  };

  const loadProjects = async () => {
    const projectList = await workTrackerStorage.getProjects();
    setAllProjects(projectList);
    setProjects(projectList);
  };

  // 搜索过滤
  const handleSearch = () => {
    if (!searchText.trim()) {
      setProjects(allProjects);
    } else {
      const filtered = allProjects.filter(p => 
        p.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setProjects(filtered);
    }
  };

  const loadRecords = async (projectId: string) => {
    setRecords(await workTrackerStorage.getProjectRecords(projectId));
  };

  const handleSendRecord = async () => {
    if (!inputText.trim() && inputImages.length === 0) {
      message.warning('请输入内容或添加图片');
      return;
    }

    if (!selectedProjectId) {
      message.warning('请先选择一个跟进任务');
      return;
    }

    await workTrackerStorage.addRecord(selectedProjectId, inputText, inputImages, isTodo, inputTags);
    message.success('已发送');

    await loadRecords(selectedProjectId);
    await loadProjects();

    setInputText('');
    setInputImages([]);
    setIsTodo(false);
    setInputTags([]);
  };

  const handleDeleteRecord = async (id: string) => {
    await workTrackerStorage.deleteRecord(id);
    if (selectedProjectId) {
      await loadRecords(selectedProjectId);
    }
    await loadProjects();
    message.success('已删除');
  };

  const handleToggleTodo = async (id: string) => {
    const record = records.find(r => r.id === id);
    if (record) {
      await workTrackerStorage.updateRecord(id, { isDone: !record.isDone });
      await loadRecords(selectedProjectId!);
      await loadProjects();
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      message.warning('请输入标签名称');
      return;
    }
    if (!newTagColor) {
      message.warning('请选择标签颜色');
      return;
    }
    try {
      await workTrackerStorage.addTag(newTagName, newTagColor);
      setNewTagName('');
      setNewTagColor('');
      await loadTags();
      message.success('标签已添加');
    } catch (error: any) {
      message.error(error.message);
    }
  };

  const handleDeleteTag = async (id: string) => {
    await workTrackerStorage.deleteTag(id);
    await loadTags();
    await loadProjects();
    message.success('标签已删除');
  };

  // 创建项目（原地编辑）
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setIsCreatingProject(false);
      return;
    }
    try {
      const newProject = await workTrackerStorage.addProject(newProjectName);
      setIsCreatingProject(false);
      setNewProjectName('');
      await loadProjects();
      setSelectedProjectId(newProject.id);
      message.success('创建成功');
    } catch (error: any) {
      message.error(error.message);
    }
  };

  // 更新项目名称（原地编辑）
  const handleUpdateProject = async (projectId: string) => {
    if (!editingProjectName.trim()) {
      setEditingProjectId(null);
      return;
    }
    await workTrackerStorage.updateProject(projectId, { name: editingProjectName });
    setEditingProjectId(null);
    setEditingProjectName('');
    await loadProjects();
    message.success('更新成功');
  };

  const handleDeleteProject = async (id: string) => {
    await workTrackerStorage.deleteProject(id);
    if (selectedProjectId === id) {
      setSelectedProjectId(null);
      setRecords([]);
    }
    await loadProjects();
    message.success('已删除');
  };

  // 编辑记录
  const handleStartEditRecord = (record: WorkRecord) => {
    setEditingRecordId(record.id);
    setEditingRecordContent(record.content);
  };

  const handleSaveEditRecord = async () => {
    if (!editingRecordId) return;
    await workTrackerStorage.updateRecord(editingRecordId, { content: editingRecordContent });
    setEditingRecordId(null);
    setEditingRecordContent('');
    await loadRecords(selectedProjectId!);
    message.success('已更新');
  };

  const handleCancelEditRecord = () => {
    setEditingRecordId(null);
    setEditingRecordContent('');
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              setInputImages(prev => [...prev, e.target?.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setInputImages(prev => [...prev, e.target?.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setInputImages(prev => prev.filter((_, i) => i !== index));
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const tagModalContent = (
    <div style={{ width: 400 }}>
      <Space style={{ width: '100%', flexDirection: 'column' }} size="large">
        <div>
          <h3 style={{ marginBottom: 16 }}>添加标签</h3>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="标签名称"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 4, padding: '4px 8px', background: '#f0f0f0' }}>
              {workTrackerStorage.getTagColors().map(color => (
                <div
                  key={color}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: color,
                    cursor: 'pointer',
                    border: newTagColor === color ? '2px solid #1890ff' : 'none'
                  }}
                  onClick={() => setNewTagColor(color)}
                />
              ))}
            </div>
          </Space.Compact>
          <Button type="primary" block onClick={handleAddTag} style={{ marginTop: 8 }}>
            添加
          </Button>
        </div>

        <div>
          <h3 style={{ marginBottom: 16 }}>已有标签</h3>
          {tags.map((tag) => (
            <div
              key={tag.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <Space>
                <div style={{ width: 20, height: 20, borderRadius: 4, background: tag.color }} />
                <span>{tag.name}</span>
              </Space>
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                onClick={() => handleDeleteTag(tag.id)}
              />
            </div>
          ))}
        </div>
      </Space>
    </div>
  );

  return (
    <div className="work-tracker">
      <Layout style={{ height: 'calc(100vh - 64px)' }}>
        {/* 左侧项目列表 */}
        <Sider width={300} theme="light" style={{ borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
          <div className="tracker-sidebar">
            {/* 搜索栏 + 创建按钮 */}
            <div className="sidebar-header">
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  placeholder="搜索任务..."
                  prefix={<SearchOutlined style={{ color: '#999' }} />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onPressEnter={handleSearch}
                  allowClear
                  onClear={() => {
                    setSearchText('');
                    setProjects(allProjects);
                  }}
                />
                <Tooltip title="新建任务">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsCreatingProject(true)}
                  />
                </Tooltip>
              </div>
            </div>

            {/* 项目列表 */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* 新建项目输入框 */}
              {isCreatingProject && (
                <div className="project-card creating">
                  <Input
                    ref={newProjectInputRef}
                    placeholder="输入任务名称，回车创建"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onPressEnter={handleCreateProject}
                    onBlur={handleCreateProject}
                    size="small"
                  />
                </div>
              )}
              
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`project-card ${selectedProjectId === project.id ? 'active' : ''}`}
                  onClick={() => {
                    if (editingProjectId !== project.id) {
                      setSelectedProjectId(project.id);
                    }
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FolderOutlined style={{ color: '#1890ff', flexShrink: 0 }} />
                      {editingProjectId === project.id ? (
                        <Input
                          value={editingProjectName}
                          onChange={(e) => setEditingProjectName(e.target.value)}
                          onPressEnter={() => handleUpdateProject(project.id)}
                          onBlur={() => handleUpdateProject(project.id)}
                          size="small"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div className="project-title">{project.name}</div>
                          </div>
                          <div className="project-actions">
                            <Tooltip title="编辑">
                              <Button
                                type="text"
                                icon={<EditOutlined />}
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProjectId(project.id);
                                  setEditingProjectName(project.name);
                                }}
                              />
                            </Tooltip>
                            <Popconfirm
                              title="确定删除这个跟进任务吗？"
                              onConfirm={(e) => {
                                e?.stopPropagation();
                                handleDeleteProject(project.id);
                              }}
                              onCancel={(e) => e?.stopPropagation()}
                            >
                              <Button
                                type="text"
                                icon={<DeleteOutlined />}
                                danger
                                size="small"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </Popconfirm>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Sider>

        {/* 右侧记录区域 */}
        <Content style={{ display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
          {selectedProject ? (
            <>
              {/* 顶部项目信息 */}
              <div className="chat-header">
                <Space>
                  <FolderOutlined style={{ color: '#1890ff' }} />
                  <span style={{ fontWeight: 600 }}>{selectedProject.name}</span>
                </Space>
                <Space>
                  <Tooltip title="标签管理">
                    <Popover
                      content={tagModalContent}
                      title="标签管理"
                      trigger="click"
                      open={tagModalVisible}
                      onOpenChange={setTagModalVisible}
                    >
                      <Button type="text" icon={<TagOutlined />} />
                    </Popover>
                  </Tooltip>
                </Space>
              </div>

              {/* 记录列表 */}
              <div className="chat-messages">
                {records.map((record) => (
                  <div key={record.id} className="message-item">
                    <div className="message-content">
                      {record.isTodo && (
                        <div className="message-todo">
                          <Tooltip title={record.isDone ? '标记为未完成' : '标记为完成'}>
                            <Button
                              type="text"
                              icon={record.isDone ? <CheckOutlined style={{ color: '#52c41a' }} /> : <span className="todo-circle" />}
                              style={{ padding: 0 }}
                              onClick={() => handleToggleTodo(record.id)}
                            />
                          </Tooltip>
                        </div>
                      )}
                      <div className={`message-text ${record.isTodo && record.isDone ? 'done' : ''}`}>
                        {editingRecordId === record.id ? (
                          <div>
                            <Input.TextArea
                              value={editingRecordContent}
                              onChange={(e) => setEditingRecordContent(e.target.value)}
                              autoSize={{ minRows: 2, maxRows: 6 }}
                              autoFocus
                            />
                            <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <Button size="small" onClick={handleCancelEditRecord}>取消</Button>
                              <Button size="small" type="primary" onClick={handleSaveEditRecord}>保存</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{record.content}</div>
                            {record.images && record.images.length > 0 && (
                              <div className="message-images">
                                {record.images.map((img, index) => (
                                  <img key={index} src={img} alt="" />
                                ))}
                              </div>
                            )}
                            <div className="message-time">
                              {formatDate(record.createdAt)}
                            </div>
                          </>
                        )}
                      </div>
                      {editingRecordId !== record.id && (
                        <div className="message-actions">
                          <Tooltip title="编辑">
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              size="small"
                              onClick={() => handleStartEditRecord(record)}
                            />
                          </Tooltip>
                          <Popconfirm
                            title="确定删除这条记录吗？"
                            onConfirm={() => handleDeleteRecord(record.id)}
                          >
                            <Tooltip title="删除">
                              <Button
                                type="text"
                                icon={<DeleteOutlined />}
                                danger
                                size="small"
                              />
                            </Tooltip>
                          </Popconfirm>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* 底部输入区域 */}
              <div className="chat-input">
                {/* 图片预览 */}
                {inputImages.length > 0 && (
                  <div className="input-image-preview">
                    {inputImages.map((img, index) => (
                      <div key={index} className="preview-image-item">
                        <img src={img} alt="" />
                        <Button
                          type="text"
                          icon={<CloseOutlined />}
                          className="remove-btn"
                          onClick={() => handleRemoveImage(index)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="input-toolbar">
                  <Space>
                    <Button
                      type={isTodo ? 'primary' : 'default'}
                      icon={isTodo ? <StarFilled /> : <StarOutlined />}
                      onClick={() => setIsTodo(!isTodo)}
                      size="small"
                    >
                      {isTodo ? '待办' : '标记为待办'}
                    </Button>
                    <Button
                      icon={<PictureOutlined />}
                      onClick={() => fileInputRef.current?.click()}
                      size="small"
                    >
                      添加图片
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleImageUpload}
                    />
                  </Space>
                </div>

                <div className="input-area">
                  <Input.TextArea
                    placeholder="输入内容...（可粘贴图片）"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onPaste={handlePaste}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSendRecord();
                      }
                    }}
                    autoSize={{ minRows: 3, maxRows: 8 }}
                    style={{ border: 'none', resize: 'none', fontSize: 14 }}
                  />
                </div>

                <div className="input-footer">
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendRecord}
                    disabled={!inputText.trim() && inputImages.length === 0}
                  >
                    发送
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <FolderOutlined style={{ fontSize: 64, color: '#ccc' }} />
              <p>选择或创建一个跟进任务</p>
            </div>
          )}
        </Content>
      </Layout>
    </div>
  );
};

export default WorkTracker;
