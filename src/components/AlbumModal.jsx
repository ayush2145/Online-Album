import React, { useState } from 'react';
import { X } from 'lucide-react';

function AlbumModal({ isOpen, onClose, onCreateAlbum }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Album name is required.');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/albums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create album');
      }

      onCreateAlbum(data);
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <form className="modal-container" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3>Create New Album</h3>
          <button 
            type="button"
            className="btn-icon" 
            onClick={onClose} 
            title="Close"
            style={{ width: '32px', height: '32px', border: 'none', background: 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div 
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                marginBottom: '16px'
              }}
            >
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Album Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Summer Vacation 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea 
              className="form-input" 
              placeholder="Provide a brief description for this photo collection..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Album'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AlbumModal;
