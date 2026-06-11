import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import exifParser from 'exif-parser';
import { dbQuery, dbGet, dbRun } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support large base64 edits
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Paths
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Multer Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'photo-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed!'));
  }
});

// Helper: Extract Exif & Dimensions if JPEG
function parseImageMetadata(filePath) {
  const metadata = {
    cameraModel: null,
    exposureTime: null,
    fNumber: null,
    iso: null,
    dateTaken: null,
    width: null,
    height: null
  };

  try {
    const buffer = fs.readFileSync(filePath);
    // basic checks
    if (buffer[0] === 0xff && buffer[1] === 0xd8) { // JPEG
      const parser = exifParser.create(buffer);
      const result = parser.parse();
      if (result && result.tags) {
        metadata.cameraModel = result.tags.Model || null;
        metadata.exposureTime = result.tags.ExposureTime ? `1/${Math.round(1 / result.tags.ExposureTime)}s` : null;
        metadata.fNumber = result.tags.FNumber || null;
        metadata.iso = result.tags.ISO || null;
        metadata.dateTaken = result.tags.DateTimeOriginal ? new Date(result.tags.DateTimeOriginal * 1000).toISOString() : null;
      }
      if (result && result.imageSize) {
        metadata.width = result.imageSize.width;
        metadata.height = result.imageSize.height;
      }
    }
  } catch (err) {
    console.warn('Exif parsing failed for:', filePath, err.message);
  }
  return metadata;
}

// ----------------------------------------------------
// PHOTO API ENDPOINTS
// ----------------------------------------------------

