import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PhotoGrid from './components/PhotoGrid';
import Lightbox from './components/Lightbox';
import PhotoEditor from './components/PhotoEditor';
import UploadModal from './components/UploadModal';
import AlbumModal from './components/AlbumModal';
import { Search, Upload, Plus, Folder, Tag, X, Heart, Sliders } from 'lucide-react';
import './App.css';

function App() {
  // Navigation views
  const [currentView, setCurrentView] = useState('all'); // all, favorites, album, tag
  const [activeAlbumId, setActiveAlbumId] = useState(null);
  const [activeTagName, setActiveTagName] = useState(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Data lists
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [tags, setTags] = useState([]);

  // Selections
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);

  // Modals visibility
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAlbumOpen, setIsAlbumOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null);

  // Initial load
  useEffect(() => {
    fetchAlbums();
    fetchTags();
  }, []);

  // Fetch photos whenever navigation or search changes
  useEffect(() => {
    fetchPhotos();
  }, [currentView, activeAlbumId, activeTagName, searchQuery]);

  const fetchPhotos = async () => {
    try {
      let url = '/api/photos?';
      const params = new URLSearchParams();
      
      if (currentView === 'favorites') {
        params.append('favorite', 'true');
      } else if (currentView === 'album' && activeAlbumId) {
        params.append('albumId', activeAlbumId);
      } else if (currentView === 'tag' && activeTagName) {
        params.append('tag', activeTagName);
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(url + params.toString());
      const data = await response.json();
      if (response.ok) {
        setPhotos(data);
      }
    } catch (err) {
      console.error('Error fetching photos:', err);
    }
  };

  const fetchAlbums = async () => {
    try {
      const response = await fetch('/api/albums');
      const data = await response.json();
      if (response.ok) {
        setAlbums(data);
      }
    } catch (err) {
      console.error('Error fetching albums:', err);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      if (response.ok) {
        setTags(data);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  // Change view and clear selections
  const handleNavigate = (view, albumId = null, tagName = null) => {
    setCurrentView(view);
    setActiveAlbumId(albumId);
    setActiveTagName(tagName);
    setSelectedPhotoIds([]);
  };

  // Toggle single favorite
  const handleToggleFavorite = async (photo) => {
    try {
      const response = await fetch(`/api/photos/${photo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isFavorite: !photo.is_favorite })
      });
      const updated = await response.json();
      
      if (response.ok) {
        // Update photos array in place
        setPhotos(prev => prev.map(p => p.id === photo.id ? updated : p));
        // Update active Lightbox image detail if open
        if (selectedPhoto && selectedPhoto.id === photo.id) {
          setSelectedPhoto(updated);
        }
        // Refresh tags (as tags could have updated or just refresh stats)
        fetchTags();
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // Toggle selection checkbox
  const handleToggleSelect = (id) => {
    setSelectedPhotoIds(prev => 
      prev.includes(id) ? prev.filter(photoId => photoId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedPhotoIds(photos.map(p => p.id));
  };

  const handleClearSelection = () => {
    setSelectedPhotoIds([]);
  };

  // Bulk deletion
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedPhotoIds.length} photos permanently?`)) {
      return;
    }

    try {
      const response = await fetch('/api/photos/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoIds: selectedPhotoIds })
      });

      if (response.ok) {
        setSelectedPhotoIds([]);
        fetchPhotos();
        fetchAlbums();
        fetchTags();
      }
    } catch (err) {
      console.error('Bulk deletion failed:', err);
    }
  };

  // Bulk album assignment
  const handleBulkAddToAlbum = async (albumId) => {
    try {
      const response = await fetch('/api/photos/bulk-album', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoIds: selectedPhotoIds, albumId })
      });

      if (response.ok) {
        setSelectedPhotoIds([]);
        fetchPhotos();
        fetchAlbums(); // refresh counts
      }
    } catch (err) {
      console.error('Bulk album assignment failed:', err);
    }
  };

  // Delete single photo (from lightbox)
  const handleDeleteSingle = async (id) => {
    try {
      const response = await fetch(`/api/photos/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setSelectedPhoto(null);
        fetchPhotos();
        fetchAlbums();
        fetchTags();
      }
    } catch (err) {
      console.error('Failed to delete photo:', err);
    }
  };

  // Callback when a photo is updated (from lightbox details edit)
  const handleUpdatePhotoDetails = (updatedPhoto) => {
    setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
    if (selectedPhoto && selectedPhoto.id === updatedPhoto.id) {
      setSelectedPhoto(updatedPhoto);
    }
    fetchTags();
  };

  // Slideshow prev/next wrappers
  const handleNextPhoto = () => {
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex < photos.length - 1) {
      setSelectedPhoto(photos[currentIndex + 1]);
    } else {
      setSelectedPhoto(photos[0]); // loop back
    }
  };

  const handlePrevPhoto = () => {
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex > 0) {
      setSelectedPhoto(photos[currentIndex - 1]);
    } else {
      setSelectedPhoto(photos[photos.length - 1]); // loop to end
    }
  };

  // Photo Editor save trigger
  const handleSaveComplete = (updatedPhoto, action) => {
    if (action === 'save') {
      // replace in array
      setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
      if (selectedPhoto && selectedPhoto.id === updatedPhoto.id) {
        setSelectedPhoto(updatedPhoto);
      }
    } else {
      // reload gallery since it is a new copy
      fetchPhotos();
    }
    fetchAlbums();
    fetchTags();
  };

  // Keyboard navigation support for Lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedPhoto) return;
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'ArrowLeft') handlePrevPhoto();
      if (e.key === 'Escape') setSelectedPhoto(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, photos]);

  // Determine current active filter display name
  const getViewTitle = () => {
    if (currentView === 'all') return 'All Photos';
    if (currentView === 'favorites') return 'Favorites';
    if (currentView === 'album' && activeAlbumId) {
      const activeAlb = albums.find(a => a.id === activeAlbumId);
      return activeAlb ? activeAlb.name : 'Album';
    }
    if (currentView === 'tag' && activeTagName) {
      return `#${activeTagName}`;
    }
    return 'Photos';
  };

  const getViewSubtitle = () => {
    if (currentView === 'album' && activeAlbumId) {
      const activeAlb = albums.find(a => a.id === activeAlbumId);
      return activeAlb && activeAlb.description ? activeAlb.description : 'Photo collection';
    }
    return `${photos.length} photos available`;
  };

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <Sidebar
        currentView={currentView}
        activeAlbumId={activeAlbumId}
        activeTagName={activeTagName}
        albums={albums}
        tags={tags}
        onNavigate={handleNavigate}
        onOpenAlbumModal={() => setIsAlbumOpen(true)}
      />

      {/* Main Panel */}
      <main className="main-content">
        {/* Header */}
        <header className="main-header">
          <div className="header-left">
            <div className="header-title-container">
              <h2>{getViewTitle()}</h2>
              <p>{getViewSubtitle()}</p>
            </div>
            
            {/* Search Bar */}
            <div className="search-bar-container">
              <Search size={18} />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search title, details, tags..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="header-right">
            {/* Quick indicators of active filters if not standard view */}
            {currentView !== 'all' && (
              <button 
                className="btn btn-secondary" 
                onClick={() => handleNavigate('all')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Clear Filters
              </button>
            )}

            <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
              <Upload size={16} />
              <span>Upload Photos</span>
            </button>
          </div>
        </header>

        {/* Gallery Grid */}
        <PhotoGrid
          photos={photos}
          selectedPhotoIds={selectedPhotoIds}
          onCardClick={(photo) => setSelectedPhoto(photo)}
          onToggleSelect={handleToggleSelect}
          onToggleFavorite={handleToggleFavorite}
          onClearSelection={handleClearSelection}
          onSelectAll={handleSelectAll}
          onBulkDelete={handleBulkDelete}
          onBulkAddToAlbum={handleBulkAddToAlbum}
          albums={albums}
        />
      </main>

      {/* Modals Portal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        albums={albums}
        onUploadComplete={() => {
          fetchPhotos();
          fetchAlbums();
          fetchTags();
        }}
      />

      <AlbumModal
        isOpen={isAlbumOpen}
        onClose={() => setIsAlbumOpen(false)}
        onCreateAlbum={(newAlbum) => {
          setAlbums(prev => [newAlbum, ...prev]);
        }}
      />

      {selectedPhoto && (
        <Lightbox
          photo={selectedPhoto}
          photos={photos}
          onClose={() => setSelectedPhoto(null)}
          onNext={handleNextPhoto}
          onPrev={handlePrevPhoto}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDeleteSingle}
          onOpenEditor={(photo) => setEditingPhoto(photo)}
          onUpdatePhotoDetails={handleUpdatePhotoDetails}
        />
      )}

      {editingPhoto && (
        <PhotoEditor
          photo={editingPhoto}
          isOpen={!!editingPhoto}
          onClose={() => setEditingPhoto(null)}
          onSaveComplete={handleSaveComplete}
        />
      )}
    </div>
  );
}

export default App;
