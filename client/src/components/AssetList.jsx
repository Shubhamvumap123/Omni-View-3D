import React from 'react';

export default function AssetList({ assets, selectedAsset, onSelect }) {
  if (assets.length === 0) {
    return <p style={{ color: '#888' }}>No assets yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {assets.map(asset => (
        <div
          key={asset._id}
          className={`card ${selectedAsset && selectedAsset._id === asset._id ? 'active' : ''}`}
          onClick={() => onSelect(asset)}
        >
          <div style={{ fontWeight: 'bold' }}>{asset.title}</div>
          <div style={{ fontSize: '0.8em', color: '#666' }}>
            {asset.format.toUpperCase()} • {(asset.fileSize / 1024).toFixed(1)} KB
          </div>
          <div style={{ marginTop: 5 }}>
            <span className={`status-badge status-${asset.status}`}>
              {asset.status.toUpperCase()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
