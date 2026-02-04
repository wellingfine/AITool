import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Typography, Space, Tag, Spin } from 'antd';
import { VerticalAlignMiddleOutlined } from '@ant-design/icons';
import Block from '../lib/Block';

const { Title, Text } = Typography;

// 农历数据 (1900-2100年)
const lunarInfo = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520
];

// 农历月份名称
const lunarMonthNames = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
// 农历日期名称
const lunarDayNames = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

// 天干地支
const tianGan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const diZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const animals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

// 中国节日 (农历)
const chineseLunarFestivals: Record<string, string> = {
  '1-1': '春节',
  '1-15': '元宵节',
  '2-2': '龙抬头',
  '5-5': '端午节',
  '7-7': '七夕节',
  '7-15': '中元节',
  '8-15': '中秋节',
  '9-9': '重阳节',
  '12-8': '腊八节',
  '12-23': '小年',
  '12-30': '除夕'
};

// 中国节日 (公历)
const chineseSolarFestivals: Record<string, string> = {
  '1-1': '元旦',
  '2-14': '情人节',
  '3-8': '妇女节',
  '3-12': '植树节',
  '4-1': '愚人节',
  '5-1': '劳动节',
  '5-4': '青年节',
  '6-1': '儿童节',
  '7-1': '建党节',
  '8-1': '建军节',
  '9-10': '教师节',
  '10-1': '国庆节',
  '10-31': '万圣节',
  '11-11': '光棍节',
  '12-24': '平安夜',
  '12-25': '圣诞节'
};

// 国际节日
const internationalFestivals: Record<string, string> = {
  '1-1': '新年',
  '2-14': '情人节',
  '3-8': '国际妇女节',
  '3-15': '消费者权益日',
  '3-21': '世界睡眠日',
  '3-22': '世界水日',
  '4-1': '愚人节',
  '4-22': '世界地球日',
  '4-23': '世界读书日',
  '5-1': '国际劳动节',
  '5-8': '世界红十字日',
  '5-12': '国际护士节',
  '5-15': '国际家庭日',
  '5-31': '世界无烟日',
  '6-1': '国际儿童节',
  '6-5': '世界环境日',
  '6-6': '全国爱眼日',
  '6-26': '国际禁毒日',
  '7-11': '世界人口日',
  '8-8': '全民健身日',
  '9-10': '世界预防自杀日',
  '10-4': '世界动物日',
  '10-16': '世界粮食日',
  '10-31': '万圣节',
  '11-9': '消防宣传日',
  '11-17': '国际学生日',
  '12-1': '世界艾滋病日',
  '12-3': '国际残疾人日',
  '12-25': '圣诞节'
};

// 计算农历年的总天数
function getLunarYearDays(year: number): number {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (lunarInfo[year - 1900] & i) ? 1 : 0;
  }
  return sum + getLeapDays(year);
}

// 获取闰月天数
function getLeapDays(year: number): number {
  if (getLeapMonth(year)) {
    return (lunarInfo[year - 1900] & 0x10000) ? 30 : 29;
  }
  return 0;
}

// 获取闰月是哪个月
function getLeapMonth(year: number): number {
  return lunarInfo[year - 1900] & 0xf;
}

// 获取某月的天数
function getMonthDays(year: number, month: number): number {
  return (lunarInfo[year - 1900] & (0x10000 >> month)) ? 30 : 29;
}

