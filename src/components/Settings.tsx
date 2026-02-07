import { useState, useEffect } from 'react';
import { Form, Input, Typography, Switch, Tag, App } from 'antd';
import { FolderOutlined, HistoryOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { nativeAPI } from '../services/nativeAPI';
import Block from '../lib/Block';

const { Text, Paragraph } = Typography;

const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [dataPath, setDataPath] = useState<string>('');
  const [displayPath, setDisplayPath] = useState<string>('');
  const [rememberLastTool, setRememberLastTool] = useState<boolean>(false);
  const { message } = App.useApp();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const path = await nativeAPI.config.getDataPath();
      const remember = await nativeAPI.config.getRememberLastTool();
      setDataPath(path || '');
      setDisplayPath(path || '');
      setRememberLastTool(remember);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveDataPath = async (path: string) => {
    if (!path) return;
    try {
      await nativeAPI.config.setDataPath(path);
      setDataPath(path);
      message.success('数据存储路径已保存');
    } catch (error: any) {
      console.error('Save data path error:', error);
      message.error(error?.message || '保存失败');
    }
  };

  const saveRememberLastTool = async (checked: boolean) => {
    try {
      await nativeAPI.config.setRememberLastTool(checked);
      message.success('偏好设置已保存');
    } catch (error: any) {
      console.error('Save preference error:', error);
      message.error(error?.message || '保存失败');
    }
  };

  const handleRememberLastToolChange = async (checked: boolean) => {
    setRememberLastTool(checked);
    await saveRememberLastTool(checked);
  };

  const handleBrowseFolder = async () => {
    try {
      const path = await nativeAPI.dialog.selectFolder();
      if (path) {
        setDisplayPath(path);
        await saveDataPath(path);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  return (
    <div style={{ padding: '8px 0', maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* 数据存储 */}
      <Block>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <FolderOutlined style={{ color: '#1677ff' }} />
          <Text strong>数据存储</Text>
          {dataPath && (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              已配置
            </Tag>
          )}
        </div>
        
        <Form form={form} layout="vertical" style={{ margin: 0 }}>
          <Form.Item label="数据存储路径" style={{ marginBottom: 8 }}>
            <Input.Search
              placeholder="请选择数据存储路径"
              readOnly
              value={displayPath}
              enterButton="浏览"
              onSearch={handleBrowseFolder}
            />
          </Form.Item>
        </Form>
        
        <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
          所有应用程序数据（包括任务跟进记录）都将存储在此目录下。请确保您有读写权限。
        </Paragraph>
      </Block>

      {/* 偏好设置 */}
      <Block>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <HistoryOutlined style={{ color: '#1677ff' }} />
          <Text strong>偏好设置</Text>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Text>记住上次打开的工具</Text>
            <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
              开启后，下次打开应用时会自动跳转到上次使用的工具
            </Paragraph>
          </div>
          <Switch
            checked={rememberLastTool}
            onChange={handleRememberLastToolChange}
            checkedChildren="开启"
            unCheckedChildren="关闭"
          />
        </div>
      </Block>
    </div>
  );
};

export default Settings;
