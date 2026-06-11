import React, { useState } from 'react';
import PhotoCard from './PhotoCard';
import { Trash2, FolderPlus, Download, CheckSquare, Square, X, Info } from 'lucide-react';

function PhotoGrid({ 
  photos = [], 
  selectedPhotoIds = [], 
  onCardClick, 
  onToggleSelect, 
  onToggleFavorite, 
  onClearSelection, 
  onSelectAll, 
  onBulkDelete, 
  onBulkAddToAlbum,
  albums = [] 
}) {
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const isSelectMode = selectedPhotoIds.length > 0;

  // Trigger browser download for all selected photos
  const handleBulkDownload = () => {
    selectedPhotoIds.forEach(id => {
      const photo = photos.find(p => p.id === id);
      if (photo) {
        const link = document.createElement('a');
        link.href = photo.path;
        link.download = photo.original_name || photo.title || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  return (
    <section className="gallery-section">
      {/* Bulk Actions Context Bar */}
      {isSelectMode && (
        <div className="bulk-actions-bar">
          <div className="bulk-info flex items-center gap-3">
            <button 
              className="btn-icon" 
              onClick={onClearSelection} 
              title="Clear selection"
              style={{ width: '32px', height: '32px' }}
            >
              <X size={16} />
            </button>
            <span style={{ marginLeft: '10px' }}>{selectedPhotoIds.length} items selected</span>
          </div>

          <div className="bulk-btns">
            {/* Select All / Deselect All Toggle */}
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                if (selectedPhotoIds.length === photos.length) {
                  onClearSelection();
                } else {
                  onSelectAll();
                }
              }}
            >
              {selectedPhotoIds.length === photos.length ? (
                <>
                  <Square size={16} />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <CheckSquare size={16} />
                  <span>Select All</span>
                </>
              )}
            </button>

            {/* Add to Album Dropdown */}
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowAlbumDropdown(!showAlbumDropdown)}
              >
                <FolderPlus size={16} />
                <span>Add to Album</span>
              </button>

              {showAlbumDropdown && (
                <div 
                  className="dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-md)',
                    minWidth: '180px',
                    zIndex: 20,
                    padding: '8px 0',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ padding: '6px 14px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Select Album
                  </div>
                  {albums.length === 0 ? (
                    <div style={{ padding: '8px 14px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      No albums available
                    </div>
                  ) : (
                    albums.map(album => (
                      <button
                        key={album.id}
                        onClick={() => {
                          onBulkAddToAlbum(album.id);
                          setShowAlbumDropdown(false);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '8px 14px',
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          display: 'block'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        {album.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Download Selected */}
            <button className="btn btn-secondary" onClick={handleBulkDownload}>
              <Download size={16} />
              <span>Download</span>
            </button>

            {/* Delete Selected */}
            <button className="btn btn-danger" onClick={onBulkDelete}>
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 ? (
        <div className="empty-state">
          <Info size={48} />
          <h3>No photos found</h3>
          <p>Get started by uploading photos using the "Upload" button in the top right corner.</p>
        </div>
      ) : (
        /* Photo Grid */
        <div className="grid-container">
          {photos.map(photo => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isSelected={selectedPhotoIds.includes(photo.id)}
              isSelectMode={isSelectMode}
              onCardClick={onCardClick}
              onToggleSelect={onToggleSelect}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default PhotoGrid;
