import React from 'react';

interface ViralBadgeProps {
  previewId: string;
}

export const ViralBadge: React.FC<ViralBadgeProps> = ({ previewId }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: 'rgba(10, 10, 10, 0.8)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '99px',
      color: '#fff',
      fontSize: '12px',
      fontWeight: 500,
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      cursor: 'default'
    }}>
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: '#3b82f6',
        boxShadow: '0 0 8px #3b82f6'
      }} />
      <span>Built with <span style={{ fontWeight: 800, color: '#3b82f6' }}>MultiAgent</span></span>
      <a 
        href={`/remix/${previewId}`}
        style={{
          marginLeft: '4px',
          padding: '4px 8px',
          background: '#3b82f6',
          color: '#fff',
          borderRadius: '4px',
          textDecoration: 'none',
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase'
        }}
        onClick={() => {
          // Logic for remixing
          console.log('Remixing project:', previewId);
        }}
      >
        Remix
      </a>
    </div>
  );
};
