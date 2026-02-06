const { spawn } = require('child_process');
const path = require('path');

// Path to yt-dlp executable in the root directory
const fs = require('fs');

// Path determination for cross-platform support
const isWindows = process.platform === 'win32';
const localWinPath = path.join(__dirname, '../../yt-dlp.exe');

// Use env var if set, otherwise local exe on Windows, otherwise 'yt-dlp' (PATH) on Linux
const ytDlpPath = process.env.YT_DLP_PATH || (isWindows ? localWinPath : 'yt-dlp');

// Path to cookies file (Render stores secret files in /etc/secrets/)
const cookiesPath = process.env.COOKIES_PATH || (isWindows ? 'cookies.txt' : '/etc/secrets/cookies.txt');

// Helper to get default args
const getDefaultArgs = () => {
  const args = [
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    '--no-playlist'
  ];

  if (fs.existsSync(cookiesPath)) {
    console.log('🍪 Cookies file found, using it for authentication.');
    args.push('--cookies', cookiesPath);
  } else {
    console.log('⚠️ No cookies file found. YouTube might block this request (Sign-in required).');
  }

  return args;
};

const getVideoInfoYtDlp = (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  console.log('Fetching video info with yt-dlp:', url);

  const args = [
    '--dump-json',
    ...getDefaultArgs(),
    url
  ];

  const ytDlp = spawn(ytDlpPath, args);

  ytDlp.on('error', (err) => {
    console.error('Failed to start yt-dlp process:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'yt-dlp execution failed',
        details: err.message,
        path: ytDlpPath
      });
    }
  });

  let dataBuffer = '';
  let errorBuffer = '';

  ytDlp.stdout.on('data', (data) => {
    dataBuffer += data.toString();
  });

  ytDlp.stderr.on('data', (data) => {
    errorBuffer += data.toString();
  });

  ytDlp.on('close', (code) => {
    if (code !== 0) {
      console.error('yt-dlp error code:', code);
      console.error('yt-dlp stderr:', errorBuffer);
      console.error('Cookies file exists:', fs.existsSync(cookiesPath));
      console.error('Cookies path:', cookiesPath);
      return res.status(500).json({
        error: 'Failed to fetch video info',
        details: errorBuffer,
        debug: {
          code,
          cookiesFound: fs.existsSync(cookiesPath),
          cookiesPath
        }
      });
    }

    try {
      const info = JSON.parse(dataBuffer);
      res.json({
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        author: info.uploader,
        formats: info.formats // Optional: helpful for debugging
      });
    } catch (err) {
      console.error('JSON parse error:', err);
      res.status(500).json({ error: 'Failed to parse video info' });
    }
  });
};

const downloadAudioYtDlp = (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  console.log('Starting audio download with yt-dlp:', url);

  // First fetch info to get the title
  const infoArgs = ['--dump-json', ...getDefaultArgs(), url];
  const infoProcess = spawn(ytDlpPath, infoArgs);

  let infoBuffer = '';

  infoProcess.stdout.on('data', (data) => {
    infoBuffer += data.toString();
  });

  infoProcess.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: 'Failed to fetch video details for download' });
    }

    try {
      const info = JSON.parse(infoBuffer);
      const title = info.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

      res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
      res.setHeader('Content-Type', 'audio/mpeg');

      // stream stdout to res
      const ytDlp = spawn(ytDlpPath, [
        '-o', '-',             // Output to stdout
        '-f', 'bestaudio',     // Best audio
        '--extract-audio',     // Extract audio
        '--audio-format', 'mp3',
        ...getDefaultArgs(),   // Add cookies/user-agent
        url
      ]);

      ytDlp.stdout.pipe(res);

      ytDlp.stderr.on('data', (data) => {
        // Log progress but don't send to res as it corrupts the binary stream
        console.log(`yt-dlp stderr: ${data}`);
      });

      ytDlp.on('close', (code) => {
        console.log('yt-dlp download process exited with code', code);
      });

    } catch (err) {
      console.error('Error parsing info for download:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error during download init' });
      }
    }
  });
};

const downloadVideoYtDlp = (req, res) => {
  const { url, quality } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  console.log('Starting video download with yt-dlp:', url, 'Quality:', quality);

  // First fetch info for title
  const infoArgs = ['--dump-json', ...getDefaultArgs(), url];
  const infoProcess = spawn(ytDlpPath, infoArgs);
  let infoBuffer = '';

  infoProcess.stdout.on('data', (data) => infoBuffer += data.toString());

  infoProcess.on('close', (code) => {
    if (code !== 0) return res.status(500).json({ error: 'Failed to fetch video details' });

    try {
      const info = JSON.parse(infoBuffer);
      const title = info.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

      res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);
      res.setHeader('Content-Type', 'video/mp4');

      // Construct format string
      // If quality is "1080p", we want "bestvideo[height=1080]+bestaudio/best[height=1080]"
      // Default to "best" if no quality specified or "auto"
      let format = 'bestvideo+bestaudio/best';

      if (quality && quality !== 'auto') {
        if (quality.includes('p')) {
          const height = quality.replace('p', '');
          format = `bestvideo[height=${height}]+bestaudio/best[height=${height}]`;
        }
      }

      // Note: merging video+audio usually requires ffmpeg to be in PATH or same dir.
      // Assuming ffmpeg is available since previous codes used fluent-ffmpeg.

      const args = [
        '-o', '-',
        '-f', format,
        ...getDefaultArgs(),
        url
      ];

      const ytDlp = spawn(ytDlpPath, args);

      ytDlp.stdout.pipe(res);
      ytDlp.stderr.on('data', d => console.log(`yt-dlp stderr: ${d}`));

    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.status(500).json({ error: 'Download init failed' });
    }
  });
};

const diag = (req, res) => {
  const binaryExists = fs.existsSync(ytDlpPath) || !isWindows; // On Linux it might be in PATH
  res.json({
    status: 'online',
    platform: process.platform,
    env: process.env.NODE_ENV,
    corsOrigin: process.env.CORS_ORIGIN,
    detectedOrigin: req.get('origin') || 'no origin header',
    ytDlp: {
      path: ytDlpPath,
      exists: binaryExists,
      isWindows
    },
    cookiesFolder: {
      path: cookiesPath,
      exists: fs.existsSync(cookiesPath)
    }
  });
};

module.exports = {
  getVideoInfoYtDlp,
  downloadAudioYtDlp,
  downloadVideoYtDlp,
  diag,
  // Debug function
  debugYtDlp: (req, res) => {
    const { spawn } = require('child_process');
    const ytDlpProcess = spawn(ytDlpPath, ['--version']);

    let output = '';
    let error = '';

    ytDlpProcess.stdout.on('data', (data) => output += data.toString());
    ytDlpProcess.stderr.on('data', (data) => error += data.toString());

    ytDlpProcess.on('close', (code) => {
      res.json({
        path: ytDlpPath,
        version: output.trim(),
        error: error,
        platform: process.platform,
        code: code
      });
    });
  }
};
