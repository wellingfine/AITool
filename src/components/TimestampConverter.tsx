import React, { useState, useEffect } from "react";
import {
  Card,
  Input,
  Button,
  Typography,
  Space,
  message,
  Row,
  Col,
  Descriptions,
  Tag,
  theme,
  DatePicker,
} from "antd";
import {
  CopyOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { nativeAPI } from "../services/nativeAPI";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const TimestampConverter: React.FC = () => {
  const [timestamp, setTimestamp] = useState<string>("");
  const [datetime, setDatetime] = useState<string>("");
  const [millisecondTimestamp, setMillisecondTimestamp] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const { token } = theme.useToken();

  // 实时更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      // 只是用于显示，不更新输入框
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getCurrentTimestamp = () => {
    const now = Math.floor(Date.now() / 1000);
    setTimestamp(now.toString());
    convertTimestampToDate(now.toString());
  };

  const convertTimestampToDate = (ts: string) => {
    if (!ts) return;

    const timestamp = parseInt(ts, 10);
    if (isNaN(timestamp)) {
      message.error("请输入有效的时间戳");
      return;
    }

    const date = new Date(
      timestamp < 1000000000000 ? timestamp * 1000 : timestamp,
    );

    if (isNaN(date.getTime())) {
      message.error("时间戳转换失败");
      return;
    }

    const formattedDate = date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    setDatetime(formattedDate);
    // 设置对应的秒级和毫秒级时间戳
    setMillisecondTimestamp(date.getTime().toString());
  };

  const convertDateToTimestamp = (date: Dayjs | null) => {
    if (!date) {
      setTimestamp("");
      setDatetime("");
      setMillisecondTimestamp("");
      setSelectedDate(null);
      return;
    }

    const ts = Math.floor(date.valueOf() / 1000);
    setTimestamp(ts.toString());

    const formattedDate = date.format("YYYY-MM-DD HH:mm:ss");
    setDatetime(formattedDate);

    setMillisecondTimestamp(date.valueOf().toString());
  };

  const copyToClipboard = async (text: string, label: string = "已复制") => {
    if (!text) return;

    await nativeAPI.clipboard.write(text);
    message.success(label);
  };

  const clear = () => {
    setTimestamp("");
    setDatetime("");
  };

  const now = new Date();
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const currentFormatted = now.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <div style={{ padding: "0 20px" }}>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        {/* 当前时间卡片 */}
        <Card
          styles={{
            body: { padding: "20px 24px" },
          }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12}>
              <Descriptions
                column={1}
                size="small"
                items={[
                  {
                    label: <Text type="secondary">当前时间</Text>,
                    children: (
                      <Text
                        strong
                        style={{ fontSize: 16, color: token.colorText }}
                      >
                        {currentFormatted}
                      </Text>
                    ),
                  },
                  {
                    label: <Text type="secondary">时间戳（秒）</Text>,
                    children: (
                      <Space size={8}>
                        <Tag color="blue" icon={<ClockCircleOutlined />}>
                          {currentTimestamp}
                        </Tag>
                        <Button
                          type="link"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() =>
                            copyToClipboard(currentTimestamp.toString())
                          }
                          style={{ padding: 0, height: "auto" }}
                        >
                          复制
                        </Button>
                      </Space>
                    ),
                  },
                  {
                    label: <Text type="secondary">时间戳（毫秒）</Text>,
                    children: (
                      <Space size={8}>
                        <Tag color="cyan">{Date.now()}</Tag>
                        <Button
                          type="link"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copyToClipboard(Date.now().toString())}
                          style={{ padding: 0, height: "auto" }}
                        >
                          复制
                        </Button>
                      </Space>
                    ),
                  },
                ]}
              />
            </Col>
            <Col xs={24} sm={12} style={{ textAlign: "center" }}>
              <Button
                type="primary"
                size="large"
                icon={<ReloadOutlined />}
                onClick={getCurrentTimestamp}
                style={{ minWidth: 140 }}
              >
                刷新
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 时间戳转日期 */}
        <Card
          title={
            <Space>
              <ClockCircleOutlined style={{ color: token.colorPrimary }} />
              <span>时间戳 → 日期时间</span>
            </Space>
          }
          extra={
            <Button
              size="small"
              onClick={() => {
                setTimestamp("");
                setDatetime("");
              }}
            >
              清空
            </Button>
          }
        >
          <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
            <Input
              placeholder="请输入时间戳（秒或毫秒）"
              size="large"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              onPressEnter={() => convertTimestampToDate(timestamp)}
              suffix={
                timestamp ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(timestamp)}
                    style={{ marginRight: -8 }}
                  >
                    复制
                  </Button>
                ) : null
              }
            />

            <Button
              type="primary"
              size="large"
              block
              onClick={() => convertTimestampToDate(timestamp)}
            >
              转换
            </Button>

            {datetime && (
              <div
                style={{
                  padding: "16px",
                  borderRadius: token.borderRadius,
                  background: token.colorFillAlter,
                }}
              >
                <Text
                  type="secondary"
                  style={{ display: "block", marginBottom: 8 }}
                >
                  转换结果
                </Text>
                <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                  <Space size={12}>
                    <Text
                      strong
                      style={{ fontSize: 18, color: token.colorText }}
                    >
                      {datetime}
                    </Text>
                    <Button
                      type="primary"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(datetime, "日期已复制")}
                    >
                      复制日期
                    </Button>
                  </Space>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <Text type="secondary">秒级：</Text>
                    <Space>
                      <Tag color="blue">{timestamp}</Tag>
                      <Button
                        type="link"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(timestamp, "秒级已复制")}
                        style={{ padding: 0, height: "auto" }}
                      >
                        复制
                      </Button>
                    </Space>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <Text type="secondary">毫秒级：</Text>
                    <Space>
                      <Tag color="cyan">{millisecondTimestamp}</Tag>
                      <Button
                        type="link"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() =>
                          copyToClipboard(millisecondTimestamp, "毫秒级已复制")
                        }
                        style={{ padding: 0, height: "auto" }}
                      >
                        复制
                      </Button>
                    </Space>
                  </div>
                </Space>
              </div>
            )}
          </Space>
        </Card>

        {/* 日期转时间戳 */}
        <Card
          title={
            <Space>
              <CalendarOutlined style={{ color: token.colorPrimary }} />
              <span>日期时间 → 时间戳</span>
            </Space>
          }
        >
          <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              size="large"
              value={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                if (date) convertDateToTimestamp(date);
                else {
                  setTimestamp("");
                  setDatetime("");
                  setMillisecondTimestamp("");
                }
              }}
              style={{ width: "100%" }}
            />

            {timestamp && (
              <div
                style={{
                  padding: "16px",
                  borderRadius: token.borderRadius,
                  background: token.colorFillAlter,
                }}
              >
                <Text
                  type="secondary"
                  style={{ display: "block", marginBottom: 8 }}
                >
                  转换结果
                </Text>
                <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text type="secondary">日期时间：</Text>
                    <Space>
                      <Text
                        strong
                        style={{ fontSize: 16, color: token.colorText }}
                      >
                        {datetime}
                      </Text>
                    </Space>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text type="secondary">秒级：</Text>
                    <Space>
                      <Tag color="blue">{timestamp}</Tag>
                      <Button
                        type="link"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() =>
                          copyToClipboard(timestamp, "秒级时间戳已复制")
                        }
                      >
                        复制
                      </Button>
                    </Space>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text type="secondary">毫秒级：</Text>
                    <Space>
                      <Tag color="cyan">{millisecondTimestamp}</Tag>
                      <Button
                        type="link"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() =>
                          copyToClipboard(
                            millisecondTimestamp,
                            "毫秒级时间戳已复制",
                          )
                        }
                      >
                        复制
                      </Button>
                    </Space>
                  </div>
                </Space>
              </div>
            )}
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default TimestampConverter;
