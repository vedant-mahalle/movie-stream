import express from 'express';
import WebTorrent from 'webtorrent';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hardcoded environment variables
const PORT = 3000;
const CLEANUP_TIMEOUT = 3600; // 1 hour
const MAX_STREAMS = 10;
const STREAM_PATH = path.join(process.cwd(), 'streams');
const ENABLE_UPLOAD = true;
const MIN_PERCENTAGE = 0;
const MAX_PERCENTAGE = 100;
const PEER_LIMIT = 100;
const BUFFER_SIZE = 1024 * 1024; // 1MB buffer
const UPLOAD_LIMIT = -1; // Unlimited upload
const DOWNLOAD_LIMIT = -1; // Unlimited download
const TRACKERS = [
    "wss://tracker.openwebtorrent.com",
    "wss://tracker.btorrent.xyz",
    "wss://tracker.files.fm:7073/announce",
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://tracker.openbittorrent.com:6969/announce"
];

// Initialize express and WebTorrent
const app = express();
const client = new WebTorrent({
    uploadLimit: UPLOAD_LIMIT,
    downloadLimit: DOWNLOAD_LIMIT,
    maxConns: PEER_LIMIT,
    tracker: {
        announce: TRACKERS
    }
});

const streams = new Map();

// Create stream directory
try {
    if (!fs.existsSync(STREAM_PATH)) {
        fs.mkdirSync(STREAM_PATH, { recursive: true });
        console.log(`Created stream directory: ${STREAM_PATH}`);
    }
} catch (error) {
    console.error(`Failed to create stream directory: ${error.message}`);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(__dirname));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
    next();
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Helper function to get torrent by infoHash
function getTorrentByInfoHash(infoHash) {
    for (const torrent of client.torrents) {
        if (torrent.infoHash === infoHash) {
            return torrent;
        }
    }
    return null;
}

// Helper function to normalize percentage
function normalizePercentage(progress) {
    const percentage = progress * 100;
    return Math.min(Math.max(percentage, MIN_PERCENTAGE), MAX_PERCENTAGE);
}

// Helper function to determine content type
function getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
        '.mp4': 'video/mp4',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
        '.mov': 'video/quicktime',
        '.wmv': 'video/x-ms-wmv',
        '.flv': 'video/x-flv',
        '.webm': 'video/webm',
        '.m4v': 'video/x-m4v',
        '.3gp': 'video/3gpp',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.zip': 'application/zip',
        '.rar': 'application/x-rar-compressed',
        '.7z': 'application/x-7z-compressed'
    };
    return contentTypes[ext] || 'application/octet-stream';
}

// Start streaming a magnet link
app.post('/api/stream', (req, res) => {
    try {
        console.log('Received stream request:', req.body);
        const { magnet, filename } = req.body;
        
        if (!magnet) {
            return res.status(400).json({ error: 'Magnet link is required' });
        }

        // Extract infoHash from magnet link
        const infoHash = magnet.match(/btih:([a-fA-F0-9]+)/i)?.[1]?.toLowerCase();
        if (!infoHash) {
            return res.status(400).json({ error: 'Invalid magnet link' });
        }

        // Check if torrent already exists
        const existingTorrent = getTorrentByInfoHash(infoHash);
        if (existingTorrent) {
            // Find existing streamId
            let existingStreamId;
            for (const [id, stream] of streams.entries()) {
                if (stream.infoHash === infoHash) {
                    existingStreamId = id;
                    break;
                }
            }

            if (existingStreamId) {
                console.log(`Returning existing stream ID: ${existingStreamId}`);
                const files = existingTorrent.files.map(file => ({
                    name: file.name,
                    size: file.length,
                    progress: normalizePercentage(file.progress),
                    streamable: file.progress > 0.1, // Streamable if 10% downloaded
                    streamUrl: file.progress > 0.1 ? `/api/stream/${existingStreamId}/${encodeURIComponent(file.name)}` : null
                }));

                return res.json({
                    streamId: existingStreamId,
                    name: existingTorrent.name,
                    files,
                    status: 'streaming',
                    progress: normalizePercentage(existingTorrent.progress),
                    downloadSpeed: (existingTorrent.downloadSpeed / (1024 * 1024)).toFixed(2),
                    uploaded: ENABLE_UPLOAD ? existingTorrent.uploaded : 0,
                    downloaded: existingTorrent.downloaded,
                    peers: existingTorrent.numPeers,
                    timeRemaining: existingTorrent.timeRemaining
                });
            }
        }

        if (streams.size >= MAX_STREAMS) {
            return res.status(429).json({ error: 'Maximum concurrent streams reached' });
        }

        const streamId = crypto.randomBytes(16).toString('hex');
        const streamPath = path.join(STREAM_PATH, streamId);

        // Create specific stream directory
        fs.mkdirSync(streamPath, { recursive: true });
        
        const torrent = existingTorrent || client.add(magnet, { 
            path: streamPath,
            private: !ENABLE_UPLOAD,
            maxWebConns: ENABLE_UPLOAD ? PEER_LIMIT : 10,
            announce: TRACKERS
        });
        
        streams.set(streamId, torrent);

        // Wait for torrent metadata
        torrent.on('metadata', () => {
            console.log('Got metadata, torrent name:', torrent.name);
        });
        
        torrent.on('error', (err) => {
            console.error(`Torrent error for ${streamId}:`, err);
        });

        // Add cleanup timeout
        torrent.on('done', () => {
            setTimeout(() => {
                torrent.destroy();
                streams.delete(streamId);
                // Clean up directory
                try {
                    fs.rmSync(streamPath, { recursive: true, force: true });
                } catch (error) {
                    console.error(`Failed to clean up directory ${streamPath}:`, error);
                }
            }, CLEANUP_TIMEOUT * 1000);
        });

        const files = torrent.files?.map(file => ({
            name: file.name,
            size: file.length,
            progress: 0,
            streamable: false,
            streamUrl: null
        })) || [];

        res.json({
            streamId,
            name: torrent.name || 'Initializing...',
            status: 'initializing',
            files,
            progress: 0,
            downloadSpeed: '0.00',
            uploaded: 0,
            downloaded: 0,
            peers: 0,
            timeRemaining: 0
        });
    } catch (error) {
        console.error('Stream start error:', error);
        res.status(500).json({ error: 'Failed to start stream' });
    }
});

