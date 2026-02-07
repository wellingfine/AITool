import React, { useState, useEffect } from "react";
import {
  Input,
  Button,
  Typography,
  Space,
  message,
  Tag,
  theme,
  DatePicker,
} from "antd";
import type { Dayjs } from "dayjs";
import {
  CopyOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { nativeAPI } from "../services/nativeAPI";
import Block from '../lib/Block';
import Page from '../lib/Page';

const { Text } = Typography;

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

  const convertDateToTimestamp = (date: any) => {
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
    <Page maxWidth={700}>
        {/* 当前时间卡片 */}
        <Block>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>当前时间</Text>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={getCurrentTimestamp}
              >
                刷新
              </Button>
            </div>
            <div>
              <Text style={{ fontSize: 16 }}>{currentFormatted}</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text type="secondary">时间戳（秒）:</Text>
              <Tag color="blue" icon={<ClockCircleOutlined />}>
                {currentTimestamp}
              </Tag>
              <Button
                type="link"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(currentTimestamp.toString())}
                style={{ padding: 0, height: "auto" }}
              >
                复制
              </Button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text type="secondary">时间戳（毫秒）:</Text>
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
            </div>
          </div>
        </Block>

        {/* 时间戳转日期 */}
        <Block>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClockCircleOutlined style={{ color: token.colorPrimary }} />
              <Text strong>时间戳 → 日期时间</Text>
            </div>
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
              block
              onClick={() => convertTimestampToDate(timestamp)}
            >
              转换
            </Button>

            {datetime && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: token.borderRadius,
                  background: token.colorFillAlter,
                }}
              >
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Space size={12}>
                    <Text strong style={{ fontSize: 16, color: token.colorText }}>
                      {datetime}
                    </Text>
                    <Button
                      type="primary"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(datetime, "日期已复制")}
                    >
                      复制
                    </Button>
                  </Space>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Text type="secondary">秒级：</Text>
                    <Tag color="blue">{timestamp}</Tag>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Text type="secondary">毫秒级：</Text>
                    <Tag color="cyan">{millisecondTimestamp}</Tag>
                  </div>
                </Space>
              </div>
            )}
          </div>
        </Block>

        {/* 日期转时间戳 */}
        <Block>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarOutlined style={{ color: token.colorPrimary }} />
              <Text strong>日期时间 → 时间戳</Text>
            </div>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              size="large"
              value={selectedDate as any}
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

            {timestamp && selectedDate && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: token.borderRadius,
                  background: token.colorFillAlter,
                }}
              >
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Text type="secondary">日期时间：</Text>
                    <Text strong>{datetime}</Text>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Text type="secondary">秒级：</Text>
                    <Space>
                      <Tag color="blue">{timestamp}</Tag>
                      <Button
                        type="link"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(timestamp, "秒级时间戳已复制")}
                      >
                        复制
                      </Button>
                    </Space>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Text type="secondary">毫秒级：</Text>
                    <Space>
                      <Tag color="cyan">{millisecondTimestamp}</Tag>
                      <Button
                        type="link"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(millisecondTimestamp, "毫秒级时间戳已复制")}
                      >
                        复制
                      </Button>
                    </Space>
                  </div>
                </Space>
              </div>
            )}
          </div>
        </Block>
    </Page>
  );
};

export default TimestampConverter;
