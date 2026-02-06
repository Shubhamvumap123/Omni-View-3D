import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, File, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function UploadZone({ onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const validExts = ['stl', 'ply', '3mf', 'step', 'stp'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (validExts.includes(ext)) {
      setFile(file);
      setStatus('idle');
      setMessage('');
    } else {
      setStatus('error');
      setMessage('Invalid file format. Supported: .stl, .ply, .3mf, .step');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setStatus('uploading');
    setProgress(0);

    try {
      await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });
      setStatus('success');
      setMessage('Upload successful!');
      onUploadSuccess();
      setTimeout(() => {
          setFile(null);
          setStatus('idle');
          setMessage('');
      }, 3000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('Upload failed. Please try again.');
    }
  };

  const clearFile = (e) => {
      e.stopPropagation();
      setFile(null);
      setStatus('idle');
      setMessage('');
      if(inputRef.current) inputRef.current.value = '';
  }

  return (
    <div
      className={`upload-zone ${dragActive ? 'drag-active' : ''} ${status}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current && inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".stl,.ply,.3mf,.step,.stp"
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {status === 'uploading' ? (
        <div className="upload-status">
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <p>Uploading {file.name}... {progress}%</p>
        </div>
      ) : status === 'success' ? (
        <div className="upload-status success">
            <CheckCircle size={32} color="green" />
            <p>{message}</p>
        </div>
      ) : (
        <>
            {!file ? (
                <div className="upload-placeholder">
                    <Upload size={32} color="#666" />
                    <p><strong>Click to upload</strong> or drag and drop</p>
                    <span className="sub-text">STL, PLY, 3MF, STEP (max 50MB)</span>
                </div>
            ) : (
                <div className="file-preview">
                    <div className="file-info">
                        <File size={24} />
                        <span className="file-name">{file.name}</span>
                        <button className="icon-btn" onClick={clearFile}><X size={16}/></button>
                    </div>
                    {status === 'error' ? (
                        <p className="error-text"><AlertCircle size={14}/> {message}</p>
                    ) : (
                        <button className="primary-btn" onClick={(e) => { e.stopPropagation(); handleUpload(); }}>
                            Upload File
                        </button>
                    )}
                </div>
            )}
        </>
      )}
    </div>
  );
}
