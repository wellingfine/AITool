import React from 'react';
import { theme } from 'antd';

interface BlockProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const Block: React.FC<BlockProps> = ({ children, style, className }) => {
  const { token } = theme.useToken();

  return (
    <div
      className={className}
      style={{
        background: token.colorBgElevated,
        borderRadius: token.borderRadius,
        border: `1px solid ${token.colorBorder}`,
        padding: 16,
        marginTop: 8,
        marginBottom: 8,
        ...style
      }}
    >
      {children}
    </div>
  );
};

export default Block;
