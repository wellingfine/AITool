import React from 'react';

interface PageProps {
  children: React.ReactNode;
  maxWidth?: number | string;
  style?: React.CSSProperties;
  className?: string;
}

const Page: React.FC<PageProps> = ({ 
  children, 
  maxWidth = 800, 
  style, 
  className 
}) => {
  return (
    <div 
      className={className}
      style={{
        padding: '8px 0',
        maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        ...style
      }}
    >
      {children}
    </div>
  );
};

export default Page;
