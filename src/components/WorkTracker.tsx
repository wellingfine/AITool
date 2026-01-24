import { useState, useEffect, useRef } from 'react';
import { Layout, Input, Button, Tag, Space, Tooltip, Popover, message, Popconfirm, Select } from 'antd';
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
  SearchOutlined,
  FilterOutlined,
  DownOutlined,
  UpOutlined
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
  const [filteredRecords, setFilteredRecords] = useState<WorkRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('');

  // 搜索
  const [searchText, setSearchText] = useState('');

  // 消息搜索
  const [messageSearchText, setMessageSearchText] = useState('');
  const [messageFilterTags, setMessageFilterTags] = useState<string[]>([]);
  const [messageFilterDone, setMessageFilterDone] = useState<'all' | 'done' | 'undone'>('all');
  const [showMessageFilter, setShowMessageFilter] = useState(false);

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

  // 控制消息操作按钮显示（hover 或下拉打开时保持显示）
  const [hoveringRecordId, setHoveringRecordId] = useState<string | null>(null);
  const [tagSelectOpenId, setTagSelectOpenId] = useState<string | null>(null);

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
      setFilteredRecords([]);
    }
  }, [selectedProjectId]);

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [filteredRecords]);

  // 创建项目时聚焦输入框
  useEffect(() => {
    if (isCreatingProject && newProjectInputRef.current) {
      newProjectInputRef.current.focus();
    }
  }, [isCreatingProject]);

  // 过滤消息
  useEffect(() => {
    filterMessages();
  }, [records, messageSearchText, messageFilterTags, messageFilterDone]);

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

  // 过滤消息
  const filterMessages = () => {
    let filtered = [...records];
    
    // 按关键字过滤
    if (messageSearchText.trim()) {
      filtered = filtered.filter(r => 
        r.content.toLowerCase().includes(messageSearchText.toLowerCase())
      );
    }
    
    // 按标签过滤
    if (messageFilterTags.length > 0) {
      filtered = filtered.filter(r => 
        r.tags && r.tags.some(t => messageFilterTags.includes(t))
      );
    }
    
    // 按完成状态过滤
    if (messageFilterDone === 'done') {
      filtered = filtered.filter(r => r.isTodo && r.isDone);
    } else if (messageFilterDone === 'undone') {
      filtered = filtered.filter(r => r.isTodo && !r.isDone);
    }
    
    setFilteredRecords(filtered);
  };

  // 是否有筛选条件
  const hasFilter = messageSearchText.trim() || messageFilterTags.length > 0 || messageFilterDone !== 'all';

  const loadRecords = async (projectId: string) => {
    const recordList = await workTrackerStorage.getProjectRecords(projectId);
    setRecords(recordList);
    setFilteredRecords(recordList);
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

  // 更新记录标签
  const handleUpdateRecordTags = async (recordId: string, tagIds: string[]) => {
    await workTrackerStorage.updateRecord(recordId, { tags: tagIds });
    await loadRecords(selectedProjectId!);
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

  // 获取记录的主要标签颜色
  const getRecordTagColor = (record: WorkRecord): string | null => {
    if (!record.tags || record.tags.length === 0) return null;
    const tag = tags.find(t => t.id === record.tags[0]);
    return tag?.color || null;
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
                  <div className="project-card-inner">
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
                        <div className="project-title">{project.name}</div>
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
              ))}
            </div>
          </div>
        </Sider>

        {/* 右侧记录区域 */}
        <Content style={{ display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
          {selectedProject ? (
            <>
              {/* 顶部项目信息 - 点击展开筛选 */}
              <div 
                className={`chat-header ${hasFilter ? 'has-filter' : ''}`}
                onClick={() => setShowMessageFilter(!showMessageFilter)}
                style={{ cursor: 'pointer' }}
              >
                <Space>
                  <FolderOutlined style={{ color: '#1890ff' }} />
                  <span style={{ fontWeight: 600 }}>{selectedProject.name}</span>
                  {hasFilter && <FilterOutlined style={{ color: '#1890ff' }} />}
                  {showMessageFilter ? <UpOutlined style={{ fontSize: 10 }} /> : <DownOutlined style={{ fontSize: 10 }} />}
                </Space>
                <Space onClick={(e) => e.stopPropagation()}>
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

              {/* 消息筛选栏 - 折叠显示 */}
              {showMessageFilter && (
                <div className="message-search-bar">
                  <Input
                    placeholder="搜索消息..."
                    prefix={<SearchOutlined style={{ color: '#999' }} />}
                    value={messageSearchText}
                    onChange={(e) => setMessageSearchText(e.target.value)}
                    allowClear
                    style={{ width: 180 }}
                  />
                  <Select
                    mode="multiple"
                    placeholder="按标签筛选"
                    value={messageFilterTags}
                    onChange={setMessageFilterTags}
                    style={{ minWidth: 120 }}
                    allowClear
                    maxTagCount={1}
                    options={tags.map(tag => ({
                      value: tag.id,
                      label: (
                        <Space>
                          <span style={{ 
                            display: 'inline-block', 
                            width: 12, 
                            height: 12, 
                            borderRadius: 2, 
                            background: tag.color 
                          }} />
                          {tag.name}
                        </Space>
                      )
                    }))}
                  />
                  <Select
                    value={messageFilterDone}
                    onChange={setMessageFilterDone}
                    style={{ width: 90 }}
                    options={[
                      { value: 'all', label: '全部' },
                      { value: 'done', label: '已完成' },
                      { value: 'undone', label: '未完成' }
                    ]}
                  />
                </div>
              )}

              {/* 记录列表 */}
              <div className="chat-messages">
                {filteredRecords.map((record) => {
                  const tagColor = getRecordTagColor(record);
                  const showActions = hoveringRecordId === record.id || tagSelectOpenId === record.id;
                  return (
                    <div key={record.id} className="message-item">
                      <div 
                        className="message-content"
                        onMouseEnter={() => setHoveringRecordId(record.id)}
                        onMouseLeave={() => {
                          if (tagSelectOpenId !== record.id) {
                            setHoveringRecordId(null);
                          }
                        }}
                      >
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
                        <div 
                          className="message-text"
                          style={tagColor ? { 
                            borderLeft: `3px solid ${tagColor}`,
                            background: `linear-gradient(to right, ${tagColor}10, #fff 20%)`
                          } : undefined}
                        >
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
                              {/* 底部：时间 + 标签 + hover操作按钮 */}
                              <div className="message-footer">
                                <div className="message-time">
                                  {formatDate(record.createdAt)}
                                  {/* 显示标签 */}
                                  {record.tags && record.tags.length > 0 && (
                                    <span className="message-tags">
                                      {record.tags.map(tagId => {
                                        const tag = tags.find(t => t.id === tagId);
                                        return tag ? (
                                          <Tag key={tagId} color={tag.color} style={{ margin: 0 }}>
                                            {tag.name}
                                          </Tag>
                                        ) : null;
                                      })}
                                    </span>
                                  )}
                                </div>
                                {showActions && (
                                  <div className="message-actions show">
                                    <Select
                                      mode="multiple"
                                      placeholder="标签"
                                      value={record.tags || []}
                                      onChange={(values) => handleUpdateRecordTags(record.id, values)}
                                      style={{ width: 70 }}
                                      size="small"
                                      maxTagCount={0}
                                      maxTagPlaceholder={() => <TagOutlined />}
                                      options={tags.map(tag => ({
                                        value: tag.id,
                                        label: tag.name
                                      }))}
                                      onDropdownVisibleChange={(open) => {
                                        if (open) {
                                          setTagSelectOpenId(record.id);
                                        } else {
                                          setTagSelectOpenId(null);
                                          setHoveringRecordId(null);
                                        }
                                      }}
                                    />
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
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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

                {/* 工具栏和标签选择 */}
                <div className="input-toolbar">
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
                    图片
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />
                  <Select
                    mode="multiple"
                    placeholder="选择标签"
                    value={inputTags}
                    onChange={setInputTags}
                    style={{ minWidth: 120 }}
                    size="small"
                    maxTagCount={2}
                    options={tags.map(tag => ({
                      value: tag.id,
                      label: (
                        <Space>
                          <span style={{ 
                            display: 'inline-block', 
                            width: 10, 
                            height: 10, 
                            borderRadius: 2, 
                            background: tag.color 
                          }} />
                          {tag.name}
                        </Space>
                      )
                    }))}
                  />
                </div>

                {/* 输入框，发送按钮在里面 */}
                <div className="input-area-wrapper">
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
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    className="input-textarea"
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendRecord}
                    disabled={!inputText.trim() && inputImages.length === 0}
                    className="send-btn"
                  />
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
