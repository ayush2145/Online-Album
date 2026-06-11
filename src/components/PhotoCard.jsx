import React from 'react';
import { Heart, Check } from 'lucide-react';

function PhotoCard({ 
  photo, 
  isSelected, 
  isSelectMode, 
  onCardClick, 
  onToggleSelect, 
  onToggleFavorite 
}) {
  // Format file size for display
  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCardClick = (e) => {
    // If we click an action button, do not open lightbox
    if (e.target.closest('.photo-card-checkbox') || e.target.closest('.photo-card-favorite-btn')) {
      return;
    }
    onCardClick(photo);
  };

  return (
    <div 
      className={`photo-card ${isSelected ? 'selected' : ''}`}
      onClick={handleCardClick}
    >
      <div className="photo-card-img-wrapper">
        <img 
          src={photo.path} 
          alt={photo.title || 'Photo'} 
          className="photo-card-img" 
          loading="lazy"
        />
        
        {/* Card Hover/Selection Overlay */}
        <div className="photo-card-overlay">
          {/* Top Actions: Checkbox & Favorite */}
          <div className="photo-card-top-actions">
            <div 
              className="photo-card-checkbox"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(photo.id);
              }}
              title={isSelected ? 'Deselect' : 'Select'}
            >
              {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
            </div>
            
            <button 
              className={`photo-card-favorite-btn ${photo.is_favorite ? 'is-fav' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(photo);
              }}
              title={photo.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Heart size={16} fill={photo.is_favorite ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Bottom Info: Title & Size */}
          <div className="photo-card-bottom-info">
            <h4 className="photo-card-title">{photo.title || 'Untitled'}</h4>
            <div className="photo-card-meta">
              {formatSize(photo.file_size)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhotoCard;
