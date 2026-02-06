import React from 'react';
import axios from 'axios';

export default function AssetList({ assets, selectedAsset, onSelect, onDeleteSuccess }) {
  const handleDelete = async (e, asset) => {
    e.stopPropagation(); // Prevent selecting the asset when deleting
    if (!window.confirm(`Are you sure you want to delete "${asset.title}"?`)) return;

    try {
      await axios.delete(`/api/assets/${asset._id}`);
      if (onDeleteSuccess) onDeleteSuccess();
      if (selectedAsset && selectedAsset._id === asset._id) {
          onSelect(null); // Deselect if deleted
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete asset');
    }
  };

  if (assets.length === 0) {
    return <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>No assets yet. Upload one!</p>;
  }

  return (
    <div className="asset-list">
      {assets.map(asset => (
        <div
          key={asset._id}
          className={`card ${selectedAsset && selectedAsset._id === asset._id ? 'active' : ''}`}
          onClick={() => onSelect(asset)}
        >
          <div className="card-header">
            <div className="card-title" title={asset.title}>{asset.title}</div>
            <button
                className="delete-btn"
                onClick={(e) => handleDelete(e, asset)}
                title="Delete Asset"
            >
                ✕
            </button>
          </div>
          <div className="card-meta">
            <span>{asset.format.toUpperCase()} • {(asset.fileSize / 1024).toFixed(1)} KB</span>
            <span className={`status-badge status-${asset.status}`}>
              {asset.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
