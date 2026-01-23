import { useState, useEffect, useRef } from 'react';
import { Layout, Input, Button, Tag, Space, Tooltip, Popover, message, Modal, Popconfirm } from 'antd';
import {
  TagOutlined,
  CheckOutlined,
  CloseOutlined,
  PictureOutlined,
  SendOutlined,
  DeleteOutlined,
  FilterOutlined,
  StarOutlined,
  StarFilled,
  ThunderboltOutlined,
  PlusOutlined,
  FolderOutlined,
  EditOutlined
} from '@ant-design/icons';
import workTrackerStorage, {
  type WorkProject,
  type WorkRecord,
  type Tag as TagType
} from '../services/workTrackerStorage';
import './WorkTracker.css';

const { Sider, Content } = Layout;

const WorkTracker = () => {
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'todo' | string>('all');
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('');

  // 新建/编辑项目
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<WorkProject | null>(null);
  const [projectName, setProjectName] = useState('');

  // 发送记录
  const [inputText, setInputText] = useState('');
  const [inputImages, setInputImages] = useState<string[]>([]);
  const [isTodo, setIsTodo] = useState(false);
  const [inputTags, setInputTags] = useState<string[]>([]);

  // 编辑记录标签
  const [editingRecordTags, setEditingRecordTags] = useState<{ [key: string]: string[] }>({});
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载数据
  useEffect(() => {
    loadTags();
    loadProjects();
  }, []);

  // 监听筛选变化
  useEffect(() => {
    loadProjects();
  }, [filter]);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTags = async () => {
    setTags(await workTrackerStorage.getTags());
  };

  const loadProjects = async () => {
    let filteredProjects = await workTrackerStorage.getProjects();
    if (filter === 'todo') {
      // 筛选有待办记录的项目
      filteredProjects = filteredProjects.filter(p => {
        if (!p || !p.id) return false;
        const projectRecords = workTrackerStorage.getProjectRecords(p.id);
        return projectRecords.then(records => records.some(r => r && r.isTodo && !r.isDone));
      });
      // 等待异步操作完成
      const promises = filteredProjects.map(async p => {
        if (!p || !p.id) return false;
        const projectRecords = await workTrackerStorage.getProjectRecords(p.id);
        return projectRecords.some(r => r && r.isTodo && !r.isDone);
      });
      const results = await Promise.all(promises);
      filteredProjects = filteredProjects.filter((_, i) => results[i]);
    } else if (filter !== 'all') {
      // 按标签筛选项目（筛选包含该标签记录的项目）
      filteredProjects = await workTrackerStorage.getProjectsByTag(filter);
    }
    setProjects(filteredProjects);
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
    // 如果删除的标签是当前筛选条件，重置为全部
    if (filter === id) {
      setFilter('all');
    }
    message.success('标签已删除');
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      message.warning('请输入跟进任务名称');
      return;
    }
    try {
      const newProject = await workTrackerStorage.addProject(projectName);
      setProjectModalVisible(false);
      setProjectName('');
      setEditingProject(null);
      await loadProjects();
      setSelectedProjectId(newProject.id);
      message.success('创建成功');
    } catch (error: any) {
      message.error(error.message);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !projectName.trim()) {
      return;
    }
    await workTrackerStorage.updateProject(editingProject.id, {
      name: projectName
    });
    setProjectModalVisible(false);
    setProjectName('');
    setEditingProject(null);
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

  const handleOpenCreateProject = () => {
    setEditingProject(null);
    setProjectName('');
    setProjectModalVisible(true);
  };

  const handleOpenEditProject = (project: WorkProject) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectModalVisible(true);
  };

  // 保存记录标签
  const handleSaveRecordTags = async (recordId: string) => {
    const tagIds = editingRecordTags[recordId] || [];
    await workTrackerStorage.updateRecord(recordId, { tags: tagIds });
    setEditingRecordTags(prev => {
      const { [recordId]: _, ...rest } = prev;
      return rest;
    });
    setEditingRecordId(null);
    await loadRecords(selectedProjectId!);
    message.success('标签已更新');
  };

  // 取消编辑记录标签
  const handleCancelRecordTags = (recordId: string) => {
    setEditingRecordTags(prev => {
      const { [recordId]: _, ...rest } = prev;
      return rest;
    });
    setEditingRecordId(null);
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
  const selectedProjectTags = selectedProject?.tags.map(tagId => tags.find(t => t.id === tagId)).filter(Boolean) as TagType[];

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

  const projectModalContent = (
    <div style={{ width: 400 }}>
      <Space style={{ width: '100%', flexDirection: 'column' }} size="middle">
        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>任务名称</label>
          <Input
            placeholder="输入跟进任务名称"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
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
            <div className="sidebar-header">
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>跟进任务</span>
                <Tooltip title="新建任务">
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={handleOpenCreateProject}
                  />
                </Tooltip>
              </Space>
            </div>

            <div className="filter-buttons">
              <Button
                type={filter === 'all' ? 'primary' : 'text'}
                icon={<FilterOutlined />}
                onClick={() => setFilter('all')}
                size="small"
              >
                全部
              </Button>
              <Button
                type={filter === 'todo' ? 'primary' : 'text'}
                icon={<ThunderboltOutlined />}
                onClick={() => setFilter('todo')}
                size="small"
              >
                待办
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="tag-filter">
                <div style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>标签筛选</div>
                <Space wrap style={{ padding: '0 12px', paddingBottom: 8 }}>
                  {tags.map(tag => (
                    <Tag
                      key={tag.id}
                      color={filter === tag.id ? tag.color : 'default'}
                      style={{ cursor: 'pointer', marginBottom: 4 }}
                      onClick={() => setFilter(filter === tag.id ? 'all' : tag.id)}
                    >
                      {tag.name}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`project-card ${selectedProjectId === project.id ? 'active' : ''}`}
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FolderOutlined style={{ color: '#1890ff' }} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div className="project-title">{project.name}</div>
                      </div>
                      <Tooltip title="编辑">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditProject(project);
                          }}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="确定删除这个跟进任务吗？"
                        onConfirm={() => {
                          handleDeleteProject(project.id);
                        }}
                      >
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          danger
                          size="small"
                        />
                      </Popconfirm>
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
                  {selectedProjectTags.map(tag => (
                    <Tag key={tag.id} color={tag.color}>
                      {tag.name}
                    </Tag>
                  ))}
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
                              icon={record.isDone ? <CheckOutlined /> : <CloseOutlined />}
                              style={{ padding: 0 }}
                              onClick={() => handleToggleTodo(record.id)}
                            />
                          </Tooltip>
                        </div>
                      )}
                      <div className={`message-text ${record.isTodo && record.isDone ? 'done' : ''}`}>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{record.content}</div>
                        {record.images && record.images.length > 0 && (
                          <div className="message-images">
                            {record.images.map((img, index) => (
                              <img key={index} src={img} alt="" />
                            ))}
                          </div>
                        )}
                        <div className="message-time">
                          {new Date(record.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <Tooltip title="删除">
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          danger
                          size="small"
                          onClick={() => handleDeleteRecord(record.id)}
                        />
                      </Tooltip>
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

      {/* 新建/编辑项目弹窗 */}
      <Modal
        title={editingProject ? '编辑跟进任务' : '新建跟进任务'}
        open={projectModalVisible}
        onOk={editingProject ? handleUpdateProject : handleCreateProject}
        onCancel={() => {
          setProjectModalVisible(false);
          setProjectName('');
          setProjectTags([]);
          setEditingProject(null);
        }}
        okText={editingProject ? '更新' : '创建'}
      >
        {projectModalContent}
      </Modal>
    </div>
  );
};

export default WorkTracker;
