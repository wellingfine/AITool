import React, { useState, useEffect } from "react";
import {
  Card,
  InputNumber,
  Row,
  Col,
  theme,
  Progress,
  Space,
  Segmented,
} from "antd";
import {
  UserOutlined,
  ManOutlined,
  WomanOutlined,
} from "@ant-design/icons";

interface BMIResult {
  bmi: number;
  category: string;
  color: string;
  healthyWeightRange: [number, number];
  suggestion: string;
}

const BMICalculator: React.FC = () => {
  const [height, setHeight] = useState<number | null>(170);
  const [weight, setWeight] = useState<number | null>(65);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [result, setResult] = useState<BMIResult | null>(null);
  
  const { token } = theme.useToken();

  // BMI 分类标准（中国标准）
  const getBMICategory = (bmi: number): { category: string; color: string; suggestion: string } => {
    if (bmi < 18.5) {
      return { 
        category: '偏瘦', 
        color: '#faad14',
        suggestion: '建议适当增加营养摄入，保持规律饮食，适度运动增强体质。'
      };
    } else if (bmi < 24) {
      return { 
        category: '正常', 
        color: '#52c41a',
        suggestion: '体重正常，继续保持健康的生活方式，均衡饮食，规律运动。'
      };
    } else if (bmi < 28) {
      return { 
        category: '偏胖', 
        color: '#fa8c16',
        suggestion: '建议控制饮食热量摄入，增加有氧运动，如快走、游泳、骑车等。'
      };
    } else {
      return { 
        category: '肥胖', 
        color: '#f5222d',
        suggestion: '建议咨询医生或营养师，制定科学的减重计划，注意控制饮食和增加运动量。'
      };
    }
  };

  // 计算 BMI
  useEffect(() => {
    if (height && weight && height > 0 && weight > 0) {
      const heightInMeters = height / 100;
      const bmi = weight / (heightInMeters * heightInMeters);
      const { category, color, suggestion } = getBMICategory(bmi);
      
      // 计算健康体重范围 (BMI 18.5-24)
      const minWeight = 18.5 * heightInMeters * heightInMeters;
      const maxWeight = 24 * heightInMeters * heightInMeters;
      
      setResult({
        bmi,
        category,
        color,
        healthyWeightRange: [minWeight, maxWeight],
        suggestion
      });
    } else {
      setResult(null);
    }
  }, [height, weight]);

  // BMI 进度条百分比（映射到 0-100，BMI 15-35 范围）
  const getProgressPercent = (bmi: number): number => {
    const minBMI = 15;
    const maxBMI = 35;
    const percent = ((bmi - minBMI) / (maxBMI - minBMI)) * 100;
    return Math.min(100, Math.max(0, percent));
  };

  return (
    <div style={{ padding: "16px", maxWidth: 800, margin: '0 auto' }}>
      <Card>
        {/* 性别选择 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Segmented
            value={gender}
            onChange={(value) => setGender(value as 'male' | 'female')}
            options={[
              { label: <Space><ManOutlined />男性</Space>, value: 'male' },
              { label: <Space><WomanOutlined />女性</Space>, value: 'female' },
            ]}
            size="large"
          />
        </div>

        {/* 身高体重输入 */}
        <Row gutter={32} justify="center">
          <Col>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 8, color: token.colorTextSecondary }}>身高 (cm)</div>
              <InputNumber
                value={height}
                onChange={(value) => setHeight(value)}
                min={100}
                max={250}
                size="large"
                style={{ width: 120 }}
                placeholder="身高"
              />
            </div>
          </Col>
          <Col>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 8, color: token.colorTextSecondary }}>体重 (kg)</div>
              <InputNumber
                value={weight}
                onChange={(value) => setWeight(value)}
                min={20}
                max={300}
                size="large"
                style={{ width: 120 }}
                placeholder="体重"
                step={0.1}
              />
            </div>
          </Col>
        </Row>

        {/* BMI 结果显示 */}
        {result && (
          <div style={{ marginTop: 32 }}>
            {/* BMI 数值 */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, fontWeight: 'bold', color: result.color }}>
                {result.bmi.toFixed(1)}
              </div>
              <div style={{ 
                fontSize: 20, 
                color: result.color,
                fontWeight: 500,
                marginTop: 8
              }}>
                {result.category}
              </div>
            </div>

            {/* BMI 范围条 */}
            <div style={{ padding: '0 20px', marginBottom: 24 }}>
              <Progress
                percent={getProgressPercent(result.bmi)}
                showInfo={false}
                strokeColor={{
                  '0%': '#faad14',
                  '17.5%': '#52c41a',
                  '45%': '#52c41a',
                  '65%': '#fa8c16',
                  '100%': '#f5222d',
                }}
                trailColor={token.colorFillSecondary}
                size={['100%', 12]}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginTop: 8,
                fontSize: 12,
                color: token.colorTextSecondary
              }}>
                <span>偏瘦 (&lt;18.5)</span>
                <span>正常 (18.5-24)</span>
                <span>偏胖 (24-28)</span>
                <span>肥胖 (&gt;28)</span>
              </div>
            </div>

            {/* 健康体重范围 */}
            <Card 
              size="small" 
              style={{ 
                background: token.colorFillAlter,
                marginBottom: 16
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: token.colorTextSecondary, marginBottom: 4 }}>
                      健康体重范围
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 500 }}>
                      {result.healthyWeightRange[0].toFixed(1)} - {result.healthyWeightRange[1].toFixed(1)} kg
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: token.colorTextSecondary, marginBottom: 4 }}>
                      与理想体重差距
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 500 }}>
                      {weight && (
                        weight < result.healthyWeightRange[0] 
                          ? <span style={{ color: '#faad14' }}>需增重 {(result.healthyWeightRange[0] - weight).toFixed(1)} kg</span>
                          : weight > result.healthyWeightRange[1]
                            ? <span style={{ color: '#fa8c16' }}>需减重 {(weight - result.healthyWeightRange[1]).toFixed(1)} kg</span>
                            : <span style={{ color: '#52c41a' }}>已在健康范围内</span>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 健康建议 */}
            <Card 
              size="small"
              style={{ background: token.colorFillAlter }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <UserOutlined style={{ color: token.colorPrimary, marginTop: 4 }} />
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>健康建议</div>
                  <div style={{ color: token.colorTextSecondary }}>{result.suggestion}</div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Card>

      {/* BMI 说明 */}
      <Card style={{ marginTop: 16 }} size="small">
        <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
          <div style={{ fontWeight: 500, marginBottom: 8, color: token.colorText }}>关于 BMI</div>
          <p>BMI（Body Mass Index）即身体质量指数，是用体重公斤数除以身高米数平方得出的数字，是目前国际上常用的衡量人体胖瘦程度以及是否健康的一个标准。</p>
          <p style={{ margin: 0 }}>计算公式：BMI = 体重(kg) ÷ 身高²(m²)</p>
        </div>
      </Card>
    </div>
  );
};

export default BMICalculator;
