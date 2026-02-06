import React, { useState } from 'react';
import axios from 'axios';

export default function UploadZone({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files[0]);
    }
  };

  const handleFiles = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onUploadSuccess();
      // Optional: Toast notification here
    } catch (err) {
      console.error(err);
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
        className={`upload-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{ borderColor: dragActive ? 'var(--accent-color)' : 'var(--border-color)' }}
    >
      {uploading ? (
        <div style={{ color: 'var(--accent-color)' }}>
            <div className="spinner"></div> {/* Add CSS animation for this if needed */}
            Uploading...
        </div>
      ) : (
        <>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Drag & Drop 3D Model
          </p>
          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>
             STL, PLY, 3MF, STEP
          </div>
          <input
            type="file"
            accept=".stl,.ply,.3mf,.step,.stp"
            onChange={handleChange}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" className="upload-label">
            Browse Files
          </label>
        </>
      )}
    </div>
  );
}
