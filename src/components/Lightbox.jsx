import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Heart, Edit, Download, Trash2, ChevronLeft, ChevronRight, 
  Play, Pause, Plus, Tag as TagIcon, Calendar, HardDrive, Maximize, Cpu
} from 'lucide-react';

function Lightbox({ 
  photo, 
  photos = [], 
  onClose, 
  onNext, 
  onPrev, 
  onToggleFavorite, 
  onDelete, 
  onOpenEditor,
  onUpdatePhotoDetails 
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Sidebar editable fields state
  const [title, setTitle] = useState(photo.title || '');
  const [description, setDescription] = useState(photo.description || '');
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with photo change
  useEffect(() => {
    setTitle(photo.title || '');
    setDescription(photo.description || '');
    setProgress(0);
  }, [photo]);

  // Slideshow Logic
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            onNext();
            return 0;
          }
          return prev + 2; // 2% increment every 60ms = 3 seconds total
        });
      }, 60);
    } else {
      setProgress(0);
    }
    return () => clearInterval(timer);
  }, [isPlaying, photo.id, onNext]);

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown';
    return new Date(isoString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Handle Detail Updates (blur or save buttons)
  const handleUpdateDetails = async () => {
    if (title === photo.title && description === photo.description) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/photos/${photo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, description })
      });
      const data = await response.json();
      if (response.ok) {
        onUpdatePhotoDetails(data);
      }
    } catch (err) {
      console.error('Failed to update details:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Add tag
  const handleAddTag = async (e) => {
    e.preventDefault();
    const tagVal = newTag.trim();
    if (!tagVal) return;
    if (photo.tags.includes(tagVal)) {
      setNewTag('');
      return;
    }

    const updatedTags = [...photo.tags, tagVal];
    try {
      const response = await fetch(`/api/photos/${photo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tags: updatedTags })
      });
      const data = await response.json();
      if (response.ok) {
        onUpdatePhotoDetails(data);
        setNewTag('');
      }
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  // Remove tag
  const handleRemoveTag = async (tagToRemove) => {
    const updatedTags = photo.tags.filter(t => t !== tagToRemove);
    try {
      const response = await fetch(`/api/photos/${photo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tags: updatedTags })
      });
      const data = await response.json();
      if (response.ok) {
        onUpdatePhotoDetails(data);
      }
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  // Direct download handler
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photo.path;
    link.download = photo.original_name || photo.title || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="lightbox-overlay">
      {/* Main Image Stage */}
      <div className="lightbox-main">
        {/* Header Toolbar */}
        <div className="lightbox-header">
          <div className="lightbox-title-top">
            {photo.title || 'Untitled'}
          </div>

          <div className="lightbox-controls-top">
            {/* Play/Pause Slideshow */}
            <button 
              className="btn btn-secondary lightbox-btn-top" 
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause Slideshow' : 'Start Slideshow'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              <span>{isPlaying ? 'Pause' : 'Slideshow'}</span>
            </button>

            {/* Favorite toggle */}
            <button 
              className="btn btn-secondary lightbox-btn-top"
              onClick={() => onToggleFavorite(photo)}
              title="Toggle Favorite"
            >
              <Heart 
                size={16} 
                fill={photo.is_favorite ? '#ef4444' : 'none'} 
                color={photo.is_favorite ? '#ef4444' : '#fff'}
              />
            </button>

            {/* Image Editor */}
            <button 
              className="btn btn-secondary lightbox-btn-top"
              onClick={() => {
                setIsPlaying(false);
                onOpenEditor(photo);
              }}
              title="Edit Image"
            >
              <Edit size={16} />
              <span>Edit</span>
            </button>

            {/* Download */}
            <button 
              className="btn btn-secondary lightbox-btn-top"
              onClick={handleDownload}
              title="Download Photo"
            >
              <Download size={16} />
            </button>

            {/* Delete */}
            <button 
              className="btn btn-danger"
              style={{ border: 'none' }}
              onClick={() => {
                if (confirm('Are you sure you want to delete this photo permanently?')) {
                  onDelete(photo.id);
                }
              }}
              title="Delete Photo"
            >
              <Trash2 size={16} />
            </button>

            {/* Close Lightbox */}
            <button 
              className="btn btn-icon lightbox-btn-top"
              style={{ width: '40px', height: '40px', marginLeft: '10px' }}
              onClick={onClose}
              title="Close Gallery (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Stage Content */}
        <div className="lightbox-stage">
          {/* Nav Prev */}
          {photos.length > 1 && (
            <button className="lightbox-nav-arrow prev" onClick={onPrev}>
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Actual Image */}
          <div className="lightbox-img-wrapper">
            <img 
              src={photo.path} 
              alt={photo.title || 'Lightbox'} 
              className="lightbox-img"
            />
          </div>

          {/* Nav Next */}
          {photos.length > 1 && (
            <button className="lightbox-nav-arrow next" onClick={onNext}>
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {/* Slideshow Progress Bar */}
        {isPlaying && (
          <div className="slideshow-indicator" style={{ width: `${progress}%` }} />
        )}
      </div>

      {/* Info Sidebar (Metadata & Tags) */}
      <aside className="lightbox-sidebar">
        {/* Section 1: Title & Description */}
        <div className="lightbox-sidebar-section">
          <h4>Details</h4>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Title</label>
            <input 
              type="text" 
              className="form-input" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              onBlur={handleUpdateDetails}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateDetails()}
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '4px' }}>
            <label>Description</label>
            <textarea 
              className="form-input" 
              rows={3}
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              onBlur={handleUpdateDetails}
              style={{ 
                background: 'var(--bg-primary)', 
                borderColor: 'var(--border-light)', 
                resize: 'none',
                fontFamily: 'inherit'
              }}
              placeholder="Add a description..."
            />
          </div>
          {isSaving && <div style={{ fontSize: '11px', color: 'var(--accent-primary)', textAlign: 'right' }}>Saving changes...</div>}
        </div>

        {/* Section 2: Tags */}
        <div className="lightbox-sidebar-section">
          <h4>Tags</h4>
          <div className="tag-list-editor">
            {photo.tags.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                No tags added.
              </div>
            ) : (
              photo.tags.map(t => (
                <div key={t} className="tag-editor-badge">
                  <span>{t}</span>
                  <button onClick={() => handleRemoveTag(t)}>×</button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddTag} className="tag-editor-input-container">
            <input 
              type="text" 
              className="form-input" 
              placeholder="Add tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)', height: '36px', padding: '6px 12px', fontSize: '13px' }}
            />
            <button 
              type="submit" 
              className="btn btn-secondary" 
              style={{ height: '36px', padding: '0 12px' }}
            >
              <Plus size={16} />
            </button>
          </form>
        </div>

        {/* Section 3: File Specifications */}
        <div className="lightbox-sidebar-section">
          <h4>Specifications</h4>
          <table className="meta-table">
            <tbody>
              <tr>
                <td className="label">
                  <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  <span>Date Uploaded</span>
                </td>
                <td className="val">{formatDate(photo.created_at)}</td>
              </tr>
              <tr>
                <td className="label">
                  <HardDrive size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  <span>File Size</span>
                </td>
                <td className="val">{formatSize(photo.file_size)}</td>
              </tr>
              <tr>
                <td className="label">
                  <Maximize size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  <span>Dimensions</span>
                </td>
                <td className="val">{photo.width && photo.height ? `${photo.width} × ${photo.height} px` : 'Unknown'}</td>
              </tr>
              <tr>
                <td className="label">
                  <TagIcon size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  <span>Type</span>
                </td>
                <td className="val">{photo.mime_type || 'image'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 4: EXIF Metadata (If available) */}
        <div className="lightbox-sidebar-section">
          <h4>Camera Info (EXIF)</h4>
          {photo.camera_model || photo.exposure_time || photo.f_number || photo.iso ? (
            <table className="meta-table">
              <tbody>
                {photo.camera_model && (
                  <tr>
                    <td className="label">
                      <Cpu size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                      <span>Model</span>
                    </td>
                    <td className="val">{photo.camera_model}</td>
                  </tr>
                )}
                {photo.exposure_time && (
                  <tr>
                    <td className="label">Exposure</td>
                    <td className="val">{photo.exposure_time}</td>
                  </tr>
                )}
                {photo.f_number && (
                  <tr>
                    <td className="label">Aperture</td>
                    <td className="val">f/{photo.f_number}</td>
                  </tr>
                )}
                {photo.iso && (
                  <tr>
                    <td className="label">ISO speed</td>
                    <td className="val">ISO {photo.iso}</td>
                  </tr>
                )}
                {photo.date_taken && (
                  <tr>
                    <td className="label">Date Captured</td>
                    <td className="val">{formatDate(photo.date_taken)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              No camera technical metadata available for this image.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default Lightbox;
