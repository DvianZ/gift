require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
const PHOTO_URLS = process.env.PHOTO_URLS || process.env.PHOTO_URLS_JSON;

function normalizeDriveUrl(url) {
  const trimmed = String(url).trim();

  const fileIdMatch = trimmed.match(/(?:\/file\/d\/|id=)([a-zA-Z0-9_-]{25,})/);
  if (fileIdMatch && fileIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
  }

  const shareMatch = trimmed.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (shareMatch && shareMatch[1]) {
    return trimmed; 
  }

  return trimmed;
}

function parsePhotoUrls(value) {
  if (!value) return [];

  let cleaned = value.trim();
  
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.map(url => normalizeDriveUrl(url)).filter(Boolean);
      }
    } catch (e) {
      cleaned = cleaned.slice(1, -1);
    }
  }

  return cleaned
    .split(/[\r\n,|]+/)
    .map(part => part.trim().replace(/^["']|["']$/g, ''))
    .map(url => normalizeDriveUrl(url))
    .filter(Boolean);
}

const axios = require('axios');

app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('URL is required');

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const contentType = response.headers['content-type'];
    res.set('Content-Type', contentType);
    res.send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).send('Error fetching image');
  }
});

function createPhotoResponse(urls) {
  return urls.map((url, index) => ({
    id: `env-${index + 1}`,
    name: url.split('/').pop() || `photo-${index + 1}`,
    url: `/api/proxy-image?url=${encodeURIComponent(url)}`,
    mimeType: 'image/*'
  }));
}

app.get('/api/photos', (req, res) => {
  const envPhotoUrls = parsePhotoUrls(PHOTO_URLS);
  const photos = createPhotoResponse(envPhotoUrls);
  res.json({ photos });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
