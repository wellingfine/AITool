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
    <>
      <style>{`
        @media (max-width: 576px) {
          .block-responsive {
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
          }
        }
      `}</style>
      <div
        className={`block-responsive ${className || ''}`}
        style={{
          background: token.colorBgElevated,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorder}`,
          padding: 16,
          marginTop: 8,
          marginBottom: 0,
          ...style
        }}
      >
        {children}
      </div>
    </>
  );
};

export default Block;
