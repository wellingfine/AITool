import React, { useState, useEffect, useMemo } from 'react';
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
  Divider,
  Typography,
  Space,
  message,
  Modal,
  Dropdown,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UserAddOutlined,
  DollarOutlined,
  SwapOutlined,
  TeamOutlined,
  ClearOutlined,
  BookOutlined,
  DownOutlined,
  EditOutlined,
} from '@ant-design/icons';
import Block from '../lib/Block';

const { Text } = Typography;

// 参与者
interface Participant {
  id: string;
  name: string;
}

// 支出记录
interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string; // participant id
  splitAmong: string[]; // participant ids
  createdAt: number;
}

// 账本
interface Ledger {
  id: string;
  name: string;
  participants: Participant[];
  expenses: Expense[];
  createdAt: number;
}

// 结算记录
interface Settlement {
  from: string;
  to: string;
  amount: number;
}

// 本地存储key
const STORAGE_KEY = 'splitBill_ledgers';
const CURRENT_LEDGER_KEY = 'splitBill_currentLedger';

const SplitBill: React.FC = () => {
  // 账本列表
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  // 当前账本ID
  const [currentLedgerId, setCurrentLedgerId] = useState<string>('');
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
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const { token } = theme.useToken();

  // 从本地存储加载数据
  useEffect(() => {
    try {
      const savedLedgers = localStorage.getItem(STORAGE_KEY);
      const savedCurrentId = localStorage.getItem(CURRENT_LEDGER_KEY);

      if (savedLedgers) {
        const parsedLedgers = JSON.parse(savedLedgers);
        setLedgers(parsedLedgers);

        // 恢复上次选择的账本
        if (savedCurrentId && parsedLedgers.some((l: Ledger) => l.id === savedCurrentId)) {
          setCurrentLedgerId(savedCurrentId);
        } else if (parsedLedgers.length > 0) {
          setCurrentLedgerId(parsedLedgers[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
  }, []);

  // 保存账本列表到本地存储
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ledgers));
    } catch (error) {
      console.error('Failed to save ledgers:', error);
    }
  }, [ledgers]);

  // 保存当前账本ID到本地存储
  useEffect(() => {
    if (currentLedgerId) {
      localStorage.setItem(CURRENT_LEDGER_KEY, currentLedgerId);
    }
  }, [currentLedgerId]);

  // 计算结算方案
  useEffect(() => {
    if (participants.length === 0 || expenses.length === 0) {
      setSettlements([]);
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

    setSettlements(newSettlements);
  }, [participants, expenses]);

  // 更新当前账本
  const updateCurrentLedger = (updates: Partial<Ledger>) => {
    setLedgers((prev) =>
      prev.map((l) => (l.id === currentLedgerId ? { ...l, ...updates } : l))
    );
  };

  // 创建新账本
  const handleCreateLedger = () => {
    if (!newLedgerName.trim()) {
      message.warning('请输入账本名称');
      return;
    }

    if (editingLedger) {
      // 编辑模式
      setLedgers((prev) =>
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

      setLedgers((prev) => [...prev, newLedger]);
      setCurrentLedgerId(newLedger.id);
      message.success('账本创建成功');
    }

    setNewLedgerName('');
    setEditingLedger(null);
    setIsModalOpen(false);
  };

  // 删除账本
  const handleDeleteLedger = (ledgerId: string) => {
    const newLedgers = ledgers.filter((l) => l.id !== ledgerId);
    setLedgers(newLedgers);

    if (currentLedgerId === ledgerId) {
      setCurrentLedgerId(newLedgers.length > 0 ? newLedgers[0].id : '');
    }

    message.success('账本已删除');
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
    message.success('添加成功');
  };

  // 删除参与者
  const handleDeleteParticipant = (id: string) => {
    // 检查是否有相关支出
    const hasExpense = expenses.some(
      (e) => e.paidBy === id || e.splitAmong.includes(id)
    );
    if (hasExpense) {
      message.error('该参与者有相关支出记录，无法删除');
      return;
    }
    updateCurrentLedger({
      participants: participants.filter((p) => p.id !== id),
    });
    message.success('删除成功');
  };

  // 添加支出
  const handleAddExpense = () => {
    if (!currentLedger) return;

    if (!newExpense.description.trim()) {
      message.warning('请输入支出描述');
      return;
    }
    if (!newExpense.amount || newExpense.amount <= 0) {
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

  // 删除支出
  const handleDeleteExpense = (id: string) => {
    updateCurrentLedger({
      expenses: expenses.filter((e) => e.id !== id),
    });
    message.success('删除成功');
  };

  // 清空当前账本数据
  const handleClearAll = () => {
    updateCurrentLedger({
      participants: [],
      expenses: [],
    });
    setNewExpense({
      description: '',
      amount: 0,
      paidBy: '',
      splitAmong: [],
    });
    message.success('已清空所有数据');
  };

  // 获取参与者姓名
  const getParticipantName = (id: string) => {
    return participants.find((p) => p.id === id)?.name || '未知';
  };

  // 计算总支出
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
      onClick: () => setCurrentLedgerId(l.id),
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
                <Text type="secondary">支出：</Text>
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

            {/* 添加支出 */}
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
                <Text strong>添加支出</Text>
              </div>

              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <Input
                    placeholder="支出描述（如：午餐、门票）"
                    value={newExpense.description}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, description: e.target.value })
                    }
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <InputNumber
                    placeholder="金额"
                    value={newExpense.amount || undefined}
                    onChange={(value) =>
                      setNewExpense({ ...newExpense, amount: value || 0 })
                    }
                    min={0}
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
                      添加支出
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

            {/* 支出记录列表 */}
            <Block>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DollarOutlined style={{ color: token.colorPrimary }} />
                  <Text strong>支出记录</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ({expenses.length} 笔，共 ¥{totalExpense.toFixed(2)})
                  </Text>
                </div>
                {(participants.length > 0 || expenses.length > 0) && (
                  <Popconfirm
                    title="确认清空"
                    description="确定要清空当前账本的所有数据吗？此操作不可恢复。"
                    onConfirm={handleClearAll}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<ClearOutlined />}
                    >
                      清空
                    </Button>
                  </Popconfirm>
                )}
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
                          description="确定要删除这笔支出吗？"
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
                  description="暂无支出记录"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Block>

            {/* 结算方案 */}
            {settlements.length > 0 && (
              <Block
                style={{
                  background: token.colorSuccessBg,
                  borderColor: token.colorSuccessBorder,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <SwapOutlined style={{ color: token.colorSuccess }} />
                  <Text strong style={{ color: token.colorSuccess }}>
                    结算方案
                  </Text>
                </div>

                <List
                  size="small"
                  dataSource={settlements}
                  renderItem={(settlement, index) => (
                    <List.Item style={{ padding: '8px 0' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                        }}
                      >
                        <Tag color="blue">{index + 1}</Tag>
                        <Text strong>
                          {getParticipantName(settlement.from)}
                        </Text>
                        <SwapOutlined
                          style={{ color: token.colorTextSecondary }}
                        />
                        <Text strong>{getParticipantName(settlement.to)}</Text>
                        <Text
                          style={{
                            marginLeft: 'auto',
                            color: token.colorSuccess,
                            fontWeight: 600,
                            fontSize: 16,
                          }}
                        >
                          ¥{settlement.amount.toFixed(2)}
                        </Text>
                      </div>
                    </List.Item>
                  )}
                />

                <Divider style={{ margin: '12px 0' }} />

                <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                  提示：以上是最优的结算方案，按照此方案转账可使转账次数最少。
                </div>
              </Block>
            )}

            {/* 个人明细 */}
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
                  <Text strong>个人明细</Text>
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
              3. 每次有人付款时，添加支出记录，选择付款人和参与分摊的人
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