// Stream a specific file
app.get('/api/stream/:streamId/:filename', (req, res) => {
    try {
        const torrent = streams.get(req.params.streamId);
        if (!torrent) {
            return res.status(404).json({ error: 'Stream not found' });
        }

        const file = torrent.files.find(f => f.name === decodeURIComponent(req.params.filename));
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check if file is streamable (at least 3% downloaded for faster streaming)
        if (file.progress < 0.03) {
            return res.status(400).json({ 
                error: 'File not ready for streaming yet', 
                progress: normalizePercentage(file.progress),
                required: '3%'
            });
        }

        // Get range header for partial content requests
        const range = req.headers.range;
        const fileSize = file.length;
        
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': getContentType(file.name),
                'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            });

            // Create read stream with range
            const stream = file.createReadStream({ start, end });
            stream.pipe(res);
            
            // Handle stream errors
            stream.on('error', (error) => {
                console.error('File stream error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Stream error occurred' });
                }
            });
        } else {
            // Full file request
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': getContentType(file.name),
                'Accept-Ranges': 'bytes',
                'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            });

            // Create read stream for full file
            const stream = file.createReadStream();
            stream.pipe(res);
            
            // Handle stream errors
            stream.on('error', (error) => {
                console.error('File stream error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Stream error occurred' });
                }
            });
        }

        // Handle response errors
        res.on('error', (error) => {
            console.error('Stream response error:', error);
        });

    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({ error: 'Failed to stream file' });
    }
});

// Get stream status
app.get('/api/stream/:streamId/status', (req, res) => {
    try {
        const torrent = streams.get(req.params.streamId);
        if (!torrent) {
            return res.status(404).json({ error: 'Stream not found' });
        }

        const files = torrent.files.map(file => ({
            name: file.name,
            size: file.length,
            progress: normalizePercentage(file.progress),
            streamable: file.progress > 0.03,
            streamUrl: file.progress > 0.03 ? `/api/stream/${req.params.streamId}/${encodeURIComponent(file.name)}` : null
        }));

        res.json({
            status: torrent.done ? 'completed' : 'streaming',
            name: torrent.name,
            files,
            progress: normalizePercentage(torrent.progress),
            downloadSpeed: (torrent.downloadSpeed / (1024 * 1024)).toFixed(2),
            uploaded: ENABLE_UPLOAD ? torrent.uploaded : 0,
            downloaded: torrent.downloaded,
            peers: torrent.numPeers,
            timeRemaining: torrent.timeRemaining
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

// Stop streaming
app.delete('/api/stream/:streamId', (req, res) => {
    try {
        const torrent = streams.get(req.params.streamId);
        if (!torrent) {
            return res.status(404).json({ error: 'Stream not found' });
        }

        const streamPath = path.join(STREAM_PATH, req.params.streamId);
        
        torrent.destroy();
        streams.delete(req.params.streamId);
        
        // Clean up directory
        try {
            fs.rmSync(streamPath, { recursive: true, force: true });
        } catch (error) {
            console.error(`Failed to clean up directory ${streamPath}:`, error);
        }
        
        res.json({ message: 'Stream stopped' });
    } catch (error) {
        console.error('Stop stream error:', error);
        res.status(500).json({ error: 'Failed to stop stream' });
    }
});

// List all active streams
app.get('/api/streams', (req, res) => {
    try {
        const activeStreams = [];
        for (const [streamId, torrent] of streams) {
            activeStreams.push({
                streamId,
                name: torrent.name,
                progress: normalizePercentage(torrent.progress),
                files: torrent.files.map(file => ({
                    name: file.name,
                    size: file.length,
                    progress: normalizePercentage(file.progress),
                    streamable: file.progress > 0.03,
                    streamUrl: file.progress > 0.03 ? 
                        `/api/stream/${streamId}/${encodeURIComponent(file.name)}` : null
                }))
            });
        }
        res.json(activeStreams);
    } catch (error) {
        console.error('Error listing streams:', error);
        res.status(500).json({ error: 'Failed to list streams' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        activeStreams: streams.size,
        maxStreams: MAX_STREAMS,
        uploadEnabled: ENABLE_UPLOAD,
        peerLimit: PEER_LIMIT,
        port: PORT,
        cleanupTimeout: CLEANUP_TIMEOUT
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Magnet Stream Server running at http://localhost:${PORT}`);
    console.log(`Configuration: MAX_STREAMS=${MAX_STREAMS}, ENABLE_UPLOAD=${ENABLE_UPLOAD}, PEER_LIMIT=${PEER_LIMIT}`);
});

export default app;