// 公历转农历
function solarToLunar(year: number, month: number, day: number) {
  const baseDate = new Date(1900, 0, 31);
  const targetDate = new Date(year, month - 1, day);
  let offset = Math.floor((targetDate.getTime() - baseDate.getTime()) / 86400000);
  
  let lunarYear = 1900;
  let temp = 0;
  
  for (let i = 1900; i < 2101 && offset > 0; i++) {
    temp = getLunarYearDays(i);
    offset -= temp;
    lunarYear++;
  }
  
  if (offset < 0) {
    offset += temp;
    lunarYear--;
  }
  
  const leap = getLeapMonth(lunarYear);
  let isLeap = false;
  let lunarMonth = 1;
  
  for (let i = 1; i < 13 && offset > 0; i++) {
    if (leap > 0 && i === (leap + 1) && !isLeap) {
      --i;
      isLeap = true;
      temp = getLeapDays(lunarYear);
    } else {
      temp = getMonthDays(lunarYear, i);
    }
    
    if (isLeap && i === (leap + 1)) {
      isLeap = false;
    }
    
    offset -= temp;
    if (!isLeap) {
      lunarMonth++;
    }
  }
  
  if (offset === 0 && leap > 0 && lunarMonth === leap + 1) {
    if (isLeap) {
      isLeap = false;
    } else {
      isLeap = true;
      --lunarMonth;
    }
  }
  
  if (offset < 0) {
    offset += temp;
    --lunarMonth;
  }
  
  const lunarDay = offset + 1;
  
  const ganIndex = (lunarYear - 4) % 10;
  const zhiIndex = (lunarYear - 4) % 12;
  const ganZhiYear = tianGan[ganIndex] + diZhi[zhiIndex];
  const animal = animals[zhiIndex];
  
  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeap,
    monthName: (isLeap ? '闰' : '') + lunarMonthNames[lunarMonth - 1] + '月',
    dayName: lunarDayNames[lunarDay - 1],
    ganZhiYear,
    animal
  };
}

// 星期名称 (周日在第一列)
const weekNames = ['日', '一', '二', '三', '四', '五', '六'];

interface DayInfo {
  day: number;
  year: number;
  month: number; // 1-12
  dateKey: string;
  lunar: ReturnType<typeof solarToLunar>;
  festivals: string[];
  isToday: boolean;
  isHoliday?: boolean;
  isWorkday?: boolean;
  holidayName?: string;
}

// 节假日数据类型
interface HolidayItem {
  date: string;
  name: string;
  isOffDay: boolean;
}

interface HolidayYearData {
  days: HolidayItem[];
}

// 缓存key
const HOLIDAY_CACHE_KEY = 'calendar_holiday_cache';
const CACHE_EXPIRE_TIME = 7 * 24 * 60 * 60 * 1000;

// 从缓存获取数据
function getHolidayFromCache(year: number): HolidayYearData | null {
  try {
    const cache = localStorage.getItem(HOLIDAY_CACHE_KEY);
    if (!cache) return null;
    
    const data = JSON.parse(cache);
    const yearData = data[year];
    
    if (yearData && yearData.expireAt > Date.now()) {
      return yearData.data;
    }
    return null;
  } catch {
    return null;
  }
}

