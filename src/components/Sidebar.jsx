import React from 'react';
import { Image, Heart, FolderPlus, Folder, Tag, Trash, Layers } from 'lucide-react';

function Sidebar({ 
  currentView, 
  activeAlbumId, 
  activeTagName, 
  albums = [], 
  tags = [], 
  onNavigate, 
  onOpenAlbumModal 
}) {
  return (
    <aside className="sidebar-aside">
      {/* Logo */}
      <div class="sidebar-logo">
        <Layers size={24} className="text-indigo-500" style={{ color: 'var(--accent-primary)' }} />
        <div>
          <h1>AuraPhoto</h1>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Premium Photo Gallery</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <div 
          className={`nav-item ${currentView === 'all' ? 'active' : ''}`}
          onClick={() => onNavigate('all')}
        >
          <Image size={18} />
          <span>All Photos</span>
        </div>
        <div 
          className={`nav-item ${currentView === 'favorites' ? 'active' : ''}`}
          onClick={() => onNavigate('favorites')}
        >
          <Heart size={18} />
          <span>Favorites</span>
        </div>
      </nav>

      {/* Albums Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>Albums</span>
          <button onClick={onOpenAlbumModal} title="Create Album">
            <FolderPlus size={16} />
          </button>
        </div>
        <div className="album-list">
          {albums.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
              No albums created
            </div>
          ) : (
            albums.map(album => (
              <div 
                key={album.id}
                className={`album-item ${currentView === 'album' && activeAlbumId === album.id ? 'active' : ''}`}
                onClick={() => onNavigate('album', album.id)}
              >
                <div className="album-item-left">
                  <Folder size={16} style={{ flexShrink: 0 }} />
                  <span className="album-item-name" title={album.name}>{album.name}</span>
                </div>
                <span className="album-count">{album.photo_count || 0}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tags Section */}
      <div className="sidebar-section" style={{ flexGrow: 1 }}>
        <div className="sidebar-section-header">
          <span>Tags</span>
        </div>
        <div className="tag-cloud">
          {tags.length === 0 ? (
            <div style={{ padding: '0 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
              No tags used
            </div>
          ) : (
            tags.map(tag => (
              <button 
                key={tag.name}
                className={`tag-badge ${currentView === 'tag' && activeTagName === tag.name ? 'active' : ''}`}
                onClick={() => onNavigate('tag', null, tag.name)}
              >
                <Tag size={10} />
                <span>{tag.name}</span>
                <span className="tag-badge-count">({tag.count})</span>
              </button>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
