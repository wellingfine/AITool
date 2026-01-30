import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, Space, Empty, App } from 'antd';
import { FolderOutlined, SaveOutlined } from '@ant-design/icons';
import { nativeAPI } from '../services/nativeAPI';

const { Text, Paragraph } = Typography;

const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [dataPath, setDataPath] = useState<string>('');
  const [displayPath, setDisplayPath] = useState<string>('');
  const { message } = App.useApp();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const path = await nativeAPI.config.getDataPath();
      setDataPath(path || '');
      setDisplayPath(path || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const path = displayPath || dataPath;
      if (!path) {
        message.warning('请选择数据存储路径');
        return;
      }
      await nativeAPI.config.setDataPath(path);
      setDataPath(path);
      message.success('设置已保存');
    } catch (error: any) {
      console.error('Save settings error:', error);
      message.error(error?.message || '保存失败');
    }
  };

  const handleBrowseFolder = async () => {
    try {
      const path = await nativeAPI.dialog.selectFolder();
      if (path) {
        setDisplayPath(path);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Card
          title={
            <Space>
              <FolderOutlined />
              <span>数据存储</span>
            </Space>
          }
        >
          <Form
            form={form}
            layout="vertical"
          >
            <Form.Item
              label="数据存储路径"
            >
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="请选择数据存储路径"
                  readOnly
                  value={displayPath}
                  onChange={(e) => setDisplayPath(e.target.value)}
                  style={{ width: '100%' }}
                />
                <Button
                  type="primary"
                  size="small"
                  onClick={handleBrowseFolder}
                >
                  浏览...
                </Button>
              </Space.Compact>
            </Form.Item>
            <Form.Item>
              <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
                所有应用程序数据（包括任务跟进记录）都将存储在此目录下。请确保您有读写权限。
              </Paragraph>
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveSettings}
              >
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {!dataPath && (
          <Card>
            <Empty
              description="尚未配置数据存储路径"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        )}

        {dataPath && (
          <Card title="当前配置">
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">数据存储路径：</Text>
                <Text code>{dataPath}</Text>
              </div>
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default Settings;
