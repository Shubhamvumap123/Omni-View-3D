import React, { useState } from 'react';
import axios from 'axios';

export default function UploadZone({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onUploadSuccess();
      alert('Upload successful!');
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  return (
    <div className="upload-zone">
      {uploading ? (
        <p>Uploading...</p>
      ) : (
        <>
          <p>Drag & Drop or Click to Upload</p>
          <input
            type="file"
            accept=".stl,.ply,.3mf,.step,.stp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}>
            Choose File
          </label>
        </>
      )}
    </div>
  );
}
