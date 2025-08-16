export function parseGoogleTakeoutFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let data;

        // Try to parse as JSON
        try {
          data = JSON.parse(content);
        } catch (jsonError) {
          // If not JSON, try to extract JSON from HTML (some takeout files come as HTML)
          const jsonMatch = content.match(/var data = (\[.*?\]);/s);
          if (jsonMatch) {
            data = JSON.parse(jsonMatch[1]);
          } else {
            throw new Error('Could not parse file as JSON or HTML with embedded JSON');
          }
        }

        // Parse YouTube watch history format
        const videos = [];

        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            if (item.titleUrl && item.title) {
              // Extract video ID from URL
              const videoId = extractVideoId(item.titleUrl);
              if (videoId) {
                videos.push({
                  id: videoId,
                  title: item.title.replace('Watched ', ''),
                  channel: item.subtitles && item.subtitles[0] ? item.subtitles[0].name : 'Unknown Channel',
                  watchedAt: item.time || new Date().toISOString(),
                  url: item.titleUrl,
                  description: item.description || ''
                });
              }
            }
          });
        }

        resolve({
          videos,
          totalCount: videos.length,
          parsedAt: new Date().toISOString()
        });

      } catch (error) {
        reject(new Error(`Failed to parse Google Takeout file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

function extractVideoId(url) {
  if (!url) return null;

  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function validateTakeoutFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.type !== 'application/json' && file.type !== 'text/html' && !file.name.endsWith('.json')) {
    return { valid: false, error: 'File must be a JSON file from Google Takeout' };
  }

  if (file.size > 50 * 1024 * 1024) { // 50MB limit
    return { valid: false, error: 'File too large. Please use a smaller takeout file.' };
  }

  return { valid: true };
}

export function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
