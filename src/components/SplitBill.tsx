import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Input,
  InputNumber,
  Button,
  List,
  Select,
  Row,
  Col,
  theme,
  Popconfirm,
  Empty,
  Tag,
  Typography,
  Space,
  message,
  Modal,
  Dropdown,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UserAddOutlined,
  DollarOutlined,
  TeamOutlined,
  BookOutlined,
  DownOutlined,
  EditOutlined,
} from '@ant-design/icons';
import Block from '../lib/Block';
import { splitBillStorage, type Ledger, type Participant, type Expense } from '../services/splitBillStorage';

const { Text } = Typography;

// 结算记录
interface Settlement {
  from: string;
  to: string;
  amount: number;
}

const SplitBill: React.FC = () => {
  // 账本列表
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  // 当前账本ID
  const [currentLedgerId, setCurrentLedgerId] = useState<string>('');
  // 加载状态
  const [loading, setLoading] = useState(true);
  // 新账本弹窗
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);

  // 当前账本数据
  const currentLedger = useMemo(() => {
    return ledgers.find((l) => l.id === currentLedgerId);
  }, [ledgers, currentLedgerId]);

  const participants = currentLedger?.participants || [];
  const expenses = currentLedger?.expenses || [];

  const [newParticipantName, setNewParticipantName] = useState('');
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: 0,
    paidBy: '',
    splitAmong: [] as string[],
  });

  const { token } = theme.useToken();

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await splitBillStorage.getData();
      setLedgers(data.ledgers || []);

      // 恢复上次选择的账本
      if (data.currentLedgerId && data.ledgers.some((l: Ledger) => l.id === data.currentLedgerId)) {
        setCurrentLedgerId(data.currentLedgerId);
      } else if (data.ledgers.length > 0) {
        setCurrentLedgerId(data.ledgers[0].id);
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 从存储加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 保存账本列表到存储
  const saveLedgers = useCallback(async (newLedgers: Ledger[]) => {
    try {
      await splitBillStorage.saveLedgers(newLedgers);
    } catch (error) {
      console.error('Failed to save ledgers:', error);
    }
  }, []);

  // 保存当前账本ID到存储
  const saveCurrentLedgerId = useCallback(async (id: string) => {
    try {
      await splitBillStorage.saveCurrentLedgerId(id);
    } catch (error) {
      console.error('Failed to save current ledger id:', error);
    }
  }, []);

  // 更新账本列表并保存
  const updateLedgers = useCallback((updater: (prev: Ledger[]) => Ledger[]) => {
    setLedgers(prev => {
      const newLedgers = updater(prev);
      saveLedgers(newLedgers);
      return newLedgers;
    });
  }, [saveLedgers]);

  // 设置当前账本ID并保存
  const setCurrentLedgerIdAndSave = useCallback((id: string) => {
    setCurrentLedgerId(id);
    saveCurrentLedgerId(id);
  }, [saveCurrentLedgerId]);

  // 计算结算方案
  useEffect(() => {
    if (participants.length === 0 || expenses.length === 0) {
      return;
    }

    // 计算每个人的净额（应收 - 应付）
    const balances: Record<string, number> = {};
    participants.forEach((p) => {
      balances[p.id] = 0;
    });

    expenses.forEach((expense) => {
      const shareCount = expense.splitAmong.length;
      if (shareCount === 0) return;

      const shareAmount = expense.amount / shareCount;

      // 付款人增加应收
      balances[expense.paidBy] += expense.amount;

      // 参与者增加应付
      expense.splitAmong.forEach((participantId) => {
        balances[participantId] -= shareAmount;
      });
    });

    // 使用贪心算法计算最少转账次数的结算方案
    const debtors: { id: string; amount: number }[] = [];
    const creditors: { id: string; amount: number }[] = [];

    Object.entries(balances).forEach(([id, amount]) => {
      if (amount < -0.01) {
        debtors.push({ id, amount: -amount });
      } else if (amount > 0.01) {
        creditors.push({ id, amount });
      }
    });

    // 按金额排序
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const newSettlements: Settlement[] = [];

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > 0.01) {
        newSettlements.push({
          from: debtor.id,
          to: creditor.id,
          amount: Math.round(amount * 100) / 100,
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

  }, [participants, expenses]);

  // 更新当前账本
  const updateCurrentLedger = async (updates: Partial<Ledger>) => {
    const newLedgers = ledgers.map((l) =>
      l.id === currentLedgerId ? { ...l, ...updates } : l
    );
    setLedgers(newLedgers);
    try {
      await splitBillStorage.saveLedgers(newLedgers);
    } catch (error) {
      console.error('保存账本失败:', error);
    }
  };

  // 创建新账本
  const handleCreateLedger = async () => {
    if (!newLedgerName.trim()) {
      message.warning('请输入账本名称');
      return;
    }

    if (editingLedger) {
      // 编辑模式
      updateLedgers((prev) =>
        prev.map((l) =>
          l.id === editingLedger.id ? { ...l, name: newLedgerName.trim() } : l
        )
      );
      message.success('账本已更新');
    } else {
      // 新建模式
      const newLedger: Ledger = {
        id: Date.now().toString(),
        name: newLedgerName.trim(),
        participants: [],
        expenses: [],
        createdAt: Date.now(),
      };

      updateLedgers((prev) => [...prev, newLedger]);
      setCurrentLedgerIdAndSave(newLedger.id);
      message.success('账本创建成功');
    }

    setNewLedgerName('');
    setEditingLedger(null);
    setIsModalOpen(false);
  };

  // 删除账本
  const handleDeleteLedger = async (ledgerId: string) => {
    try {
      await splitBillStorage.deleteLedger(ledgerId);
      const newLedgers = ledgers.filter((l) => l.id !== ledgerId);
      setLedgers(newLedgers);

      if (currentLedgerId === ledgerId) {
        const newId = newLedgers.length > 0 ? newLedgers[0].id : '';
        setCurrentLedgerId(newId);
        await splitBillStorage.saveCurrentLedgerId(newId);
      }

      message.success('账本已删除');
    } catch (error) {
      console.error('删除账本失败:', error);
      message.error('删除失败');
    }
  };

  // 编辑账本
  const handleEditLedger = (ledger: Ledger) => {
    setEditingLedger(ledger);
    setNewLedgerName(ledger.name);
    setIsModalOpen(true);
  };

  // 添加参与者
  const handleAddParticipant = () => {
    if (!currentLedger) return;

    if (!newParticipantName.trim()) {
      message.warning('请输入参与者姓名');
      return;
    }

    if (participants.some((p) => p.name === newParticipantName.trim())) {
      message.warning('该参与者已存在');
      return;
    }

    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: newParticipantName.trim(),
    };

    updateCurrentLedger({
      participants: [...participants, newParticipant],
    });
    setNewParticipantName('');
  };

  // 删除参与者
  const handleDeleteParticipant = (id: string) => {
    // 检查是否有相关账单
    const hasExpense = expenses.some(
      (e) => e.paidBy === id || e.splitAmong.includes(id)
    );
    if (hasExpense) {
      message.error('该参与者有相关账单记录，无法删除');
      return;
    }
    updateCurrentLedger({
      participants: participants.filter((p) => p.id !== id),
    });
    message.success('删除成功');
  };

  // 添加账单
  const handleAddExpense = () => {
    if (!currentLedger) return;

    if (!newExpense.description.trim()) {
      message.warning('请输入账单描述');
      return;
    }
    if (!newExpense.amount || newExpense.amount === 0) {
      message.warning('请输入有效金额');
      return;
    }
    if (!newExpense.paidBy) {
      message.warning('请选择付款人');
      return;
    }
    if (newExpense.splitAmong.length === 0) {
      message.warning('请选择参与分摊的人');
      return;
    }

    const expense: Expense = {
      id: Date.now().toString(),
      description: newExpense.description.trim(),
      amount: newExpense.amount,
      paidBy: newExpense.paidBy,
      splitAmong: newExpense.splitAmong,
      createdAt: Date.now(),
    };

    updateCurrentLedger({
      expenses: [...expenses, expense],
    });
    setNewExpense({
      description: '',
      amount: 0,
      paidBy: newExpense.paidBy, // 保留上次的付款人
      splitAmong: newExpense.splitAmong, // 保留上次的分摊人
    });
    message.success('添加成功');
  };

  // 删除账单
  const handleDeleteExpense = (id: string) => {
    updateCurrentLedger({
      expenses: expenses.filter((e) => e.id !== id),
    });
    message.success('删除成功');
  };

  // 获取参与者姓名
  const getParticipantName = (id: string) => {
    return participants.find((p) => p.id === id)?.name || '未知';
  };

  // 计算总金额
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  // 计算每人应付金额
  const getPersonExpense = (participantId: string) => {
    let paid = 0;
    let shouldPay = 0;

    expenses.forEach((expense) => {
      if (expense.paidBy === participantId) {
        paid += expense.amount;
      }
      if (expense.splitAmong.includes(participantId)) {
        shouldPay += expense.amount / expense.splitAmong.length;
      }
    });

    return { paid, shouldPay, balance: paid - shouldPay };
  };

  // 账本下拉菜单
  const ledgerMenuItems = [
    ...ledgers.map((l) => ({
      key: l.id,
      label: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minWidth: 150,
          }}
        >
          <span
            style={{
              fontWeight: l.id === currentLedgerId ? 600 : 400,
              color: l.id === currentLedgerId ? token.colorPrimary : undefined,
            }}
          >
            {l.name}
          </span>
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleEditLedger(l);
              }}
            />
            <Popconfirm
              title="确认删除"
              description="删除账本后数据无法恢复，确定删除吗？"
              onConfirm={(e) => {
                e?.stopPropagation();
                handleDeleteLedger(l.id);
              }}
              onCancel={(e) => e?.stopPropagation()}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Space>
        </div>
      ),
      onClick: () => setCurrentLedgerIdAndSave(l.id),
    })),
    { type: 'divider' as const },
    {
      key: 'new',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <PlusOutlined />
          <span>新建账本</span>
        </div>
      ),
      onClick: () => {
        setEditingLedger(null);
        setNewLedgerName('');
        setIsModalOpen(true);
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: '8px 0', maxWidth: 800, margin: '0 auto', textAlign: 'center', paddingTop: 100 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* 账本选择器 */}
        <Block>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOutlined style={{ color: token.colorPrimary }} />
              <Text strong>当前账本</Text>
            </div>

            {ledgers.length > 0 ? (
              <Dropdown menu={{ items: ledgerMenuItems }} trigger={['click']}>
                <Button>
                  <Space>
                    {currentLedger?.name || '选择账本'}
                    <DownOutlined />
                  </Space>
                </Button>
              </Dropdown>
            ) : (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingLedger(null);
                  setNewLedgerName('');
                  setIsModalOpen(true);
                }}
              >
                新建账本
              </Button>
            )}
          </div>

          {ledgers.length > 0 && currentLedger && (
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: token.colorFillAlter,
                borderRadius: token.borderRadius,
                display: 'flex',
                gap: 16,
                fontSize: 13,
              }}
            >
              <span>
                <Text type="secondary">参与者：</Text>
                <Text>{participants.length} 人</Text>
              </span>
              <span>
                <Text type="secondary">账单：</Text>
                <Text>{expenses.length} 笔</Text>
              </span>
              <span>
                <Text type="secondary">总金额：</Text>
                <Text type="success">¥{totalExpense.toFixed(2)}</Text>
              </span>
            </div>
          )}
        </Block>

        {/* 无账本时的提示 */}
        {ledgers.length === 0 && (
          <Block>
            <Empty
              description="暂无账本，请先创建一个账本"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingLedger(null);
                  setNewLedgerName('');
                  setIsModalOpen(true);
                }}
              >
                新建账本
              </Button>
            </Empty>
          </Block>
        )}

        {/* 有账本时显示内容 */}
        {currentLedger && (
          <>
            {/* 参与者管理 */}
            <Block>
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <TeamOutlined style={{ color: token.colorPrimary }} />
                  <Text strong>参与者</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ({participants.length} 人)
                  </Text>
                </div>

                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="输入参与者姓名"
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    onPressEnter={handleAddParticipant}
                    prefix={<UserAddOutlined />}
                    style={{ flex: 1 }}
                  />
                  <Button type="primary" onClick={handleAddParticipant}>
                    添加
                  </Button>
                </Space.Compact>
              </div>

              {participants.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {participants.map((p) => {
                    const stats = getPersonExpense(p.id);
                    return (
                      <Tag
                        key={p.id}
                        closable
                        onClose={(e) => {
                          e.preventDefault();
                          handleDeleteParticipant(p.id);
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: 13,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>{p.name}</span>
                        {expenses.length > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              color:
                                stats.balance > 0.01
                                  ? token.colorSuccess
                                  : stats.balance < -0.01
                                  ? token.colorError
                                  : token.colorTextSecondary,
                            }}
                          >
                            ({stats.balance > 0 ? '+' : ''}
                            {stats.balance.toFixed(2)})
                          </span>
                        )}
                      </Tag>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  description="暂无参与者"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Block>

            {/* 添加账单 */}
            <Block>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <DollarOutlined style={{ color: token.colorPrimary }} />
                <Text strong>添加账单</Text>
              </div>

              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <Input
                    placeholder="账单描述（如：午餐、门票、退款）"
                    value={newExpense.description}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, description: e.target.value })
                    }
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <InputNumber
                    placeholder="金额（可为负数表示收入）"
                    value={newExpense.amount || undefined}
                    onChange={(value) =>
                      setNewExpense({ ...newExpense, amount: value || 0 })
                    }
                    precision={2}
                    prefix="¥"
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Select
                    placeholder="谁付的钱"
                    value={newExpense.paidBy || undefined}
                    onChange={(value) =>
                      setNewExpense({ ...newExpense, paidBy: value })
                    }
                    style={{ width: '100%' }}
                    options={participants.map((p) => ({
                      label: p.name,
                      value: p.id,
                    }))}
                    disabled={participants.length === 0}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Select
                    mode="multiple"
                    placeholder="谁参与分摊"
                    value={newExpense.splitAmong}
                    onChange={(value) =>
                      setNewExpense({ ...newExpense, splitAmong: value })
                    }
                    style={{ width: '100%' }}
                    options={participants.map((p) => ({
                      label: p.name,
                      value: p.id,
                    }))}
                    disabled={participants.length === 0}
                    maxTagCount="responsive"
                  />
                </Col>
                <Col xs={24}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddExpense}
                      disabled={participants.length === 0}
                    >
                      添加账单
                    </Button>
                    {participants.length > 0 &&
                      newExpense.splitAmong.length !== participants.length && (
                        <Button
                          onClick={() =>
                            setNewExpense({
                              ...newExpense,
                              splitAmong: participants.map((p) => p.id),
                            })
                          }
                        >
                          全选分摊
                        </Button>
                      )}
                  </Space>
                </Col>
              </Row>
            </Block>

            {/* 账单记录列表 */}
            <Block>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <DollarOutlined style={{ color: token.colorPrimary }} />
                <Text strong>账单记录</Text>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                  ({expenses.length} 笔，共 ¥{totalExpense.toFixed(2)})
                </Text>
              </div>

              {expenses.length > 0 ? (
                <List
                  size="small"
                  dataSource={[...expenses].reverse()}
                  renderItem={(expense) => (
                    <List.Item
                      actions={[
                        <Popconfirm
                          key="delete"
                          title="确认删除"
                          description="确定要删除这笔账单吗？"
                          onConfirm={() => handleDeleteExpense(expense.id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <span>{expense.description}</span>
                            <Text type="success" strong>
                              ¥{expense.amount.toFixed(2)}
                            </Text>
                          </div>
                        }
                        description={
                          <div
                            style={{
                              fontSize: 12,
                              color: token.colorTextSecondary,
                            }}
                          >
                            <span style={{ color: token.colorPrimary }}>
                              {getParticipantName(expense.paidBy)}
                            </span>
                            {' 付款，'}
                            {expense.splitAmong.length === participants.length
                              ? '所有人'
                              : expense.splitAmong
                                  .map((id) => getParticipantName(id))
                                  .join('、')}
                            分摊
                            {expense.splitAmong.length > 0 && (
                              <span>
                                （每人 ¥
                                {(
                                  expense.amount / expense.splitAmong.length
                                ).toFixed(2)}
                                ）
                              </span>
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  description="暂无账单记录"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Block>

            {/* 账单明细 */}
            {participants.length > 0 && expenses.length > 0 && (
              <Block>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <TeamOutlined style={{ color: token.colorPrimary }} />
                  <Text strong>账单明细</Text>
                </div>

                <List
                  size="small"
                  dataSource={participants}
                  renderItem={(participant) => {
                    const stats = getPersonExpense(participant.id);
                    return (
                      <List.Item>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            gap: 16,
                          }}
                        >
                          <Text strong style={{ minWidth: 60 }}>
                            {participant.name}
                          </Text>
                          <div
                            style={{
                              display: 'flex',
                              gap: 16,
                              flex: 1,
                              fontSize: 12,
                            }}
                          >
                            <span>
                              已付:{' '}
                              <Text type="success">
                                ¥{stats.paid.toFixed(2)}
                              </Text>
                            </span>
                            <span>
                              应付: <Text>¥{stats.shouldPay.toFixed(2)}</Text>
                            </span>
                          </div>
                          <Text
                            strong
                            style={{
                              color:
                                stats.balance > 0.01
                                  ? token.colorSuccess
                                  : stats.balance < -0.01
                                  ? token.colorError
                                  : token.colorTextSecondary,
                            }}
                          >
                            {stats.balance > 0
                              ? '应收'
                              : stats.balance < 0
                              ? '应付'
                              : '已结清'}
                            {Math.abs(stats.balance) > 0.01 &&
                              ` ¥${Math.abs(stats.balance).toFixed(2)}`}
                          </Text>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </Block>
            )}
          </>
        )}

        {/* 说明 */}
        <Block>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              width: '100%',
            }}
          >
            <div style={{ fontWeight: 500, color: token.colorText }}>
              使用说明
            </div>
            <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
              1. 首先创建一个账本（如：周末出游、公司团建）
            </div>
            <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
              2. 添加所有参与活动的人员
            </div>
            <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
              3. 每次有人付款时，添加账单记录，选择付款人和参与分摊的人
            </div>
            <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
              4. 系统会自动计算最优的结算方案，使转账次数最少
            </div>
            <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
              5. 可以创建多个账本，方便管理不同的活动
            </div>
          </div>
        </Block>
      </div>

      {/* 新建/编辑账本弹窗 */}
      <Modal
        title={editingLedger ? '编辑账本' : '新建账本'}
        open={isModalOpen}
        onOk={handleCreateLedger}
        onCancel={() => {
          setIsModalOpen(false);
          setNewLedgerName('');
          setEditingLedger(null);
        }}
        okText="确定"
        cancelText="取消"
      >
        <div style={{ padding: '16px 0' }}>
          <Input
            placeholder="请输入账本名称（如：周末出游、公司团建）"
            value={newLedgerName}
            onChange={(e) => setNewLedgerName(e.target.value)}
            onPressEnter={handleCreateLedger}
            prefix={<BookOutlined />}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default SplitBill;