// GET: All Photos (with optional filters)
app.get('/api/photos', async (req, res) => {
  try {
    const { albumId, tag, favorite, search } = req.query;
    let query = `
      SELECT p.*,
             (SELECT GROUP_CONCAT(t.name) FROM photo_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.photo_id = p.id) AS tags,
             (SELECT GROUP_CONCAT(a.name) FROM photo_albums pa JOIN albums a ON pa.album_id = a.id WHERE pa.photo_id = p.id) AS albums,
             (SELECT GROUP_CONCAT(a.id) FROM photo_albums pa JOIN albums a ON pa.album_id = a.id WHERE pa.photo_id = p.id) AS album_ids
      FROM photos p
    `;
    const params = [];
    const conditions = [];

    if (favorite === 'true') {
      conditions.push('p.is_favorite = 1');
    }

    if (albumId) {
      conditions.push('p.id IN (SELECT photo_id FROM photo_albums WHERE album_id = ?)');
      params.push(albumId);
    }

    if (tag) {
      conditions.push('p.id IN (SELECT photo_id FROM photo_tags pt JOIN tags t ON pt.tag_id = t.id WHERE t.name = ?)');
      params.push(tag);
    }

    if (search) {
      conditions.push('(p.title LIKE ? OR p.description LIKE ? OR p.original_name LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC';

    const photos = await dbQuery(query, params);

    // Process comma separated lists
    const processedPhotos = photos.map(photo => ({
      ...photo,
      is_favorite: !!photo.is_favorite,
      tags: photo.tags ? photo.tags.split(',') : [],
      albums: photo.albums ? photo.albums.split(',') : [],
      album_ids: photo.album_ids ? photo.album_ids.split(',').map(Number) : []
    }));

    res.json(processedPhotos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Single Photo by ID
app.get('/api/photos/:id', async (req, res) => {
  try {
    const photo = await dbGet(`
      SELECT p.*,
             (SELECT GROUP_CONCAT(t.name) FROM photo_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.photo_id = p.id) AS tags,
             (SELECT GROUP_CONCAT(a.name) FROM photo_albums pa JOIN albums a ON pa.album_id = a.id WHERE pa.photo_id = p.id) AS albums,
             (SELECT GROUP_CONCAT(a.id) FROM photo_albums pa JOIN albums a ON pa.album_id = a.id WHERE pa.photo_id = p.id) AS album_ids
      FROM photos p
      WHERE p.id = ?
    `, [req.params.id]);

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.json({
      ...photo,
      is_favorite: !!photo.is_favorite,
      tags: photo.tags ? photo.tags.split(',') : [],
      albums: photo.albums ? photo.albums.split(',') : [],
      album_ids: photo.album_ids ? photo.album_ids.split(',').map(Number) : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Upload Photos
app.post('/api/photos', upload.array('photos'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photo files uploaded' });
    }

    const { albumId, tags } = req.body;
    const uploadedPhotos = [];

    for (const file of req.files) {
      const meta = parseImageMetadata(file.path);
      const title = path.parse(file.originalname).name;
      const relativePath = `/uploads/${file.filename}`;

      // Insert into photos table
      const sql = `
        INSERT INTO photos (filename, original_name, title, description, path, mime_type, file_size, width, height, camera_model, exposure_time, f_number, iso, date_taken)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        file.filename,
        file.originalname,
        title,
        '',
        relativePath,
        file.mimetype,
        file.size,
        meta.width,
        meta.height,
        meta.cameraModel,
        meta.exposureTime,
        meta.fNumber,
        meta.iso,
        meta.dateTaken || new Date().toISOString()
      ];

      const result = await dbRun(sql, params);
      const photoId = result.lastID;

      // Assign to album if provided
      if (albumId) {
        await dbRun('INSERT OR IGNORE INTO photo_albums (photo_id, album_id) VALUES (?, ?)', [photoId, albumId]);
      }

      // Assign tags if provided
      if (tags) {
        const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
        for (const tagName of tagList) {
          // ensure tag exists
          await dbRun('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tagName]);
          const tagRecord = await dbGet('SELECT id FROM tags WHERE name = ?', [tagName]);
          if (tagRecord) {
            await dbRun('INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)', [photoId, tagRecord.id]);
          }
        }
      }

      uploadedPhotos.push({
        id: photoId,
        filename: file.filename,
        title: title,
        path: relativePath
      });
    }

    res.status(201).json({ message: 'Photos uploaded successfully', photos: uploadedPhotos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Update Photo Details (Title, Description, Favorite status, Tags)
app.put('/api/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, isFavorite, tags, albumIds } = req.body;

    const currentPhoto = await dbGet('SELECT * FROM photos WHERE id = ?', [id]);
    if (!currentPhoto) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Update main photo properties if present
    if (title !== undefined || description !== undefined || isFavorite !== undefined) {
      const updates = [];
      const params = [];
      if (title !== undefined) {
        updates.push('title = ?');
        params.push(title);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (isFavorite !== undefined) {
        updates.push('is_favorite = ?');
        params.push(isFavorite ? 1 : 0);
      }
      params.push(id);
      await dbRun(`UPDATE photos SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Update Tags if provided
    if (tags !== undefined) {
      // Clear old tag connections
      await dbRun('DELETE FROM photo_tags WHERE photo_id = ?', [id]);
      
      const tagList = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean);
      for (const tagName of tagList) {
        await dbRun('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tagName]);
        const tagRecord = await dbGet('SELECT id FROM tags WHERE name = ?', [tagName]);
        if (tagRecord) {
          await dbRun('INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)', [id, tagRecord.id]);
        }
      }
    }

    // Update Albums if provided
    if (albumIds !== undefined) {
      // Clear old album links
      await dbRun('DELETE FROM photo_albums WHERE photo_id = ?', [id]);
      for (const albId of albumIds) {
        await dbRun('INSERT OR IGNORE INTO photo_albums (photo_id, album_id) VALUES (?, ?)', [id, albId]);
      }
    }

    // Fetch updated data
    const updatedPhoto = await dbGet(`
      SELECT p.*,
             (SELECT GROUP_CONCAT(t.name) FROM photo_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.photo_id = p.id) AS tags,
             (SELECT GROUP_CONCAT(a.name) FROM photo_albums pa JOIN albums a ON pa.album_id = a.id WHERE pa.photo_id = p.id) AS albums,
             (SELECT GROUP_CONCAT(a.id) FROM photo_albums pa JOIN albums a ON pa.album_id = a.id WHERE pa.photo_id = p.id) AS album_ids
      FROM photos p WHERE p.id = ?
    `, [id]);

    res.json({
      ...updatedPhoto,
      is_favorite: !!updatedPhoto.is_favorite,
      tags: updatedPhoto.tags ? updatedPhoto.tags.split(',') : [],
      albums: updatedPhoto.albums ? updatedPhoto.albums.split(',') : [],
      album_ids: updatedPhoto.album_ids ? updatedPhoto.album_ids.split(',').map(Number) : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Single Photo
app.delete('/api/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const photo = await dbGet('SELECT filename FROM photos WHERE id = ?', [id]);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete physical file
    const filePath = path.join(uploadsDir, photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database records (Foreign Keys take care of relation tables cascade)
    await dbRun('DELETE FROM photos WHERE id = ?', [id]);

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Bulk Delete
app.post('/api/photos/bulk-delete', async (req, res) => {
  try {
    const { photoIds } = req.body;
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'No photo IDs provided' });
    }

    for (const id of photoIds) {
      const photo = await dbGet('SELECT filename FROM photos WHERE id = ?', [id]);
      if (photo) {
        const filePath = path.join(uploadsDir, photo.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // Delete from DB
    const placeholders = photoIds.map(() => '?').join(',');
    await dbRun(`DELETE FROM photos WHERE id IN (${placeholders})`, photoIds);

    res.json({ message: `Successfully deleted ${photoIds.length} photos` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Bulk Add to Album
app.post('/api/photos/bulk-album', async (req, res) => {
  try {
    const { photoIds, albumId } = req.body;
    if (!Array.isArray(photoIds) || photoIds.length === 0 || !albumId) {
      return res.status(400).json({ error: 'Invalid photo IDs or album ID' });
    }

    for (const id of photoIds) {
      await dbRun('INSERT OR IGNORE INTO photo_albums (photo_id, album_id) VALUES (?, ?)', [id, albumId]);
    }

    res.json({ message: `Successfully added ${photoIds.length} photos to the album` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Save Photo Edit (Base64 data url)
app.post('/api/photos/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { imageDataUrl, action, title } = req.body; // action: 'save' | 'saveAsCopy'

    if (!imageDataUrl) {
      return res.status(400).json({ error: 'Image data URL required' });
    }

    // Extract base64
    const matches = imageDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image data' });
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    
    // Choose file extension based on mimeType
    let ext = '.png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
    else if (mimeType.includes('webp')) ext = '.webp';

    const originalPhoto = await dbGet('SELECT * FROM photos WHERE id = ?', [id]);
    if (!originalPhoto) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    let targetFilename;
    let photoIdToReturn;

    if (action === 'saveAsCopy') {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      targetFilename = `edited-${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadsDir, targetFilename);
      fs.writeFileSync(filePath, buffer);

      // Create new database record mirroring the metadata
      const newTitle = title || `${originalPhoto.title} (Edited)`;
      const relativePath = `/uploads/${targetFilename}`;

      // In real scenario we could read base64 dims, for simplicity we copy old dimensions or set null (client can send them or we check)
      const sql = `
        INSERT INTO photos (filename, original_name, title, description, path, mime_type, file_size, width, height, is_favorite)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `;
      const params = [
        targetFilename,
        `edited-${originalPhoto.original_name}`,
        newTitle,
        originalPhoto.description || 'Edited version',
        relativePath,
        mimeType,
        buffer.length,
        originalPhoto.width,
        originalPhoto.height
      ];
      const result = await dbRun(sql, params);
      photoIdToReturn = result.lastID;

      // Copy albums and tags from the original photo
      const originalAlbums = await dbQuery('SELECT album_id FROM photo_albums WHERE photo_id = ?', [id]);
      for (const row of originalAlbums) {
        await dbRun('INSERT INTO photo_albums (photo_id, album_id) VALUES (?, ?)', [photoIdToReturn, row.album_id]);
      }
      const originalTags = await dbQuery('SELECT tag_id FROM photo_tags WHERE photo_id = ?', [id]);
      for (const row of originalTags) {
        await dbRun('INSERT INTO photo_tags (photo_id, tag_id) VALUES (?, ?)', [photoIdToReturn, row.tag_id]);
      }
    } else {
      // Save/Overwrite original photo
      targetFilename = originalPhoto.filename;
      const filePath = path.join(uploadsDir, targetFilename);
      
      // Delete old file first, then write new one (or just overwrite)
      fs.writeFileSync(filePath, buffer);

      // Update database (size and date)
      await dbRun(
        'UPDATE photos SET file_size = ?, mime_type = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
        [buffer.length, mimeType, id]
      );
      photoIdToReturn = id;
    }

    // Retrieve full data
    const finalPhoto = await dbGet(`
      SELECT p.*,
             (SELECT GROUP_CONCAT(t.name) FROM photo_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.photo_id = p.id) AS tags,
             (SELECT GROUP_CONCAT(a.name) FROM photo_albums pa JOIN albums a ON pa.album_id = a.id WHERE pa.photo_id = p.id) AS albums,
             (SELECT GROUP_CONCAT(a.id) FROM photo_albums pa JOIN albums a ON pa.album_id = a.id WHERE pa.photo_id = p.id) AS album_ids
      FROM photos p WHERE p.id = ?
    `, [photoIdToReturn]);

    res.json({
      message: 'Photo edited successfully',
      photo: {
        ...finalPhoto,
        is_favorite: !!finalPhoto.is_favorite,
        tags: finalPhoto.tags ? finalPhoto.tags.split(',') : [],
        albums: finalPhoto.albums ? finalPhoto.albums.split(',') : [],
        album_ids: finalPhoto.album_ids ? finalPhoto.album_ids.split(',').map(Number) : []
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// ALBUMS API ENDPOINTS
// ----------------------------------------------------

// GET: All Albums (with cover and counts)
app.get('/api/albums', async (req, res) => {
  try {
    const query = `
      SELECT a.*, COUNT(pa.photo_id) AS photo_count,
             (SELECT p.path FROM photo_albums pa2 JOIN photos p ON pa2.photo_id = p.id WHERE pa2.album_id = a.id ORDER BY p.created_at DESC LIMIT 1) AS cover_path
      FROM albums a
      LEFT JOIN photo_albums pa ON a.id = pa.album_id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `;
    const albums = await dbQuery(query);
    res.json(albums);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Create Album
app.post('/api/albums', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Album name is required' });
    }

    const check = await dbGet('SELECT id FROM albums WHERE name = ?', [name.trim()]);
    if (check) {
      return res.status(400).json({ error: 'An album with this name already exists' });
    }

    const result = await dbRun('INSERT INTO albums (name, description) VALUES (?, ?)', [name.trim(), description || '']);
    const newAlbum = await dbGet('SELECT * FROM albums WHERE id = ?', [result.lastID]);
    res.status(201).json({
      ...newAlbum,
      photo_count: 0,
      cover_path: null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Update Album Details
app.put('/api/albums/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const album = await dbGet('SELECT * FROM albums WHERE id = ?', [id]);
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    if (name) {
      const check = await dbGet('SELECT id FROM albums WHERE name = ? AND id != ?', [name.trim(), id]);
      if (check) {
        return res.status(400).json({ error: 'An album with this name already exists' });
      }
      await dbRun('UPDATE albums SET name = ?, description = ? WHERE id = ?', [name.trim(), description || '', id]);
    } else {
      await dbRun('UPDATE albums SET description = ? WHERE id = ?', [description || '', id]);
    }

    const updatedAlbum = await dbGet(`
      SELECT a.*, COUNT(pa.photo_id) AS photo_count,
             (SELECT p.path FROM photo_albums pa2 JOIN photos p ON pa2.photo_id = p.id WHERE pa2.album_id = a.id ORDER BY p.created_at DESC LIMIT 1) AS cover_path
      FROM albums a
      LEFT JOIN photo_albums pa ON a.id = pa.album_id
      WHERE a.id = ?
      GROUP BY a.id
    `, [id]);

    res.json(updatedAlbum);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Delete Album (Cascades mappings in photo_albums but keeps photos intact)
app.delete('/api/albums/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const album = await dbGet('SELECT * FROM albums WHERE id = ?', [id]);
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    await dbRun('DELETE FROM albums WHERE id = ?', [id]);
    res.json({ message: 'Album deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// TAGS API ENDPOINTS
// ----------------------------------------------------

// GET: All Tags with counts
app.get('/api/tags', async (req, res) => {
  try {
    const query = `
      SELECT t.name, COUNT(pt.photo_id) AS count
      FROM tags t
      JOIN photo_tags pt ON t.id = pt.tag_id
      GROUP BY t.id
      ORDER BY count DESC, t.name ASC
    `;
    const tags = await dbQuery(query);
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`Express server is running on port ${PORT}`);
});
