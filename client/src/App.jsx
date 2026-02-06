import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadZone from './components/UploadZone';
import AssetList from './components/AssetList';
import Viewer from './components/Viewer';

function App() {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const fetchAssets = async () => {
    try {
      const res = await axios.get('/api/assets');
      setAssets(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAssets();
    // Poll for status updates
    const interval = setInterval(fetchAssets, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container">
      <header className="header">
        <h1>Omni-View 3D</h1>
      </header>
      <div className="main-content">
        <div className="sidebar">
          <UploadZone onUploadSuccess={fetchAssets} />
          <h3>My Assets</h3>
          <AssetList
            assets={assets}
            selectedAsset={selectedAsset}
            onSelect={setSelectedAsset}
          />
        </div>
        <div className="viewer-area">
          {selectedAsset ? (
            <Viewer asset={selectedAsset} />
          ) : (
            <div style={{ padding: 20, textAlign: 'center', marginTop: 50 }}>
              <h2>Select a model to view</h2>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
