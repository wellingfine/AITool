import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Typography,
  Empty,
  Modal,
  Form,
  Input,
  DatePicker,
  Tag,
  message,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import Block from '../lib/Block';
import Page from '../lib/Page';
import { dayCountdownStorage, type CountdownEvent } from '../services/dayCountdownStorage';

const { Title, Text } = Typography;

const DayCountdown: React.FC = () => {
  const [events, setEvents] = useState<CountdownEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CountdownEvent | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [form] = Form.useForm();

  // 加载数据
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dayCountdownStorage.getEvents();
      setEvents(data);
    } catch (error) {
      console.error('加载倒计时事件失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // 打开新增对话框
  const handleAdd = () => {
    setEditingEvent(null);
    form.resetFields();
    const defaultColor = colorOptions[4];
    form.setFieldsValue({ color: defaultColor });
    setSelectedColor(defaultColor);
    setIsModalOpen(true);
  };

  // 打开编辑对话框
  const handleCardClick = (event: CountdownEvent) => {
    setEditingEvent(event);
    form.setFieldsValue({
      title: event.title,
      targetDate: dayjs(event.targetDate),
      color: event.color
    });
    setSelectedColor(event.color);
    setIsModalOpen(true);
  };



  // 删除事件
  const handleDelete = async () => {
    if (!editingEvent) return;
    try {
      await dayCountdownStorage.deleteEvent(editingEvent.id);
      message.success('删除成功');
      setIsDeleteModalOpen(false);
      setIsModalOpen(false);
      loadEvents();
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // 保存事件
  const handleSave = async (values: { title: string; targetDate: dayjs.Dayjs; color: string }) => {
    try {
      const targetDateStr = values.targetDate.format('YYYY-MM-DD');
      if (editingEvent) {
        await dayCountdownStorage.updateEvent(editingEvent.id, {
          title: values.title,
          targetDate: targetDateStr,
          color: values.color
        });
        message.success('更新成功');
      } else {
        await dayCountdownStorage.addEvent(values.title, targetDateStr, values.color);
        message.success('添加成功');
      }
      setIsModalOpen(false);
      loadEvents();
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    }
  };

  // 颜色选择变化
  const handleColorSelect = (color: string) => {
    form.setFieldValue('color', color);
    setSelectedColor(color);
  };

  // 计算剩余天数
  const getDaysLeft = (targetDate: string): number => {
    return dayCountdownStorage.calculateDaysLeft(targetDate);
  };

  // 格式化日期显示
  const formatDate = (dateStr: string): string => {
    return dayjs(dateStr).format('YYYY年MM月DD日');
  };

  // 获取星期几
  const getWeekday = (dateStr: string): string => {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[dayjs(dateStr).day()];
  };

  // 颜色选项
  const colorOptions = dayCountdownStorage.getColors();

  return (
    <Page maxWidth={800}>
      {/* 标题和操作按钮 */}
      <Block>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              天倒计时
            </Title>
            <Text type="secondary">记录重要日子，倒计时提醒</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增倒计时
          </Button>
        </div>
      </Block>

      {/* 事件列表 */}
      {events.length === 0 ? (
        <Block>
          <Empty
            description="暂无倒计时事件"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加第一个倒计时
            </Button>
          </Empty>
        </Block>
      ) : (
        <Row gutter={[16, 16]}>
          {events.map(event => {
            const daysLeft = getDaysLeft(event.targetDate);
            const isPast = daysLeft < 0;
            const isToday = daysLeft === 0;

            return (
              <Col xs={24} sm={12} key={event.id}>
                <Card
                  loading={loading}
                  hoverable
                  onClick={() => handleCardClick(event)}
                  style={{
                    borderRadius: 12,
                    border: `2px solid ${event.color}`,
                    height: '100%',
                    cursor: 'pointer'
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  <div style={{ textAlign: 'center' }}>
                    {/* 标题 */}
                    <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                      {event.title}
                    </Text>

                    {/* 倒计时天数 */}
                    <div style={{ margin: '16px 0' }}>
                      {isToday ? (
                        <div>
                          <Text style={{
                            fontSize: 48,
                            fontWeight: 'bold',
                            color: event.color,
                            lineHeight: 1
                          }}>
                            今天
                          </Text>
                        </div>
                      ) : (
                        <div>
                          <Text style={{
                            fontSize: 64,
                            fontWeight: 'bold',
                            color: isPast ? '#999' : event.color,
                            lineHeight: 1
                          }}>
                            {Math.abs(daysLeft)}
                          </Text>
                          <Text style={{
                            fontSize: 16,
                            color: isPast ? '#999' : '#666',
                            marginLeft: 4
                          }}>
                            天
                          </Text>
                        </div>
                      )}
                      <Text type={isPast ? 'secondary' : undefined} style={{ fontSize: 14 }}>
                        {isPast ? '已过去' : isToday ? '就是今天！' : '还剩'}
                      </Text>
                    </div>

                    {/* 目标日期 */}
                    <div style={{ marginTop: 8 }}>
                      <Tag color={isPast ? 'default' : event.color}>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        {formatDate(event.targetDate)} {getWeekday(event.targetDate)}
                      </Tag>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* 添加/编辑对话框 */}
      <Modal
        title={editingEvent ? '编辑倒计时' : '新增倒计时'}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        okText={editingEvent ? '更新' : '添加'}
        cancelText="取消"
        footer={(originNode) => (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {editingEvent ? (
              <Button danger onClick={() => setIsDeleteModalOpen(true)}>
                删除
              </Button>
            ) : (
              <div />
            )}
            <div>{originNode}</div>
          </div>
        )}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="title"
            label="事件名称"
            rules={[
              { required: true, message: '请输入事件名称' },
              { max: 20, message: '最多20个字符' }
            ]}
          >
            <Input placeholder="例如：高考、生日、纪念日" maxLength={20} showCount />
          </Form.Item>

          <Form.Item
            name="targetDate"
            label="目标日期"
            rules={[{ required: true, message: '请选择目标日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="选择日期"
              format="YYYY-MM-DD"
            />
          </Form.Item>

          <Form.Item
            name="color"
            label="卡片颜色"
            rules={[{ required: true, message: '请选择颜色' }]}
          >
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '8px 0' }}>
              {colorOptions.map(color => (
                <div
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: color,
                    cursor: 'pointer',
                    border: selectedColor === color ? '3px solid #333' : '3px solid transparent',
                    boxShadow: selectedColor === color ? '0 0 0 2px #fff, 0 0 0 4px ' + color : 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
              ))}
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除确认对话框 */}
      <Modal
        title="删除确认"
        open={isDeleteModalOpen}
        onOk={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除「{editingEvent?.title}」这个倒计时吗？</p>
        <p style={{ color: '#999', fontSize: 12 }}>此操作不可恢复</p>
      </Modal>

      {/* 使用说明 */}
      <Block>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <Text strong>使用说明</Text>
          <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--ant-color-text-secondary)', fontSize: 13 }}>
            <li>点击"新增倒计时"添加重要日子，如高考、生日、纪念日等</li>
            <li>点击卡片可以编辑倒计时信息</li>
            <li>点击卡片右上角的删除按钮可以删除倒计时</li>
            <li>已过去的日期会显示为灰色，表示已过去多少天</li>
          </ul>
        </div>
      </Block>
    </Page>
  );
};

export default DayCountdown;
