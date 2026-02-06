import React from 'react';
import { Box, FileText, CheckCircle, Clock, AlertTriangle, Cpu } from 'lucide-react';

export default function AssetList({ assets, selectedAsset, onSelect }) {
  if (assets.length === 0) {
    return (
        <div className="empty-state">
            <Box size={48} color="#ccc" />
            <p>No models found.</p>
        </div>
    );
  }

  const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
  };

  const getStatusIcon = (status) => {
      switch(status) {
          case 'ready': return <CheckCircle size={14} color="green" />;
          case 'processing': return <Cpu size={14} color="orange" />;
          case 'failed': return <AlertTriangle size={14} color="red" />;
          default: return <Clock size={14} color="gray" />;
      }
  };

  return (
    <div className="asset-list">
      {assets.map(asset => (
        <div
          key={asset._id}
          className={`asset-card ${selectedAsset && selectedAsset._id === asset._id ? 'active' : ''}`}
          onClick={() => onSelect(asset)}
        >
          <div className="asset-icon">
             <FileText size={24} color="#555" />
          </div>
          <div className="asset-details">
              <div className="asset-title" title={asset.title}>{asset.title}</div>
              <div className="asset-meta">
                <span>{asset.format.toUpperCase()}</span>
                <span>•</span>
                <span>{(asset.fileSize / 1024).toFixed(1)} KB</span>
              </div>
              <div className="asset-date">{formatDate(asset.uploadDate)}</div>
          </div>
          <div className="asset-status" title={`Status: ${asset.status}`}>
            {getStatusIcon(asset.status)}
          </div>
        </div>
      ))}
    </div>
  );
}
