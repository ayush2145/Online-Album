import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCw, FlipHorizontal, FlipVertical, Crop, Sliders, Sun, ShieldAlert, Sparkles, Check, RefreshCw } from 'lucide-react';

function PhotoEditor({ photo, isOpen, onClose, onSaveComplete }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('adjust'); // adjust, filters, crop, transform
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Adjustments states
  const [brightness, setBrightness] = useState(100); // 50 to 150
  const [contrast, setContrast] = useState(100); // 50 to 150
  const [saturation, setSaturation] = useState(100); // 0 to 200
  const [blur, setBlur] = useState(0); // 0 to 10
  
  // Filters presets state
  const [activeFilter, setActiveFilter] = useState('none');
  
  // Transform states
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Crop states
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 10, y: 10, w: 80, h: 80 }); // percentage based
  const [cropRatio, setCropRatio] = useState('free');

  // Loaded image reference
  const imageRef = useRef(null);

  if (!isOpen) return null;

  // Load image once on open
  useEffect(() => {
    setLoading(true);
    const img = new Image();
    // Enable cross-origin for canvas security if hosted on different origin
    img.crossOrigin = 'anonymous';
    img.src = photo.path;
    img.onload = () => {
      imageRef.current = img;
      setLoading(false);
      resetEdits();
    };
    img.onerror = () => {
      alert('Failed to load image for editing.');
      setLoading(false);
    };
  }, [photo]);

  // Redraw canvas when adjustments or transforms change
  useEffect(() => {
    if (!loading && imageRef.current) {
      drawCanvas();
    }
  }, [brightness, contrast, saturation, blur, activeFilter, rotation, flipH, flipV, loading]);

  const resetEdits = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setActiveFilter('none');
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCropMode(false);
    setCropRect({ x: 10, y: 10, w: 80, h: 80 });
    setCropRatio('free');
  };

  // Compose CSS canvas filter string based on adjustments and presets
  const getFilterString = () => {
    let filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;
    
    switch (activeFilter) {
      case 'grayscale':
        filterStr += ' grayscale(100%)';
        break;
      case 'sepia':
        filterStr += ' sepia(100%)';
        break;
      case 'invert':
        filterStr += ' invert(100%)';
        break;
      case 'vintage':
        filterStr += ' sepia(50%) contrast(120%) saturate(130%) hue-rotate(-10deg)';
        break;
      case 'cool':
        filterStr += ' hue-rotate(20deg) saturate(110%) contrast(95%)';
        break;
      case 'warm':
        filterStr += ' sepia(20%) saturate(120%) contrast(105%) hue-rotate(-5deg)';
        break;
      default:
        break;
    }
    return filterStr;
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // Calculate dimensions based on rotation
    const is90Deg = rotation === 90 || rotation === 270;
    const targetWidth = is90Deg ? img.height : img.width;
    const targetHeight = is90Deg ? img.width : img.height;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.save();

    // 1. Move to center to perform rotation/flip transforms
    ctx.translate(targetWidth / 2, targetHeight / 2);

    // 2. Perform rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // 3. Perform flips
    const scaleX = flipH ? -1 : 1;
    const scaleY = flipV ? -1 : 1;
    ctx.scale(scaleX, scaleY);

    // 4. Apply CSS-like adjustments & filters
    ctx.filter = getFilterString();

    // 5. Draw image centered
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    ctx.restore();
  };

  // Perform crop operations on the canvas
  const applyCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const x = Math.round((cropRect.x / 100) * canvas.width);
    const y = Math.round((cropRect.y / 100) * canvas.height);
    const w = Math.round((cropRect.w / 100) * canvas.width);
    const h = Math.round((cropRect.h / 100) * canvas.height);

    if (w <= 0 || h <= 0) return;

    // Create a temporary canvas to hold the cropped region
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

    // Replace imageRef with the cropped image data so further modifications build on top of it
    const croppedDataUrl = tempCanvas.toDataURL();
    const newImg = new Image();
    newImg.src = croppedDataUrl;
    newImg.onload = () => {
      imageRef.current = newImg;
      // Reset transforms since they are now baked into the cropped image
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setCropMode(false);
      // Re-trigger draw canvas
      drawCanvas();
    };
  };

  // Preset Ratio updates
  const handleRatioChange = (ratio) => {
    setCropRatio(ratio);
    if (ratio === 'free') {
      setCropRect({ x: 10, y: 10, w: 80, h: 80 });
    } else {
      const [rw, rh] = ratio.split(':').map(Number);
      // fit box inside current canvas boundaries
      const targetAspect = rw / rh;
      let w = 80;
      let h = 80;
      // Adjust width/height in % based on aspect
      if (targetAspect > 1) {
        h = 80 / targetAspect;
      } else {
        w = 80 * targetAspect;
      }
      setCropRect({
        x: (100 - w) / 2,
        y: (100 - h) / 2,
        w,
        h
      });
    }
  };

  // Crop overlay drag handlers
  const handleCropSliderChange = (field, val) => {
    setCropRect(prev => {
      const newRect = { ...prev, [field]: Number(val) };
      // validate boundaries
      if (field === 'x' && newRect.x + newRect.w > 100) newRect.w = 100 - newRect.x;
      if (field === 'y' && newRect.y + newRect.h > 100) newRect.h = 100 - newRect.y;
      if (field === 'w' && newRect.x + newRect.w > 100) newRect.x = 100 - newRect.w;
      if (field === 'h' && newRect.y + newRect.h > 100) newRect.y = 100 - newRect.h;
      return newRect;
    });
  };

  // Submit edit API call
  const handleSave = async (action) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);
    try {
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const title = action === 'saveAsCopy' ? `${photo.title} (Edited)` : photo.title;

      const response = await fetch(`/api/photos/edit/${photo.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageDataUrl, action, title })
      });

      const data = await response.json();
      if (response.ok) {
        onSaveComplete(data.photo, action);
        onClose();
      } else {
        throw new Error(data.error || 'Failed to save photo');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editor-overlay">
      {/* Editor Header */}
      <div className="editor-header">
        <h3>Photo Studio</h3>
        <div className="editor-header-actions">
          <button className="btn btn-secondary" onClick={resetEdits} disabled={saving}>
            <RefreshCw size={14} />
            <span>Reset All</span>
          </button>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-secondary" onClick={() => handleSave('saveAsCopy')} disabled={saving || loading}>
            Save Copy
          </button>
          <button className="btn btn-primary" onClick={() => handleSave('save')} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Overwrite Original'}
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="editor-content">
        {/* Workspace Canvas (Left) */}
        <div className="editor-workspace" ref={containerRef}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)' }}>Loading photo canvas...</div>
          ) : (
            <div className="editor-canvas-container">
              <canvas ref={canvasRef} />

              {/* Crop mode guide overlays */}
              {cropMode && (
                <div 
                  className="crop-overlay-guide"
                  style={{
                    position: 'absolute',
                    top: `${cropRect.y}%`,
                    left: `${cropRect.x}%`,
                    width: `${cropRect.w}%`,
                    height: `${cropRect.h}%`,
                    border: '2px dashed #fff',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                    pointerEvents: 'none',
                    zIndex: 2
                  }}
                >
                  {/* Grid lines inside crop marquee */}
                  <div style={{ position: 'absolute', top: '33.3%', left: 0, right: 0, height: '1px', borderTop: '1px dotted rgba(255,255,255,0.4)' }} />
                  <div style={{ position: 'absolute', top: '66.6%', left: 0, right: 0, height: '1px', borderTop: '1px dotted rgba(255,255,255,0.4)' }} />
                  <div style={{ position: 'absolute', left: '33.3%', top: 0, bottom: 0, width: '1px', borderLeft: '1px dotted rgba(255,255,255,0.4)' }} />
                  <div style={{ position: 'absolute', left: '66.6%', top: 0, bottom: 0, width: '1px', borderLeft: '1px dotted rgba(255,255,255,0.4)' }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Studio Sidebar (Right controls) */}
        <aside className="editor-sidebar">
          <div className="editor-sidebar-tabs">
            <button 
              className={`editor-tab-btn ${activeTab === 'adjust' ? 'active' : ''}`}
              onClick={() => { setActiveTab('adjust'); setCropMode(false); }}
            >
              <Sliders size={16} style={{ display: 'block', margin: '0 auto 4px auto' }} />
              <span>Adjust</span>
            </button>
            <button 
              className={`editor-tab-btn ${activeTab === 'filters' ? 'active' : ''}`}
              onClick={() => { setActiveTab('filters'); setCropMode(false); }}
            >
              <Sparkles size={16} style={{ display: 'block', margin: '0 auto 4px auto' }} />
              <span>Filters</span>
            </button>
            <button 
              className={`editor-tab-btn ${activeTab === 'crop' ? 'active' : ''}`}
              onClick={() => { setActiveTab('crop'); setCropMode(true); }}
            >
              <Crop size={16} style={{ display: 'block', margin: '0 auto 4px auto' }} />
              <span>Crop</span>
            </button>
            <button 
              className={`editor-tab-btn ${activeTab === 'transform' ? 'active' : ''}`}
              onClick={() => { setActiveTab('transform'); setCropMode(false); }}
            >
              <RotateCw size={16} style={{ display: 'block', margin: '0 auto 4px auto' }} />
              <span>Transform</span>
            </button>
          </div>

          <div className="editor-panel">
            {/* TAB: ADJUST */}
            {activeTab === 'adjust' && (
              <>
                <div className="control-group">
                  <div className="control-label">
                    <span>Brightness</span>
                    <span>{brightness}%</span>
                  </div>
                  <input 
                    type="range" 
                    className="control-slider" 
                    min="50" 
                    max="150" 
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                  />
                </div>

                <div className="control-group">
                  <div className="control-label">
                    <span>Contrast</span>
                    <span>{contrast}%</span>
                  </div>
                  <input 
                    type="range" 
                    className="control-slider" 
                    min="50" 
                    max="150" 
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                  />
                </div>

                <div className="control-group">
                  <div className="control-label">
                    <span>Saturation</span>
                    <span>{saturation}%</span>
                  </div>
                  <input 
                    type="range" 
                    className="control-slider" 
                    min="0" 
                    max="200" 
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                  />
                </div>

                <div className="control-group">
                  <div className="control-label">
                    <span>Blur</span>
                    <span>{blur}px</span>
                  </div>
                  <input 
                    type="range" 
                    className="control-slider" 
                    min="0" 
                    max="10" 
                    value={blur}
                    onChange={(e) => setBlur(Number(e.target.value))}
                  />
                </div>
              </>
            )}

            {/* TAB: FILTERS */}
            {activeTab === 'filters' && (
              <div className="filters-grid">
                {[
                  { id: 'none', name: 'None' },
                  { id: 'grayscale', name: 'B&W' },
                  { id: 'sepia', name: 'Sepia' },
                  { id: 'vintage', name: 'Vintage' },
                  { id: 'warm', name: 'Warm Sun' },
                  { id: 'cool', name: 'Cool Slate' },
                  { id: 'invert', name: 'Invert' }
                ].map(filter => (
                  <div 
                    key={filter.id} 
                    className={`filter-preset-card ${activeFilter === filter.id ? 'active' : ''}`}
                    onClick={() => setActiveFilter(filter.id)}
                  >
                    <div className="filter-preview-box">
                      <Sparkles size={18} />
                    </div>
                    <span className="filter-name">{filter.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: CROP */}
            {activeTab === 'crop' && (
              <>
                <div className="control-group">
                  <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Aspect Ratio</label>
                  <div className="crop-preset-grid">
                    {[
                      { id: 'free', name: 'Custom' },
                      { id: '1:1', name: '1:1 Square' },
                      { id: '4:3', name: '4:3 Photo' },
                      { id: '16:9', name: '16:9 Widescreen' }
                    ].map(ratio => (
                      <button 
                        key={ratio.id}
                        className={`btn ${cropRatio === ratio.id ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleRatioChange(ratio.id)}
                        style={{ padding: '8px', fontSize: '12px' }}
                      >
                        {ratio.name}
                      </button>
                    ))}
                  </div>
                </div>

                <hr style={{ borderColor: 'var(--border-light)', margin: '10px 0' }} />

                <div className="control-group">
                  <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Crop Dimensions (%)</label>
                  <div className="control-label" style={{ marginTop: '8px' }}>
                    <span>Horizontal Offset</span>
                    <span>{cropRect.x}%</span>
                  </div>
                  <input 
                    type="range" 
                    className="control-slider" 
                    min="0" 
                    max={100 - cropRect.w} 
                    value={cropRect.x}
                    onChange={(e) => handleCropSliderChange('x', e.target.value)}
                  />

                  <div className="control-label" style={{ marginTop: '8px' }}>
                    <span>Vertical Offset</span>
                    <span>{cropRect.y}%</span>
                  </div>
                  <input 
                    type="range" 
                    className="control-slider" 
                    min="0" 
                    max={100 - cropRect.h} 
                    value={cropRect.y}
                    onChange={(e) => handleCropSliderChange('y', e.target.value)}
                  />

                  <div className="control-label" style={{ marginTop: '8px' }}>
                    <span>Box Width</span>
                    <span>{cropRect.w}%</span>
                  </div>
                  <input 
                    type="range" 
                    className="control-slider" 
                    min="10" 
                    max={100 - cropRect.x} 
                    value={cropRect.w}
                    onChange={(e) => handleCropSliderChange('w', e.target.value)}
                    disabled={cropRatio !== 'free'}
                  />

                  <div className="control-label" style={{ marginTop: '8px' }}>
                    <span>Box Height</span>
                    <span>{cropRect.h}%</span>
                  </div>
                  <input 
                    type="range" 
                    className="control-slider" 
                    min="10" 
                    max={100 - cropRect.y} 
                    value={cropRect.h}
                    onChange={(e) => handleCropSliderChange('h', e.target.value)}
                    disabled={cropRatio !== 'free'}
                  />
                </div>

                <button 
                  className="btn btn-primary" 
                  onClick={applyCrop}
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  <Check size={16} />
                  <span>Crop Image</span>
                </button>
              </>
            )}

            {/* TAB: TRANSFORM */}
            {activeTab === 'transform' && (
              <div className="transform-grid">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setRotation(r => (r + 90) % 360)}
                >
                  <RotateCw size={16} />
                  <span>Rotate 90°</span>
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setFlipH(f => !f)}
                >
                  <FlipHorizontal size={16} />
                  <span>Flip Horizontal</span>
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setFlipV(f => !f)}
                  style={{ gridColumn: 'span 2' }}
                >
                  <FlipVertical size={16} />
                  <span>Flip Vertical</span>
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default PhotoEditor;
