# Magnet Stream - Movie Streaming Application

A modern web application that allows you to stream movies and other media files directly from magnet links using WebTorrent technology.

## Features

- 🎬 **Stream Movies**: Stream video files directly from magnet links without downloading
- 🌐 **Web Interface**: Beautiful, responsive web interface with dark theme
- 📊 **Real-time Status**: Live progress tracking, download speeds, and peer information
- 📁 **File Management**: Browse and select specific files from torrents
- 🎥 **Video Player**: Built-in HTML5 video player with controls
- 📱 **Mobile Responsive**: Works on desktop, tablet, and mobile devices
- ⚡ **Fast Streaming**: Starts streaming as soon as 10% of the file is downloaded
- 🔄 **Multiple Streams**: Support for multiple concurrent streams
- 🛑 **Stream Control**: Start, stop, and manage active streams

## Screenshots

The application features a modern, glassmorphism design with:
- Gradient backgrounds and blur effects
- Real-time progress bars and statistics
- Interactive file lists with play buttons
- Responsive video player
- Notification system for user feedback

## Installation

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Setup

1. **Clone or download the project files**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   node stream-server.js
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Starting a Stream

1. **Get a magnet link** from your preferred torrent site
2. **Paste the magnet link** into the input field
3. **Optionally specify a filename** if you want to stream a specific file
4. **Click "Start Streaming"** or press Enter
5. **Wait for the torrent to initialize** and start downloading
6. **Click "Play"** on any video file once it becomes available (10% downloaded)

### Managing Streams

- **View active streams** in the "Active Streams" section
- **Stop streams** using the stop button
- **Monitor progress** with real-time statistics
- **Browse files** in the torrent and select which ones to stream

### Video Playback

- **Automatic detection** of video files in torrents
- **HTML5 video player** with standard controls
- **Seek support** for partially downloaded content
- **Multiple format support** (MP4, AVI, MKV, MOV, etc.)

## Configuration

The server can be configured by modifying the constants in `stream-server.js`:

```javascript
const PORT = 3000;                    // Server port
const MAX_STREAMS = 10;               // Maximum concurrent streams
const CLEANUP_TIMEOUT = 3600;         // Auto-cleanup timeout (seconds)
const ENABLE_UPLOAD = true;           // Enable seeding
const PEER_LIMIT = 100;               // Maximum peer connections
```

## API Endpoints

The server provides a REST API for programmatic access:

- `POST /api/stream` - Start a new stream
- `GET /api/stream/:streamId/status` - Get stream status
- `GET /api/stream/:streamId/:filename` - Stream a specific file
- `DELETE /api/stream/:streamId` - Stop a stream
- `GET /api/streams` - List all active streams
- `GET /api/health` - Server health check

## Technical Details

### Frontend
- **HTML5**: Semantic markup with modern features
- **CSS3**: Flexbox, Grid, animations, and responsive design
- **JavaScript**: ES6+ with async/await, fetch API
- **No frameworks**: Vanilla JavaScript for performance

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web framework
- **WebTorrent**: BitTorrent client for streaming
- **ES Modules**: Modern JavaScript module system

### Streaming Technology
- **WebTorrent**: Pure JavaScript BitTorrent client
- **Range Requests**: HTTP range requests for video seeking
- **Progressive Download**: Stream as you download
- **Peer Discovery**: Multiple tracker support

## Browser Support

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

### Common Issues

1. **"Failed to connect to server"**
   - Make sure the server is running on port 3000
   - Check if the port is not blocked by firewall

2. **"File not ready for streaming yet"**
   - Wait for the file to reach 10% download progress
   - Check if there are enough peers available

3. **"Video playback error"**
   - Try refreshing the page
   - Check if the video format is supported by your browser
   - Ensure the file is actually a video file

4. **Slow streaming**
   - Check your internet connection
   - Look for more peers in the status section
   - Consider using popular torrents with more seeders

### Performance Tips

- Use popular torrents with many seeders for better performance
- Close unnecessary browser tabs to free up memory
- Use a wired internet connection for better stability
- Consider using a VPN for privacy

## Legal Notice

This application is for educational and personal use only. Please ensure you have the right to access the content you're streaming. The developers are not responsible for any copyright infringement.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the application.

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues or have questions, please check the troubleshooting section above or create an issue in the project repository. # movie-stream
# movie-stream
# movie-stream
