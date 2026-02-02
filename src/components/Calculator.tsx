import React, { useState, useCallback, useEffect } from "react";
import {
  Button,
  Row,
  Col,
  theme,
  Typography,
  Segmented,
  Tooltip,
} from "antd";
import {
  DeleteOutlined,
} from "@ant-design/icons";
import Block from '../lib/Block';

const { Text } = Typography;

type CalculatorMode = "standard" | "scientific" | "programmer";

interface CalculatorProps {
  isActive?: boolean;
}

 type BaseType = "DEC" | "HEX" | "OCT" | "BIN";

const Calculator: React.FC<CalculatorProps> = ({ isActive = true }) => {
  const [mode, setMode] = useState<CalculatorMode>("standard");
  const [display, setDisplay] = useState<string>("0");
  const [prevValue, setPrevValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [history, setHistory] = useState<string>("");
  const [memory, setMemory] = useState<number>(0);
  const [isMemoryVisible, setIsMemoryVisible] = useState<boolean>(false);

  const [currentBase, setCurrentBase] = useState<BaseType>("DEC");
  const [baseValues, setBaseValues] = useState<Record<BaseType, string>>({
    DEC: "0",
    HEX: "0",
    OCT: "0",
    BIN: "0",
  });
  const [bitWidth, setBitWidth] = useState<number>(64);

  const { token } = theme.useToken();

  // 进制转换
  const convertBase = useCallback((value: string, from: BaseType, to: BaseType): string => {
    if (value === "" || value === "Error") return "0";
    try {
      let decimal: number;
      switch (from) {
        case "HEX":
          decimal = parseInt(value, 16);
          break;
        case "OCT":
          decimal = parseInt(value, 8);
          break;
        case "BIN":
          decimal = parseInt(value, 2);
          break;
        case "DEC":
        default:
          decimal = parseInt(value, 10);
          break;
      }
      if (isNaN(decimal)) return "0";
      // 处理有符号数
      const maxVal = Math.pow(2, bitWidth);
      const halfVal = Math.pow(2, bitWidth - 1);
      if (decimal >= halfVal) {
        decimal = decimal - maxVal;
      }

      switch (to) {
        case "HEX":
          return (decimal >>> 0).toString(16).toUpperCase().slice(-bitWidth / 4);
        case "OCT":
          return (decimal >>> 0).toString(8);
        case "BIN":
          return (decimal >>> 0).toString(2).padStart(bitWidth, '0').slice(-bitWidth);
        case "DEC":
        default:
          return decimal.toString(10);
      }
    } catch {
      return "0";
    }
  }, [bitWidth]);

  const updateBaseValues = useCallback((value: string, base: BaseType) => {
    const newValues: Record<BaseType, string> = {
      DEC: convertBase(value, base, "DEC"),
      HEX: convertBase(value, base, "HEX"),
      OCT: convertBase(value, base, "OCT"),
      BIN: convertBase(value, base, "BIN"),
    };
    setBaseValues(newValues);
    if (base === "DEC") {
      setDisplay(newValues.DEC);
    } else {
      setDisplay(value);
    }
  }, [convertBase]);

  const calculate = useCallback(
    (left: number, right: number, op: string): number => {
      switch (op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "×":
          return left * right;
        case "÷":
          return right !== 0 ? left / right : NaN;
        case "%":
          return right !== 0 ? left % right : NaN;
        case "^":
          return Math.pow(left, right);
        case "and":
          return (left & right) >>> 0;
        case "or":
          return (left | right) >>> 0;
        case "xor":
          return (left ^ right) >>> 0;
        case "shl":
          return (left << right) >>> 0;
        case "shr":
          return (left >>> right) >>> 0;
        default:
          return right;
      }
    },
    []
  );

  const handleNumber = useCallback(
    (num: string) => {
      if (waitingForOperand) {
        if (mode === "programmer") {
          updateBaseValues(num, currentBase);
        } else {
          setDisplay(num);
        }
        setWaitingForOperand(false);
      } else {
        const currentDisplay = mode === "programmer" ? baseValues[currentBase] : display;
        const newValue = currentDisplay === "0" ? num : currentDisplay + num;
        if (mode === "programmer") {
          updateBaseValues(newValue, currentBase);
        } else {
          setDisplay(newValue);
        }
      }
    },
    [display, waitingForOperand, mode, currentBase, baseValues, updateBaseValues]
  );

  const handleDecimal = useCallback(() => {
    if (mode === "programmer") return;
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  }, [display, waitingForOperand, mode]);

  const handleHexChar = useCallback(
    (char: string) => {
      if (mode !== "programmer" || currentBase !== "HEX") return;
      handleNumber(char);
    },
    [mode, currentBase, handleNumber]
  );

  const handleOperator = useCallback(
    (op: string) => {
      const currentValue = parseFloat(mode === "programmer" ? baseValues.DEC : display);

      if (prevValue === null) {
        setPrevValue(mode === "programmer" ? baseValues.DEC : display);
      } else if (operator && !waitingForOperand) {
        const result = calculate(parseFloat(prevValue), currentValue, operator);
        const resultStr = result.toString();
        setPrevValue(resultStr);
        if (mode === "programmer") {
          updateBaseValues(resultStr, "DEC");
        } else {
          setDisplay(resultStr);
        }
      }

      setOperator(op);
      setWaitingForOperand(true);
      setHistory(`${prevValue || (mode === "programmer" ? baseValues.DEC : display)} ${op}`);
    },
    [display, prevValue, operator, waitingForOperand, calculate, mode, baseValues, updateBaseValues]
  );

  const handleEqual = useCallback(() => {
    if (!operator || prevValue === null) return;

    const currentValue = parseFloat(mode === "programmer" ? baseValues.DEC : display);
    const result = calculate(parseFloat(prevValue), currentValue, operator);

    setHistory(`${prevValue} ${operator} ${currentValue} =`);

    if (mode === "programmer") {
      updateBaseValues(result.toString(), "DEC");
    } else {
      setDisplay(result.toString());
    }

    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }, [display, operator, prevValue, calculate, mode, baseValues, updateBaseValues]);

  const handleClear = useCallback(() => {
    setDisplay("0");
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setHistory("");
    if (mode === "programmer") {
      setBaseValues({ DEC: "0", HEX: "0", OCT: "0", BIN: "0" });
    }
  }, [mode]);

  const handleBackspace = useCallback(() => {
    if (waitingForOperand) return;
    const currentDisplay = mode === "programmer" ? baseValues[currentBase] : display;
    if (currentDisplay.length === 1 || (currentDisplay.length === 2 && currentDisplay[0] === "-")) {
      if (mode === "programmer") {
        updateBaseValues("0", currentBase);
      } else {
        setDisplay("0");
      }
    } else {
      const newValue = currentDisplay.slice(0, -1);
      if (mode === "programmer") {
        updateBaseValues(newValue, currentBase);
      } else {
        setDisplay(newValue);
      }
    }
  }, [display, waitingForOperand, mode, currentBase, baseValues, updateBaseValues]);

  const handleNegate = useCallback(() => {
    const currentDisplay = mode === "programmer" ? baseValues.DEC : display;
    const currentValue = parseFloat(currentDisplay);
    if (currentValue !== 0) {
      const newValue = (-currentValue).toString();
      if (mode === "programmer") {
        updateBaseValues(newValue, "DEC");
      } else {
        setDisplay(newValue);
      }
    }
  }, [display, mode, baseValues, updateBaseValues]);

  // 科学计算函数
  const handleScientific = useCallback(
    (func: string) => {
      const value = parseFloat(display);
      let result = 0;

      switch (func) {
        case "sin":
          result = Math.sin(value);
          break;
        case "cos":
          result = Math.cos(value);
          break;
        case "tan":
          result = Math.tan(value);
          break;
        case "asin":
          result = Math.asin(value);
          break;
        case "acos":
          result = Math.acos(value);
          break;
        case "atan":
          result = Math.atan(value);
          break;
        case "log":
          result = Math.log10(value);
          break;
        case "ln":
          result = Math.log(value);
          break;
        case "sqrt":
          result = Math.sqrt(value);
          break;
        case "cbrt":
          result = Math.cbrt(value);
          break;
        case "square":
          result = value * value;
          break;
        case "cube":
          result = value * value * value;
          break;
        case "10^x":
          result = Math.pow(10, value);
          break;
        case "e^x":
          result = Math.exp(value);
          break;
        case "1/x":
          result = 1 / value;
          break;
        case "n!":
          result = factorial(value);
          break;
        case "pi":
          result = Math.PI;
          break;
        case "e":
          result = Math.E;
          break;
        case "abs":
          result = Math.abs(value);
          break;
        case "floor":
          result = Math.floor(value);
          break;
        case "ceil":
          result = Math.ceil(value);
          break;
        case "round":
          result = Math.round(value);
          break;
        default:
          return;
      }

      setHistory(`${func}(${display})`);
      setDisplay(result.toString());
      setWaitingForOperand(true);
    },
    [display]
  );

  const factorial = (n: number): number => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  };

  // 内存操作
  const handleMemory = useCallback(
    (action: string) => {
      const value = parseFloat(display) || 0;
      switch (action) {
        case "MC":
          setMemory(0);
          setIsMemoryVisible(false);
          break;
        case "MR":
          setDisplay(memory.toString());
          setWaitingForOperand(true);
          break;
        case "MS":
          setMemory(value);
          setIsMemoryVisible(true);
          break;
        case "M+":
          setMemory((m) => m + value);
          setIsMemoryVisible(true);
          break;
        case "M-":
          setMemory((m) => m - value);
          setIsMemoryVisible(true);
          break;
      }
    },
    [display, memory]
  );

  // 切换进制
  const switchBase = useCallback(
    (base: BaseType) => {
      setCurrentBase(base);
      setDisplay(baseValues[base]);
    },
    [baseValues]
  );

  const handleBitwise = useCallback(
    (op: string) => {
      handleOperator(op);
    },
    [handleOperator]
  );

  const handleNot = useCallback(() => {
    const value = parseInt(baseValues.DEC, 10);
    const result = (~value) >>> 0;
    updateBaseValues(result.toString(), "DEC");
    setWaitingForOperand(true);
  }, [baseValues, updateBaseValues]);

  // 位编辑：切换某一位
  const toggleBit = useCallback((bitIndex: number) => {
    const value = parseInt(baseValues.BIN, 2);
    const mask = 1 << bitIndex;
    const newValue = (value ^ mask) >>> 0;
    updateBaseValues(newValue.toString(2), "BIN");
  }, [baseValues, updateBaseValues]);

  // 键盘支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;

      const key = e.key;

      if (/^[0-9]$/.test(key)) {
        if (mode === "programmer") {
          const maxDigit = currentBase === "BIN" ? 1 : currentBase === "OCT" ? 7 : 9;
          if (parseInt(key) <= maxDigit) {
            handleNumber(key);
          }
        } else {
          handleNumber(key);
        }
      } else if (key >= "a" && key <= "f" && mode === "programmer" && currentBase === "HEX") {
        handleHexChar(key.toUpperCase());
      } else if (key >= "A" && key <= "F" && mode === "programmer" && currentBase === "HEX") {
        handleHexChar(key);
      } else if (key === ".") {
        handleDecimal();
      } else if (key === "+") {
        handleOperator("+");
      } else if (key === "-") {
        handleOperator("-");
      } else if (key === "*") {
        handleOperator("×");
      } else if (key === "/") {
        e.preventDefault();
        handleOperator("÷");
      } else if (key === "%" && mode !== "programmer") {
        handleOperator("%");
      } else if (key === "^" && mode === "scientific") {
        handleOperator("^");
      } else if (key === "Enter" || key === "=") {
        handleEqual();
      } else if (key === "Escape" || key === "c" || key === "C") {
        handleClear();
      } else if (key === "Backspace") {
        handleBackspace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isActive,
    handleNumber,
    handleHexChar,
    handleDecimal,
    handleOperator,
    handleEqual,
    handleClear,
    handleBackspace,
    mode,
    currentBase,
  ]);

  const btnStyle = {
    height: 44,
    fontSize: 15,
    fontWeight: 500,
    padding: "0 4px",
  };

  const operatorBtnStyle = {
    ...btnStyle,
    background: token.colorPrimary,
    color: "#fff",
    borderColor: token.colorPrimary,
  };

  const secondaryBtnStyle = {
    ...btnStyle,
    background: token.colorFillSecondary,
    borderColor: token.colorFillSecondary,
  };

  const scientificBtnStyle = {
    ...btnStyle,
    fontSize: 13,
    padding: "0 2px",
  };

  const memoryBtnStyle = {
    height: 32,
    fontSize: 12,
    padding: "0 4px",
  };

  // 标准模式 - 传统计算器布局
  const renderStandardButtons = () => (
    <Row gutter={[6, 6]}>
      <Col span={6}>
        <Tooltip title="清空 (Esc)"><Button block style={secondaryBtnStyle} onClick={handleClear}>CE</Button></Tooltip>
      </Col>
      <Col span={6}>
        <Tooltip title="清空 (Esc)"><Button block style={secondaryBtnStyle} onClick={handleClear}>C</Button></Tooltip>
      </Col>
      <Col span={6}>
        <Tooltip title="退格"><Button block style={secondaryBtnStyle} onClick={handleBackspace} icon={<DeleteOutlined />} /></Tooltip>
      </Col>
      <Col span={6}>
        <Tooltip title="除以"><Button block style={operator === "÷" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("÷")}>÷</Button></Tooltip>
      </Col>

      <Col span={6}><Tooltip title="数字 7"><Button block style={btnStyle} onClick={() => handleNumber("7")}>7</Button></Tooltip></Col>
      <Col span={6}><Tooltip title="数字 8"><Button block style={btnStyle} onClick={() => handleNumber("8")}>8</Button></Tooltip></Col>
      <Col span={6}><Tooltip title="数字 9"><Button block style={btnStyle} onClick={() => handleNumber("9")}>9</Button></Tooltip></Col>
      <Col span={6}>
        <Tooltip title="乘以"><Button block style={operator === "×" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("×")}>×</Button></Tooltip>
      </Col>

      <Col span={6}><Tooltip title="数字 4"><Button block style={btnStyle} onClick={() => handleNumber("4")}>4</Button></Tooltip></Col>
      <Col span={6}><Tooltip title="数字 5"><Button block style={btnStyle} onClick={() => handleNumber("5")}>5</Button></Tooltip></Col>
      <Col span={6}><Tooltip title="数字 6"><Button block style={btnStyle} onClick={() => handleNumber("6")}>6</Button></Tooltip></Col>
      <Col span={6}>
        <Tooltip title="减去"><Button block style={operator === "-" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("-")}>-</Button></Tooltip>
      </Col>

      <Col span={6}><Tooltip title="数字 1"><Button block style={btnStyle} onClick={() => handleNumber("1")}>1</Button></Tooltip></Col>
      <Col span={6}><Tooltip title="数字 2"><Button block style={btnStyle} onClick={() => handleNumber("2")}>2</Button></Tooltip></Col>
      <Col span={6}><Tooltip title="数字 3"><Button block style={btnStyle} onClick={() => handleNumber("3")}>3</Button></Tooltip></Col>
      <Col span={6}>
        <Tooltip title="加上"><Button block style={operator === "+" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("+")}>+</Button></Tooltip>
      </Col>

      <Col span={6}><Tooltip title="正负号"><Button block style={btnStyle} onClick={handleNegate}>+/-</Button></Tooltip></Col>
      <Col span={6}><Tooltip title="数字 0"><Button block style={btnStyle} onClick={() => handleNumber("0")}>0</Button></Tooltip></Col>
      <Col span={6}><Tooltip title="小数点"><Button block style={btnStyle} onClick={handleDecimal}>.</Button></Tooltip></Col>
      <Col span={6}>
        <Tooltip title="等于 (Enter)">
          <Button block type="primary" style={{ ...btnStyle, fontSize: 18, fontWeight: 600 }} onClick={handleEqual}>=</Button>
        </Tooltip>
      </Col>
    </Row>
  );

  // 科学模式 - 函数键横向，数字键竖排
  const renderScientificButtons = () => (
    <>
      {/* 内存按钮 */}
      <Row gutter={[6, 6]} style={{ marginBottom: 8 }}>
        {[
          { key: "MC", tip: "清除内存" },
          { key: "MR", tip: "读取内存" },
          { key: "MS", tip: "存入内存" },
          { key: "M+", tip: "内存加" },
          { key: "M-", tip: "内存减" },
        ].map((m) => (
          <Col span={4} key={m.key}>
            <Tooltip title={m.tip}>
              <Button
                block
                style={{
                  ...memoryBtnStyle,
                  opacity: (m.key === "MC" || m.key === "MR") && !isMemoryVisible ? 0.5 : 1,
                }}
                onClick={() => handleMemory(m.key)}
                disabled={(m.key === "MC" || m.key === "MR") && !isMemoryVisible}
              >
                {m.key}
              </Button>
            </Tooltip>
          </Col>
        ))}
        <Col span={4}>
          {isMemoryVisible && (
            <Text type="secondary" style={{ fontSize: 11 }}>M={memory.toExponential(1)}</Text>
          )}
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        {/* 左侧 - 科学函数键 */}
        <Col span={12}>
          {/* 第一行 - 三角函数 */}
          <Row gutter={[6, 6]} style={{ marginBottom: 6 }}>
            <Col span={6}><Tooltip title="正弦"><Button block style={scientificBtnStyle} onClick={() => handleScientific("sin")}>sin</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="余弦"><Button block style={scientificBtnStyle} onClick={() => handleScientific("cos")}>cos</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="正切"><Button block style={scientificBtnStyle} onClick={() => handleScientific("tan")}>tan</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="反正弦"><Button block style={scientificBtnStyle} onClick={() => handleScientific("asin")}>sin⁻¹</Button></Tooltip></Col>
          </Row>
          <Row gutter={[6, 6]} style={{ marginBottom: 6 }}>
            <Col span={6}><Tooltip title="反余弦"><Button block style={scientificBtnStyle} onClick={() => handleScientific("acos")}>cos⁻¹</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="反正切"><Button block style={scientificBtnStyle} onClick={() => handleScientific("atan")}>tan⁻¹</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="清空"><Button block style={secondaryBtnStyle} onClick={handleClear}>C</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="除以"><Button block style={operator === "÷" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("÷")}>÷</Button></Tooltip></Col>
          </Row>

          {/* 第二行 - 对数和幂 */}
          <Row gutter={[6, 6]} style={{ marginBottom: 6 }}>
            <Col span={6}><Tooltip title="平方根"><Button block style={scientificBtnStyle} onClick={() => handleScientific("sqrt")}>√</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="自然对数"><Button block style={scientificBtnStyle} onClick={() => handleScientific("ln")}>ln</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="常用对数"><Button block style={scientificBtnStyle} onClick={() => handleScientific("log")}>log</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="退格"><Button block style={secondaryBtnStyle} onClick={handleBackspace} icon={<DeleteOutlined />} /></Tooltip></Col>
          </Row>
          <Row gutter={[6, 6]} style={{ marginBottom: 6 }}>
            <Col span={6}><Tooltip title="平方"><Button block style={scientificBtnStyle} onClick={() => handleScientific("square")}>x²</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="立方"><Button block style={scientificBtnStyle} onClick={() => handleScientific("cube")}>x³</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="乘以"><Button block style={operator === "×" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("×")}>×</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="减去"><Button block style={operator === "-" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("-")}>-</Button></Tooltip></Col>
          </Row>

          {/* 第三行 - 其他函数 */}
          <Row gutter={[6, 6]} style={{ marginBottom: 6 }}>
            <Col span={6}><Tooltip title="立方根"><Button block style={scientificBtnStyle} onClick={() => handleScientific("cbrt")}>∛</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="10的幂"><Button block style={scientificBtnStyle} onClick={() => handleScientific("10^x")}>10ˣ</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="e的幂"><Button block style={scientificBtnStyle} onClick={() => handleScientific("e^x")}>eˣ</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="幂运算"><Button block style={scientificBtnStyle} onClick={() => handleOperator("^")}>xʸ</Button></Tooltip></Col>
          </Row>
          <Row gutter={[6, 6]} style={{ marginBottom: 6 }}>
            <Col span={6}><Tooltip title="倒数"><Button block style={scientificBtnStyle} onClick={() => handleScientific("1/x")}>1/x</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="阶乘"><Button block style={scientificBtnStyle} onClick={() => handleScientific("n!")}>n!</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="加上"><Button block style={operator === "+" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("+")}>+</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="等于"><Button block type="primary" style={{ ...btnStyle, fontWeight: 600 }} onClick={handleEqual}>=</Button></Tooltip></Col>
          </Row>

          {/* 第四行 */}
          <Row gutter={[6, 6]}>
            <Col span={6}><Tooltip title="绝对值"><Button block style={scientificBtnStyle} onClick={() => handleScientific("abs")}>|x|</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="正负号"><Button block style={btnStyle} onClick={handleNegate}>+/-</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="取模"><Button block style={scientificBtnStyle} onClick={() => handleOperator("%")}>%</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="向下取整"><Button block style={scientificBtnStyle} onClick={() => handleScientific("floor")}>⌊x⌋</Button></Tooltip></Col>
          </Row>
          <Row gutter={[6, 6]}>
            <Col span={6}><Tooltip title="向上取整"><Button block style={scientificBtnStyle} onClick={() => handleScientific("ceil")}>⌈x⌉</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="四舍五入"><Button block style={scientificBtnStyle} onClick={() => handleScientific("round")}>rnd</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="圆周率"><Button block style={scientificBtnStyle} onClick={() => handleScientific("pi")}>π</Button></Tooltip></Col>
            <Col span={6}><Tooltip title="自然常数"><Button block style={scientificBtnStyle} onClick={() => handleScientific("e")}>e</Button></Tooltip></Col>
          </Row>
        </Col>

        {/* 右侧 - 数字键盘（传统布局） */}
        <Col span={12}>
          {/* 常用功能键 */}
          <Row gutter={[6, 6]} style={{ marginBottom: 6 }}>
            <Col span={8}><Tooltip title="清空"><Button block style={secondaryBtnStyle} onClick={handleClear}>CE</Button></Tooltip></Col>
            <Col span={8}><Tooltip title="退格"><Button block style={secondaryBtnStyle} onClick={handleBackspace} icon={<DeleteOutlined />} /></Tooltip></Col>
            <Col span={8}><Tooltip title="除以"><Button block style={operator === "÷" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("÷")}>÷</Button></Tooltip></Col>
          </Row>

          {/* 数字键 */}
          <Row gutter={[6, 6]} style={{ marginBottom: 6 }}>
            <Col span={8}><Tooltip title="数字 7"><Button block style={btnStyle} onClick={() => handleNumber("7")}>7</Button></Tooltip></Col>
            <Col span={8}><Tooltip title="数字 8"><Button block style={btnStyle} onClick={() => handleNumber("8")}>8</Button></Tooltip></Col>
            <Col span={8}><Tooltip title="数字 9"><Button block style={btnStyle} onClick={() => handleNumber("9")}>9</Button></Tooltip></Col>
            <Col span={8}><Tooltip title="乘以"><Button block style={operator === "×" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("×")}>×</Button></Tooltip></Col>
          </Row>
          <Row gutter={[6, 6]} style={{ marginBottom: 6 }}>
            <Col span={8}><Tooltip title="数字 4"><Button block style={btnStyle} onClick={() => handleNumber("4")}>4</Button></Tooltip></Col>
            <Col span={8}><Tooltip title="数字 5"><Button block style={btnStyle} onClick={() => handleNumber("5")}>5</Button></Tooltip></Col>
            <Col span={8}><Tooltip title="数字 6"><Button block style={btnStyle} onClick={() => handleNumber("6")}>6</Button></Tooltip></Col>
            <Col span={8}><Tooltip title="减去"><Button block style={operator === "-" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("-")}>-</Button></Tooltip></Col>
          </Row>
          <Row gutter={[6, 6]} style={{ marginBottom: 6 }}>
            <Col span={8}><Tooltip title="数字 1"><Button block style={btnStyle} onClick={() => handleNumber("1")}>1</Button></Tooltip></Col>
            <Col span={8}><Tooltip title="数字 2"><Button block style={btnStyle} onClick={() => handleNumber("2")}>2</Button></Tooltip></Col>
            <Col span={8}><Tooltip title="数字 3"><Button block style={btnStyle} onClick={() => handleNumber("3")}>3</Button></Tooltip></Col>
            <Col span={8}><Tooltip title="加上"><Button block style={operator === "+" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("+")}>+</Button></Tooltip></Col>
          </Row>
          <Row gutter={[6, 6]}>
            <Col span={8}><Tooltip title="正负号"><Button block style={btnStyle} onClick={handleNegate}>+/-</Button></Tooltip></Col>
            <Col span={16}><Tooltip title="数字 0"><Button block style={btnStyle} onClick={() => handleNumber("0")}>0</Button></Tooltip></Col>
            <Col span={8}><Tooltip title="小数点"><Button block style={btnStyle} onClick={handleDecimal}>.</Button></Tooltip></Col>
            <Col span={8}><Tooltip title="等于"><Button block type="primary" style={{ ...btnStyle, fontSize: 18, fontWeight: 600 }} onClick={handleEqual}>=</Button></Tooltip></Col>
          </Row>
        </Col>
      </Row>
    </>
  );

  // 程序员模式 - 位编辑 + 横向布局
  const renderProgrammerButtons = () => {
    const isHex = currentBase === "HEX";
    const isBin = currentBase === "BIN";
    const isOct = currentBase === "OCT";
    const binaryStr = baseValues.BIN.padStart(bitWidth, '0');

    // 位编辑 - 按字节分组显示
    const renderBitEditor = () => {
      const bitsPerRow = bitWidth <= 16 ? 16 : 32;
      const rows = bitWidth <= 16 ? 1 : 2;
      const bits: React.ReactNode[] = [];

      for (let row = 0; row < rows; row++) {
        const rowBits: React.ReactNode[] = [];
        for (let i = 0; i < bitsPerRow; i++) {
          const position = row * bitsPerRow + i;
          const bitIndex = bitWidth - 1 - position;
          if (bitIndex < 0) break;
          // 二进制字符串是从右到左的，最右边是第0位
          const bitValue = binaryStr[bitWidth - 1 - bitIndex] || "0";
          const isByteBoundary = (bitIndex + 1) % 8 === 0 && bitIndex !== bitWidth - 1;

          rowBits.push(
            <Tooltip key={bitIndex} title={`位 ${bitIndex}`}>
              <span
                onClick={() => toggleBit(bitIndex)}
                style={{
                  display: "inline-block",
                  width: 18,
                  height: 22,
                  lineHeight: "22px",
                  textAlign: "center",
                  fontSize: 12,
                  fontFamily: "monospace",
                  cursor: "pointer",
                  background: bitValue === "1" ? token.colorPrimary : token.colorFillSecondary,
                  color: bitValue === "1" ? "#fff" : token.colorText,
                  borderRadius: 2,
                  marginRight: isByteBoundary ? 4 : 1,
                  marginBottom: 2,
                }}
              >
                {bitValue}
              </span>
            </Tooltip>
          );
        }
        bits.push(
          <div key={row} style={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
            {rowBits}
          </div>
        );
      }
      return bits;
    };

    return (
      <>
        {/* 位编辑器 */}
        <div
          style={{
            background: token.colorFillAlter,
            borderRadius: token.borderRadius,
            padding: "8px",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>位编辑器 (点击切换)</Text>
            <Segmented
              value={bitWidth}
              onChange={(v) => setBitWidth(v as number)}
              options={[
                { label: "64", value: 64 },
                { label: "32", value: 32 },
                { label: "16", value: 16 },
                { label: "8", value: 8 },
              ]}
              size="small"
            />
          </div>
          {renderBitEditor()}
        </div>

        {/* 进制显示 */}
        <Row gutter={[6, 6]} style={{ marginBottom: 8 }}>
          {([
            { base: "HEX" as BaseType, label: "HEX", tip: "十六进制" },
            { base: "DEC" as BaseType, label: "DEC", tip: "十进制" },
            { base: "OCT" as BaseType, label: "OCT", tip: "八进制" },
            { base: "BIN" as BaseType, label: "BIN", tip: "二进制" },
          ]).map(({ base, label, tip }) => (
            <Col span={6} key={base}>
              <Tooltip title={`切换到${tip}`}>
                <Button
                  block
                  style={{
                    height: 44,
                    background: currentBase === base ? token.colorPrimary : token.colorFillSecondary,
                    color: currentBase === base ? "#fff" : token.colorText,
                    borderColor: currentBase === base ? token.colorPrimary : token.colorFillSecondary,
                    textAlign: "left",
                    padding: "4px 8px",
                  }}
                  onClick={() => switchBase(base)}
                >
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
                  <div style={{ fontSize: 13, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {baseValues[base]}
                  </div>
                </Button>
              </Tooltip>
            </Col>
          ))}
        </Row>

        <Row gutter={[6, 6]}>
          {/* 位运算 */}
          <Col span={4}>
            <Tooltip title="按位非"><Button block style={secondaryBtnStyle} onClick={handleNot}>NOT</Button></Tooltip>
          </Col>
          <Col span={4}>
            <Tooltip title="按位与"><Button block style={operator === "and" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleBitwise("and")}>AND</Button></Tooltip>
          </Col>
          <Col span={4}>
            <Tooltip title="按位或"><Button block style={operator === "or" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleBitwise("or")}>OR</Button></Tooltip>
          </Col>
          <Col span={4}>
            <Tooltip title="按位异或"><Button block style={operator === "xor" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleBitwise("xor")}>XOR</Button></Tooltip>
          </Col>
          <Col span={4}>
            <Tooltip title="左移"><Button block style={operator === "shl" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleBitwise("shl")}>Lsh</Button></Tooltip>
          </Col>
          <Col span={4}>
            <Tooltip title="右移"><Button block style={operator === "shr" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleBitwise("shr")}>Rsh</Button></Tooltip>
          </Col>

          {/* 控制键 */}
          <Col span={3}><Tooltip title="清空"><Button block style={secondaryBtnStyle} onClick={handleClear}>CE</Button></Tooltip></Col>
          <Col span={3}><Tooltip title="退格"><Button block style={secondaryBtnStyle} onClick={handleBackspace} icon={<DeleteOutlined />} /></Tooltip></Col>
          <Col span={3}><Tooltip title="除以"><Button block style={operator === "÷" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("÷")}>÷</Button></Tooltip></Col>
          <Col span={3}><Tooltip title="乘以"><Button block style={operator === "×" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("×")}>×</Button></Tooltip></Col>
          <Col span={3}><Tooltip title="减去"><Button block style={operator === "-" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("-")}>-</Button></Tooltip></Col>
          <Col span={3}><Tooltip title="加上"><Button block style={operator === "+" ? operatorBtnStyle : secondaryBtnStyle} onClick={() => handleOperator("+")}>+</Button></Tooltip></Col>
          <Col span={3}><Tooltip title="等于"><Button block type="primary" style={{ ...btnStyle, fontWeight: 600 }} onClick={handleEqual}>=</Button></Tooltip></Col>
          <Col span={3}><Tooltip title="正负号"><Button block style={btnStyle} onClick={handleNegate}>+/-</Button></Tooltip></Col>

          {/* 十六进制字母 */}
          {["A", "B", "C", "D", "E", "F"].map((char) => (
            <Col span={2} key={char}>
              <Tooltip title={`十六进制 ${char}`}>
                <Button
                  block
                  style={{
                    ...btnStyle,
                    fontSize: 13,
                    opacity: isHex ? 1 : 0.3,
                  }}
                  onClick={() => handleHexChar(char)}
                  disabled={!isHex}
                >
                  {char}
                </Button>
              </Tooltip>
            </Col>
          ))}
          <Col span={4}>
            <Tooltip title="取模"><Button block style={secondaryBtnStyle} onClick={() => handleOperator("%")}>%</Button></Tooltip>
          </Col>
          <Col span={4}>
            <Tooltip title="左移"><Button block style={secondaryBtnStyle} onClick={() => handleBitwise("shl")}>Lsh</Button></Tooltip>
          </Col>
          <Col span={4}>
            <Tooltip title="右移"><Button block style={secondaryBtnStyle} onClick={() => handleBitwise("shr")}>Rsh</Button></Tooltip>
          </Col>

          {/* 数字 */}
          <Col span={3}>
            <Tooltip title="数字 7"><Button block style={{ ...btnStyle, opacity: isBin ? 0.3 : 1 }} onClick={() => handleNumber("7")} disabled={isBin}>7</Button></Tooltip>
          </Col>
          <Col span={3}>
            <Tooltip title="数字 8"><Button block style={{ ...btnStyle, opacity: isBin || isOct ? 0.3 : 1 }} onClick={() => handleNumber("8")} disabled={isBin || isOct}>8</Button></Tooltip>
          </Col>
          <Col span={3}>
            <Tooltip title="数字 9"><Button block style={{ ...btnStyle, opacity: isBin || isOct ? 0.3 : 1 }} onClick={() => handleNumber("9")} disabled={isBin || isOct}>9</Button></Tooltip>
          </Col>
          <Col span={3}>
            <Tooltip title="数字 4"><Button block style={{ ...btnStyle, opacity: isBin ? 0.3 : 1 }} onClick={() => handleNumber("4")} disabled={isBin}>4</Button></Tooltip>
          </Col>
          <Col span={3}>
            <Tooltip title="数字 5"><Button block style={{ ...btnStyle, opacity: isBin ? 0.3 : 1 }} onClick={() => handleNumber("5")} disabled={isBin}>5</Button></Tooltip>
          </Col>
          <Col span={3}>
            <Tooltip title="数字 6"><Button block style={{ ...btnStyle, opacity: isBin ? 0.3 : 1 }} onClick={() => handleNumber("6")} disabled={isBin}>6</Button></Tooltip>
          </Col>
          <Col span={3}>
            <Tooltip title="数字 1"><Button block style={btnStyle} onClick={() => handleNumber("1")}>1</Button></Tooltip>
          </Col>
          <Col span={3}>
            <Tooltip title="数字 2"><Button block style={{ ...btnStyle, opacity: isBin ? 0.3 : 1 }} onClick={() => handleNumber("2")} disabled={isBin}>2</Button></Tooltip>
          </Col>

          <Col span={3}><Tooltip title="数字 3"><Button block style={{ ...btnStyle, opacity: isBin ? 0.3 : 1 }} onClick={() => handleNumber("3")} disabled={isBin}>3</Button></Tooltip></Col>
          <Col span={3}><Tooltip title="数字 0"><Button block style={btnStyle} onClick={() => handleNumber("0")}>0</Button></Tooltip></Col>
          <Col span={6}><Tooltip title="等于"><Button block type="primary" style={{ ...btnStyle, fontWeight: 600 }} onClick={handleEqual}>=</Button></Tooltip></Col>
        </Row>
      </>
    );
  };

  const getCurrentDisplay = () => {
    if (mode === "programmer") {
      return baseValues[currentBase];
    }
    return display;
  };

  return (
    <div style={{ padding: '8px 0', maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Block>
          {/* 模式切换 */}
          <div style={{ marginBottom: 12 }}>
            <Segmented
              value={mode}
              onChange={(v) => {
                setMode(v as CalculatorMode);
                handleClear();
              }}
              options={[
                { label: "标准", value: "standard" },
                { label: "科学", value: "scientific" },
                { label: "程序员", value: "programmer" },
              ]}
              block
            />
          </div>

          {/* 显示屏 */}
          <div
            style={{
              background: token.colorFillAlter,
              borderRadius: token.borderRadius,
              padding: "12px 16px",
              marginBottom: 12,
              textAlign: "right",
            }}
          >
            <div style={{ minHeight: 18, marginBottom: 2 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {history}
              </Text>
            </div>
            <div
              style={{
                fontSize: mode === "programmer" ? 20 : 28,
                fontWeight: 600,
                color: token.colorText,
                wordBreak: "break-all",
                lineHeight: 1.2,
                fontFamily: "monospace",
              }}
            >
              {getCurrentDisplay()}
            </div>
          </div>

          {/* 按键区 */}
          {mode === "standard" && renderStandardButtons()}
          {mode === "scientific" && renderScientificButtons()}
          {mode === "programmer" && renderProgrammerButtons()}

          {/* 快捷键提示 */}
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: token.colorFillAlter,
              borderRadius: token.borderRadius,
              fontSize: 11,
              color: token.colorTextSecondary,
            }}
          >
            快捷键: 数字键 | Enter=计算 | Esc=清空 | Backspace=退格
          </div>
        </Block>
      </div>
    </div>
  );
};

export default Calculator;