// 保存数据到缓存
function saveHolidayToCache(year: number, data: HolidayYearData) {
  try {
    const cache = localStorage.getItem(HOLIDAY_CACHE_KEY);
    const cacheData = cache ? JSON.parse(cache) : {};
    
    cacheData[year] = {
      data,
      expireAt: Date.now() + CACHE_EXPIRE_TIME
    };
    
    localStorage.setItem(HOLIDAY_CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // 忽略存储错误
  }
}

// 从GitHub获取节假日数据
async function fetchHolidayData(year: number): Promise<HolidayYearData | null> {
  const cached = getHolidayFromCache(year);
  if (cached) return cached;
  
  try {
    const response = await fetch(
      `https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    saveHolidayToCache(year, data);
    
    return data;
  } catch {
    return null;
  }
}

// 生成日期数据
function createDayInfo(
  year: number, 
  month: number, 
  day: number, 
  holidays: Record<string, HolidayItem>,
  today: Date
): DayInfo {
  const lunar = solarToLunar(year, month, day);
  const festivals: string[] = [];
  
  const solarKey = `${month}-${day}`;
  const lunarKey = `${lunar.month}-${lunar.day}`;
  
  if (chineseSolarFestivals[solarKey]) festivals.push(chineseSolarFestivals[solarKey]);
  if (chineseLunarFestivals[lunarKey]) festivals.push(chineseLunarFestivals[lunarKey]);
  if (internationalFestivals[solarKey] && !festivals.includes(internationalFestivals[solarKey])) {
    festivals.push(internationalFestivals[solarKey]);
  }
  
  const isToday = 
    day === today.getDate() && 
    month - 1 === today.getMonth() && 
    year === today.getFullYear();
  
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const holiday = holidays[dateKey];
  
  return {
    day,
    year,
    month,
    dateKey,
    lunar,
    festivals,
    isToday,
    isHoliday: holiday?.isOffDay === true,
    isWorkday: holiday?.isOffDay === false,
    holidayName: holiday?.name
  };
}

// 生成一周的数据，从某个日期开始
function generateWeekData(
  startDate: Date,
  holidays: Record<string, HolidayItem>,
  today: Date
): DayInfo[] {
  const days: DayInfo[] = [];
  const date = new Date(startDate);
  
  for (let i = 0; i < 7; i++) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    days.push(createDayInfo(year, month, day, holidays, today));
    date.setDate(date.getDate() + 1);
  }
  
  return days;
}

// 获取某周的起始日期（周日）
function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  d.setDate(d.getDate() - dayOfWeek);
  d.setHours(0, 0, 0, 0);
  return d;
}

const Calendar: React.FC = () => {
  const today = new Date();
  
  const [weeks, setWeeks] = useState<DayInfo[][]>([]);
  const [holidayData, setHolidayData] = useState<Record<string, HolidayItem>>({});
  const [loading, setLoading] = useState(false);
  const [loadingYears, setLoadingYears] = useState<Set<number>>(new Set());
  const [hoveredMonth, setHoveredMonth] = useState<string>(`${today.getFullYear()}-${today.getMonth() + 1}`); // 初始高亮当前月
  const [displayMonth, setDisplayMonth] = useState<{ year: number; month: number }>({ year: today.getFullYear(), month: today.getMonth() + 1 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const todayRowRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<Date>(getWeekStartDate(today));
  const endDateRef = useRef<Date>(new Date(startDateRef.current));

  // 加载节假日数据
  const loadHolidayData = useCallback(async (years: number[]) => {
    const yearsToLoad = years.filter(y => !loadingYears.has(y) && !Object.keys(holidayData).some(k => k.startsWith(`${y}-`)));
    
    if (yearsToLoad.length === 0) return holidayData;
    
    setLoadingYears(prev => new Set([...prev, ...yearsToLoad]));
    setLoading(true);
    
    const newData: Record<string, HolidayItem> = { ...holidayData };
    
    await Promise.all(yearsToLoad.map(async (year) => {
      const data = await fetchHolidayData(year);
      if (data?.days) {
        data.days.forEach(item => {
          newData[item.date] = item;
        });
      }
    }));
    
    setHolidayData(newData);
    setLoading(false);
    setLoadingYears(prev => {
      const next = new Set(prev);
      yearsToLoad.forEach(y => next.delete(y));
      return next;
    });
    
    return newData;
  }, [holidayData, loadingYears]);

  // 初始化
  useEffect(() => {
    const init = async () => {
      const yearsToLoad = new Set<number>();
      yearsToLoad.add(today.getFullYear());
      if (today.getMonth() === 0) yearsToLoad.add(today.getFullYear() - 1);
      if (today.getMonth() === 11) yearsToLoad.add(today.getFullYear() + 1);
      
      const holidays = await loadHolidayData([...yearsToLoad]);
      
      // 初始加载前后各8周
      const initialWeeks: DayInfo[][] = [];
      const startDate = new Date(startDateRef.current);
      startDate.setDate(startDate.getDate() - 8 * 7);
      startDateRef.current = new Date(startDate);
      
      for (let i = 0; i < 17; i++) {
        initialWeeks.push(generateWeekData(startDate, holidays, today));
        startDate.setDate(startDate.getDate() + 7);
      }
      
      endDateRef.current = new Date(startDate);
      setWeeks(initialWeeks);
      
      // 初始化显示月份和高亮
      setDisplayMonth({ year: today.getFullYear(), month: today.getMonth() + 1 });
      setHoveredMonth(`${today.getFullYear()}-${today.getMonth() + 1}`);
      
      setTimeout(() => {
        todayRowRef.current?.scrollIntoView({ behavior: 'instant', block: 'center' });
      }, 300);
    };
    
    init();
  }, []);

  // 向上加载更多周
  const loadPrevWeeks = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    const startDate = new Date(startDateRef.current);
    const yearsToLoad = new Set<number>();
    
    // 计算需要加载的年份
    for (let i = 0; i < 8; i++) {
      startDate.setDate(startDate.getDate() - 7);
      yearsToLoad.add(startDate.getFullYear());
    }
    
    await loadHolidayData([...yearsToLoad]);
    
    const newWeeks: DayInfo[][] = [];
    startDate.setTime(startDateRef.current.getTime());
    
    for (let i = 0; i < 8; i++) {
      startDate.setDate(startDate.getDate() - 7);
      newWeeks.unshift(generateWeekData(startDate, holidayData, today));
    }
    
    startDateRef.current = new Date(startDate);
    
    const container = containerRef.current;
    const scrollHeightBefore = container?.scrollHeight || 0;
    
    setWeeks(prev => [...newWeeks, ...prev]);
    
    requestAnimationFrame(() => {
      if (container) {
        const scrollHeightAfter = container.scrollHeight;
        container.scrollTop += scrollHeightAfter - scrollHeightBefore;
      }
      isLoadingRef.current = false;
    });
  }, [holidayData, loadHolidayData]);

  // 向下加载更多周
  const loadNextWeeks = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    const endDate = new Date(endDateRef.current);
    const yearsToLoad = new Set<number>();
    
    for (let i = 0; i < 8; i++) {
      yearsToLoad.add(endDate.getFullYear());
      endDate.setDate(endDate.getDate() + 7);
    }
    
    await loadHolidayData([...yearsToLoad]);
    
    const newWeeks: DayInfo[][] = [];
    endDate.setTime(endDateRef.current.getTime());
    
    for (let i = 0; i < 8; i++) {
      newWeeks.push(generateWeekData(endDate, holidayData, today));
      endDate.setDate(endDate.getDate() + 7);
    }
    
    endDateRef.current = new Date(endDate);
    
    setWeeks(prev => [...prev, ...newWeeks]);
    isLoadingRef.current = false;
  }, [holidayData, loadHolidayData]);

  // 滚动监听
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    if (scrollTop < 300) {
      loadPrevWeeks();
    }
    
    if (scrollHeight - scrollTop - clientHeight < 300) {
      loadNextWeeks();
    }
  }, [loadPrevWeeks, loadNextWeeks]);

  // 回到今天
  const goToToday = useCallback(() => {
    todayRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const todayMonthKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
    setDisplayMonth({ year: today.getFullYear(), month: today.getMonth() + 1 });
    setHoveredMonth(todayMonthKey);
  }, []);

  // 更新周数据（当节假日数据更新时）
  useEffect(() => {
    if (Object.keys(holidayData).length === 0 || weeks.length === 0) return;
    
    setWeeks(prev => {
      const startDate = new Date(startDateRef.current);
      return prev.map(() => {
        const weekData = generateWeekData(startDate, holidayData, today);
        startDate.setDate(startDate.getDate() + 7);
        return weekData;
      });
    });
  }, [holidayData]);

  // 处理日期hover
  const handleDayHover = useCallback((dayInfo: DayInfo) => {
    const monthKey = `${dayInfo.year}-${dayInfo.month}`;
    setHoveredMonth(monthKey);
    setDisplayMonth({ year: dayInfo.year, month: dayInfo.month });
  }, []);

  // 渲染单个日期
  const renderDay = (dayInfo: DayInfo, weekIndex: number) => {
    const dayOfWeek = new Date(dayInfo.year, dayInfo.month - 1, dayInfo.day).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const hasFestival = dayInfo.festivals.length > 0;
    
    const currentMonthKey = `${dayInfo.year}-${dayInfo.month}`;
    const isHoveredMonth = hoveredMonth === currentMonthKey;
    const isDimmed = hoveredMonth !== null && !isHoveredMonth;
    
    return (
      <div
        key={dayInfo.dateKey}
        data-week={weekIndex}
        style={{
          padding: '6px 4px',
          textAlign: 'center',
          borderRadius: 4,
          cursor: 'pointer',
          backgroundColor: dayInfo.isToday ? '#1890ff' : undefined,
          transition: 'all 0.15s',
          position: 'relative',
          opacity: isDimmed ? 0.3 : 1
        }}
        onMouseEnter={() => handleDayHover(dayInfo)}
      >
        {(dayInfo.isHoliday || dayInfo.isWorkday) && (
          <div style={{
            position: 'absolute',
            top: 1,
            right: 1,
            fontSize: 9,
            padding: '0 2px',
            borderRadius: 2,
            backgroundColor: dayInfo.isHoliday ? '#52c41a' : '#fa8c16',
            color: '#fff',
            lineHeight: '12px'
          }}>
            {dayInfo.isHoliday ? '休' : '班'}
          </div>
        )}
        <div style={{ 
          fontSize: 16,
          fontWeight: dayInfo.isToday ? 600 : 400,
          color: dayInfo.isToday 
            ? '#fff' 
            : dayInfo.isHoliday
              ? '#52c41a'
              : dayInfo.isWorkday
                ? '#fa8c16'
                : isWeekend 
                  ? '#ff4d4f' 
                  : undefined
        }}>
          {dayInfo.day}
        </div>
        <div style={{ 
          fontSize: 10,
          color: dayInfo.isToday 
            ? 'rgba(255,255,255,0.85)' 
            : hasFestival 
              ? '#ff4d4f' 
              : '#8c8c8c',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {hasFestival 
            ? dayInfo.festivals[0] 
            : dayInfo.lunar.day === 1 
              ? dayInfo.lunar.monthName 
              : dayInfo.lunar.dayName}
        </div>
      </div>
    );
  };

  // 渲染一周
  const renderWeek = (weekDays: DayInfo[], weekIndex: number) => {
    const hasToday = weekDays.some(d => d.isToday);
    
    return (
      <div 
        key={weekDays[0].dateKey}
        ref={hasToday ? todayRowRef : undefined}
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2
        }}
      >
        {weekDays.map(dayInfo => renderDay(dayInfo, weekIndex))}
      </div>
    );
  };

  // 获取当前农历信息
  const currentLunarInfo = displayMonth 
    ? solarToLunar(displayMonth.year, displayMonth.month, 1) 
    : null;

  return (
    <div style={{ padding: '8px 0', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Block style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 固定头部 */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12
          }}>
            <Space>
              {displayMonth && (
                <Title level={4} style={{ margin: 0 }}>
                  {displayMonth.year}年{displayMonth.month}月
                </Title>
              )}
              {currentLunarInfo && (
                <Text type="secondary">
                  {currentLunarInfo.ganZhiYear}年 {currentLunarInfo.animal}年
                </Text>
              )}
              {loading && <Spin size="small" />}
            </Space>
            <Button icon={<VerticalAlignMiddleOutlined />} onClick={goToToday}>
              回到今天
            </Button>
          </div>

          {/* 星期标题 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid #f0f0f0',
            paddingBottom: 8
          }}>
            {weekNames.map((name, index) => (
              <div
                key={name}
                style={{
                  textAlign: 'center',
                  fontWeight: 500,
                  color: index === 0 || index === 6 ? '#ff4d4f' : undefined
                }}
              >
                {name}
              </div>
            ))}
          </div>
        </div>

        {/* 可滚动区域 */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          className="calendar-scroll-container"
        >
          <style>{`.calendar-scroll-container::-webkit-scrollbar { display: none; }`}</style>
          {weeks.map((weekDays, index) => renderWeek(weekDays, index))}
        </div>

        {/* 图例 */}
        <div style={{
          paddingTop: 12,
          borderTop: '1px solid #f0f0f0',
          marginTop: 12
        }}>
          <Space wrap size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>图例：</Text>
            <Tag color="green" style={{ fontSize: 11 }}>休</Tag>
            <Tag color="orange" style={{ fontSize: 11 }}>班</Tag>
            <Tag color="red" style={{ fontSize: 11 }}>节日</Tag>
          </Space>
        </div>
      </Block>
    </div>
  );
};

export default Calendar;
