import { useState, useMemo, useEffect, useRef } from 'react';
import { InputNumber, Radio, Typography, Table, Tag, Divider, Row, Col, Statistic } from 'antd';
import { BankOutlined, CalculatorOutlined, MoneyCollectOutlined, LineChartOutlined } from '@ant-design/icons';
import { Chart } from '@antv/g2';
import Block from '../lib/Block';
import Page from '../lib/Page';

const { Text, Paragraph } = Typography;

type RepaymentMethod = 'equalPayment' | 'equalPrincipal';

interface PaymentDetail {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remaining: number;
}

const MortgageCalculator: React.FC = () => {
  const [loanAmount, setLoanAmount] = useState<number>(100);
  const [years, setYears] = useState<number>(30);
  const [rate, setRate] = useState<number>(3.45);
  const [method, setMethod] = useState<RepaymentMethod>('equalPayment');
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const result = useMemo(() => {
    const principal = loanAmount * 10000;
    const months = years * 12;
    const monthlyRate = rate / 100 / 12;

    if (!principal || !months || !monthlyRate) return null;

    const details: PaymentDetail[] = [];
    let totalInterest = 0;

    if (method === 'equalPayment') {
      const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);

      let remaining = principal;
      for (let i = 1; i <= months; i++) {
        const interest = remaining * monthlyRate;
        const principalPaid = payment - interest;
        remaining -= principalPaid;
        totalInterest += interest;

        details.push({
          month: i,
          payment,
          principal: principalPaid,
          interest,
          remaining: Math.max(0, remaining),
        });
      }

      return {
        firstMonth: payment,
        totalPayment: payment * months,
        totalInterest,
        details,
      };
    } else {
      const monthlyPrincipal = principal / months;
      let remaining = principal;
      let firstMonthPayment = 0;

      for (let i = 1; i <= months; i++) {
        const interest = remaining * monthlyRate;
        const payment = monthlyPrincipal + interest;
        if (i === 1) firstMonthPayment = payment;
        remaining -= monthlyPrincipal;
        totalInterest += interest;

        details.push({
          month: i,
          payment,
          principal: monthlyPrincipal,
          interest,
          remaining: Math.max(0, remaining),
        });
      }

      return {
        firstMonth: firstMonthPayment,
        totalPayment: principal + totalInterest,
        totalInterest,
        details,
      };
    }
  }, [loanAmount, years, rate, method]);

  // 准备图表数据 - 每年取一个点
  const chartData = useMemo(() => {
    if (!result) return [];
    const data: { year: number; type: string; value: number }[] = [];
    
    // 计算每年累计已还总金额
    let cumulativePaid = 0;
    
    for (let i = 0; i < result.details.length; i++) {
      cumulativePaid += result.details[i].payment;
      // 每年末记录数据（第11索引是第12个月，即第1年末）
      if ((i + 1) % 12 === 0 || i === result.details.length - 1) {
        const year = Math.floor((i + 1) / 12);
        const item = result.details[i];
        // 检查是否已添加该年份数据
        const existingIndex = data.findIndex(d => d.year === year);
        if (existingIndex === -1) {
          data.push(
            { year, type: '已还总金额', value: Math.round(cumulativePaid) },
            { year, type: '剩余本金', value: Math.round(item.remaining) }
          );
        } else {
          // 更新已有数据
          data[existingIndex] = { year, type: '已还总金额', value: Math.round(cumulativePaid) };
          data[existingIndex + 1] = { year, type: '剩余本金', value: Math.round(item.remaining) };
        }
      }
    }
    
    return data;
  }, [result]);

  // 渲染图表
  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;

    // 销毁旧图表
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const chart = new Chart({
      container: chartRef.current,
      autoFit: true,
      height: 300,
    });

    chart
      .data(chartData)
      .encode('x', 'year')
      .encode('y', 'value')
      .encode('color', 'type')
      .scale('x', { domainMin: 1, nice: true })
      .scale('y', { nice: true })
      .axis('x', { title: '年份' })
      .axis('y', { 
        title: '金额（元）',
        labelFormatter: (v: number) => `¥${(v / 10000).toFixed(0)}万`,
      })
      .legend('color', {
        position: 'top',
        itemSpacing: 20,
      });

    chart
      .line()
      .encode('shape', 'smooth')
      .tooltip((d: { type: string; value: number }) => ({
        name: d.type,
        value: `¥${d.value.toLocaleString()}`,
      }));

    chart.point().encode('shape', 'point').tooltip(false);

    chart.render();
    chartInstanceRef.current = chart;

    return () => {
      chart.destroy();
      chartInstanceRef.current = null;
    };
  }, [chartData]);

  const columns = [
    {
      title: '期数',
      dataIndex: 'month',
      width: 70,
      render: (v: number) => `${v}期`,
    },
    {
      title: '月供',
      dataIndex: 'payment',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '本金',
      dataIndex: 'principal',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '利息',
      dataIndex: 'interest',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '剩余本金',
      dataIndex: 'remaining',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
  ];

  return (
    <Page maxWidth={900}>
      <Block>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <BankOutlined style={{ color: '#1677ff' }} />
          <Text strong>贷款信息</Text>
        </div>

        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">贷款金额（万元）</Text>
            </div>
            <InputNumber
              min={1}
              max={10000}
              value={loanAmount}
              onChange={(v) => setLoanAmount(v || 0)}
              style={{ width: '100%' }}
              size="large"
              prefix="¥"
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">贷款期限（年）</Text>
            </div>
            <InputNumber
              min={1}
              max={30}
              value={years}
              onChange={(v) => setYears(v || 0)}
              style={{ width: '100%' }}
              size="large"
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">年利率（%）</Text>
            </div>
            <InputNumber
              min={0.1}
              max={20}
              step={0.01}
              value={rate}
              onChange={(v) => setRate(v || 0)}
              style={{ width: '100%' }}
              size="large"
            />
          </Col>
        </Row>

        <Divider />

        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            还款方式
          </Text>
          <Radio.Group
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="equalPayment">
              <CalculatorOutlined style={{ marginRight: 4 }} />
              等额本息
            </Radio.Button>
            <Radio.Button value="equalPrincipal">
              <MoneyCollectOutlined style={{ marginRight: 4 }} />
              等额本金
            </Radio.Button>
          </Radio.Group>
        </div>

        <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
          {method === 'equalPayment'
            ? '等额本息：每月还款金额相同，前期利息多本金少，适合收入稳定的借款人'
            : '等额本金：每月本金相同，月供逐月递减，前期还款压力大但总利息较少'}
        </Paragraph>
      </Block>

      {result && (
        <>
          <Block>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CalculatorOutlined style={{ color: '#52c41a' }} />
              <Text strong>计算结果</Text>
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: '#f6ffed', borderRadius: 8 }}>
                  <Statistic
                    title={method === 'equalPayment' ? '每月还款' : '首月还款'}
                    value={result.firstMonth}
                    precision={2}
                    prefix="¥"
                    styles={{ content: { color: '#52c41a' } }}
                  />
                  {method === 'equalPrincipal' && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      每月递减约 ¥{((loanAmount * 10000 / (years * 12)) * (rate / 100 / 12)).toFixed(2)}
                    </Text>
                  )}
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: '#fff2f0', borderRadius: 8 }}>
                  <Statistic
                    title="支付利息"
                    value={result.totalInterest}
                    precision={2}
                    prefix="¥"
                    styles={{ content: { color: '#ff4d4f' } }}
                  />
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: '#e6f7ff', borderRadius: 8 }}>
                  <Statistic
                    title="还款总额"
                    value={result.totalPayment}
                    precision={2}
                    prefix="¥"
                    styles={{ content: { color: '#1890ff' } }}
                  />
                </div>
              </Col>
            </Row>

            <Divider />

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Tag color="blue">贷款总额: ¥{(loanAmount * 10000).toLocaleString()}</Tag>
              <Tag color="orange">贷款年限: {years}年 ({years * 12}期)</Tag>
              <Tag color="purple">年利率: {rate}%</Tag>
              <Tag color="green">还款方式: {method === 'equalPayment' ? '等额本息' : '等额本金'}</Tag>
            </div>
          </Block>

          <Block>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <LineChartOutlined style={{ color: '#fa8c16' }} />
              <Text strong>还款趋势图</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                （每年数据）
              </Text>
            </div>
            <div ref={chartRef} style={{ width: '100%', height: 300 }} />
          </Block>

          <Block>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <BankOutlined style={{ color: '#722ed1' }} />
              <Text strong>还款计划表</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                （共 {years * 12} 期）
              </Text>
            </div>

            <Table
              dataSource={result.details}
              columns={columns}
              size="small"
              pagination={{
                pageSize: 12,
                showSizeChanger: false,
                showTotal: (total) => `共 ${total} 期`,
              }}
              scroll={{ y: 400 }}
              rowKey="month"
            />
          </Block>
        </>
      )}
    </Page>
  );
};

export default MortgageCalculator;
