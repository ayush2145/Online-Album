import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileImage } from 'lucide-react';

function UploadModal({ isOpen, onClose, albums = [], onUploadComplete }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [targetAlbumId, setTargetAlbumId] = useState('');
  const [tags, setTags] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // File size format utility
  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToList(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToList(Array.from(e.target.files));
    }
  };

  const addFilesToList = (files) => {
    // Filter out non-images
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Only image files are allowed!');
      return;
    }

    const newFiles = imageFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending' // pending, uploading, success, error
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id) => {
    if (uploading) return;
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const triggerInputClick = () => {
    if (uploading) return;
    fileInputRef.current.click();
  };

  // Perform upload file-by-file with progress tracking
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);

    const uploadPromises = selectedFiles.map(fileObj => {
      if (fileObj.status === 'success') return Promise.resolve(); // skip already uploaded

      return new Promise((resolve) => {
        const formData = new FormData();
        formData.append('photos', fileObj.file);
        if (targetAlbumId) {
          formData.append('albumId', targetAlbumId);
        }
        if (tags) {
          formData.append('tags', tags);
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/photos', true);

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            updateFileStatus(fileObj.id, { progress: percent, status: 'uploading' });
          }
        });

        // Track response
        xhr.onreadystatechange = () => {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 201 || xhr.status === 200) {
              updateFileStatus(fileObj.id, { status: 'success', progress: 100 });
              resolve({ success: true });
            } else {
              updateFileStatus(fileObj.id, { status: 'error', progress: 0 });
              resolve({ success: false });
            }
          }
        };

        xhr.send(formData);
      });
    });

    await Promise.all(uploadPromises);
    setUploading(false);
    
    // Refresh page / show new photos
    onUploadComplete();
  };

  const updateFileStatus = (id, updates) => {
    setSelectedFiles(prev => 
      prev.map(f => f.id === id ? { ...f, ...updates } : f)
    );
  };

  const handleClose = () => {
    if (uploading) {
      if (!confirm('Upload in progress. Are you sure you want to close and cancel pending uploads?')) {
        return;
      }
    }
    setSelectedFiles([]);
    setTargetAlbumId('');
    setTags('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>Upload Photos</h3>
          <button 
            className="btn-icon" 
            onClick={handleClose} 
            title="Close"
            style={{ width: '32px', height: '32px', border: 'none', background: 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Settings Fields (Album, Tags) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Add to Album</label>
              <select 
                className="form-input" 
                value={targetAlbumId}
                onChange={(e) => setTargetAlbumId(e.target.value)}
                disabled={uploading}
                style={{ height: '42px', appearance: 'auto' }}
              >
                <option value="">None (All Photos only)</option>
                {albums.map(album => (
                  <option key={album.id} value={album.id}>{album.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Tags (Comma-separated)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Travel, Summer, Nature" 
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={uploading}
              />
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div 
            className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerInputClick}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              accept="image/*"
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
            <Upload size={36} />
            <p style={{ fontWeight: 600, fontSize: '15px' }}>Drag & Drop images here, or click to browse</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Supports JPG, JPEG, PNG, WEBP, GIF up to 20MB</p>
          </div>

          {/* Uploading Queue */}
          {selectedFiles.length > 0 && (
            <div className="upload-queue">
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Files ({selectedFiles.length})
              </div>
              {selectedFiles.map(fileObj => (
                <div key={fileObj.id} className="upload-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <FileImage size={16} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="upload-item-name" title={fileObj.name}>{fileObj.name}</div>
                      <div className="upload-item-size">{formatSize(fileObj.size)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto', zIndex: 2 }}>
                    {fileObj.status === 'success' && <CheckCircle size={16} color="#10b981" />}
                    {fileObj.status === 'error' && <AlertCircle size={16} color="#ef4444" />}
                    {fileObj.status === 'pending' && !uploading && (
                      <button 
                        onClick={() => removeFile(fileObj.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                    {fileObj.status === 'uploading' && (
                      <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{fileObj.progress}%</span>
                    )}
                  </div>

                  {/* Progress bar background indicator */}
                  {fileObj.status === 'uploading' && (
                    <div 
                      className="upload-progress-bar" 
                      style={{ width: `${fileObj.progress}%` }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose} disabled={uploading}>
            Close
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleUpload} 
            disabled={uploading || selectedFiles.length === 0}
          >
            {uploading ? 'Uploading...' : 'Start Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadModal;
