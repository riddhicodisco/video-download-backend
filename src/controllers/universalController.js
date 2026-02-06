const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Path determination
const isWindows = process.platform === 'win32';
const localWinPath = path.join(__dirname, '../../yt-dlp.exe');
const ytDlpPath = process.env.YT_DLP_PATH || (isWindows ? localWinPath : 'yt-dlp');
const cookiesPath = process.env.COOKIES_PATH || (isWindows ? 'cookies.txt' : '/etc/secrets/cookies.txt');

// Method 1: Noembed API (Free, no cookies required)
const getVideoInfoNoembed = async (url) => {
  try {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1];
    if (!videoId) throw new Error('Invalid YouTube URL');

    const response = await axios.get(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    
    return {
      title: response.data.title,
      thumbnail: response.data.thumbnail_url,
      author: response.data.author_name,
      duration: null, // Noembed doesn't provide duration
      formats: [], // Basic info only
      method: 'noembed',
      reliable: true
    };
  } catch (error) {
    throw new Error(`Noembed failed: ${error.message}`);
  }
};

// Method 2: yt-dlp with multiple fallbacks
const getVideoInfoYtDlp = async (url) => {
  const methods = [
    { name: 'with cookies', useCookies: true, useCustomUA: false },
    { name: 'without cookies', useCookies: false, useCustomUA: false },
    { name: 'different UA', useCookies: false, useCustomUA: true },
    { name: 'mobile UA', useCookies: false, useCustomUA: true, mobile: true }
  ];

  for (const method of methods) {
    try {
      const result = await tryYtDlpMethod(url, method);
      if (result) return { ...result, method: method.name };
    } catch (error) {
      console.log(`Method ${method.name} failed:`, error.message);
      continue;
    }
  }
  
  throw new Error('All yt-dlp methods failed');
};

const tryYtDlpMethod = (url, method) => {
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      '--no-check-certificate'
    ];

    // User agents
    if (method.mobile) {
      args.push('--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
    } else if (method.useCustomUA) {
      args.push('--user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    } else {
      args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }

    // Add cookies if available
    if (method.useCookies && fs.existsSync(cookiesPath)) {
      args.push('--cookies', cookiesPath);
    }

    args.push(url);

    const ytDlp = spawn(ytDlpPath, args);
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
        reject(new Error(`Exit code ${code}: ${errorBuffer}`));
        return;
      }

      try {
        const info = JSON.parse(dataBuffer);
        resolve({
          title: info.title,
          thumbnail: info.thumbnail,
          duration: info.duration,
          author: info.uploader,
          formats: info.formats
        });
      } catch (err) {
        reject(new Error(`JSON parse failed: ${err.message}`));
      }
    });

    ytDlp.on('error', (err) => {
      reject(new Error(`Spawn failed: ${err.message}`));
    });
  });
};

// Universal controller that tries all methods
const getVideoInfoUniversal = async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  console.log('Universal video info fetch for:', url);

  try {
    // Method 1: Try Noembed first (always works for basic info)
    console.log('Trying Noembed API...');
    const noembedResult = await getVideoInfoNoembed(url);
    console.log('Noembed success:', noembedResult.title);

    // Method 2: Try yt-dlp for detailed info (formats, duration)
    console.log('Trying yt-dlp for detailed info...');
    try {
      const ytDlpResult = await getVideoInfoYtDlp(url);
      console.log('yt-dlp success with method:', ytDlpResult.method);
      
      // Combine results - use yt-dlp data but keep noembed as backup
      return res.json({
        ...ytDlpResult,
        fallbackAvailable: true,
        noembedBackup: noembedResult
      });
    } catch (ytDlpError) {
      console.log('yt-dlp failed, using Noembed only');
      // Return noembed result if yt-dlp fails
      return res.json({
        ...noembedResult,
        warning: 'Limited functionality - using basic info only',
        ytDlpError: ytDlpError.message
      });
    }

  } catch (error) {
    console.error('All methods failed:', error);
    return res.status(500).json({
      error: 'Unable to fetch video information',
      details: error.message,
      suggestion: 'Please check the URL and try again',
      troubleshooting: [
        'Make sure the video is public and not region-restricted',
        'Try a different YouTube video',
        'The service might be temporarily unavailable'
      ]
    });
  }
};

// Download functions with fallbacks
const downloadUniversal = async (req, res, type) => {
  const { url, quality } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  console.log(`Universal ${type} download for:`, url);

  try {
    // Try to get video info first
    let info;
    try {
      const ytDlpResult = await getVideoInfoYtDlp(url);
      info = ytDlpResult;
    } catch (error) {
      // Fallback to noembed for basic info
      info = await getVideoInfoNoembed(url);
    }

    const title = info.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
    
    if (type === 'audio') {
      res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
      res.setHeader('Content-Type', 'audio/mpeg');
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);
      res.setHeader('Content-Type', 'video/mp4');
    }

    // Try yt-dlp download with fallbacks
    const downloadMethods = [
      { useCookies: true, useCustomUA: false },
      { useCookies: false, useCustomUA: false },
      { useCookies: false, useCustomUA: true }
    ];

    for (const method of downloadMethods) {
      try {
        await performDownload(url, res, type, quality, method);
        return; // Success
      } catch (error) {
        console.log(`Download method failed:`, error.message);
        continue;
      }
    }

    // All download methods failed
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Download failed',
        details: 'All download methods failed',
        suggestion: 'Try again later or use a different video',
        videoInfo: info
      });
    }
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Download initialization failed',
        details: error.message
      });
    }
  }
};

const performDownload = (url, res, type, quality, method) => {
  return new Promise((resolve, reject) => {
    const args = ['-o', '-'];

    if (type === 'audio') {
      args.push('-f', 'bestaudio', '--extract-audio', '--audio-format', 'mp3');
    } else {
      let format = 'bestvideo+bestaudio/best';
      if (quality && quality !== 'auto' && quality.includes('p')) {
        const height = quality.replace('p', '');
        format = `bestvideo[height=${height}]+bestaudio/best[height=${height}]`;
      }
      args.push('-f', format);
    }

    args.push('--no-playlist', '--no-check-certificate');

    // User agent
    if (method.useCustomUA) {
      args.push('--user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    } else {
      args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }

    // Cookies
    if (method.useCookies && fs.existsSync(cookiesPath)) {
      args.push('--cookies', cookiesPath);
    }

    args.push(url);

    const ytDlp = spawn(ytDlpPath, args);
    let errorBuffer = '';

    ytDlp.stdout.pipe(res);

    ytDlp.stderr.on('data', (data) => {
      errorBuffer += data.toString();
    });

    ytDlp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Download failed with code ${code}: ${errorBuffer}`));
      } else {
        resolve();
      }
    });

    ytDlp.on('error', (err) => {
      reject(new Error(`Download spawn failed: ${err.message}`));
    });
  });
};

module.exports = {
  getVideoInfoUniversal,
  downloadVideoUniversal: (req, res) => downloadUniversal(req, res, 'video'),
  downloadAudioUniversal: (req, res) => downloadUniversal(req, res, 'audio')
};
