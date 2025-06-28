// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Global state
let currentStreamId = null;
let statusUpdateInterval = null;
let currentVideoFile = null;

// DOM Elements
const elements = {
    magnetInput: document.getElementById('magnetInput'),
    filenameInput: document.getElementById('filenameInput'),
    streamBtn: document.getElementById('streamBtn'),
    videoSection: document.getElementById('videoSection'),
    videoPlayer: document.getElementById('videoPlayer'),
    videoTitle: document.getElementById('videoTitle'),
    videoProgress: document.getElementById('videoProgress'),
    downloadSpeed: document.getElementById('downloadSpeed'),
    peerCount: document.getElementById('peerCount'),
    statusSection: document.getElementById('statusSection'),
    streamStatus: document.getElementById('streamStatus'),
    overallProgress: document.getElementById('overallProgress'),
    overallSpeed: document.getElementById('overallSpeed'),
    overallPeers: document.getElementById('overallPeers'),
    progressFill: document.getElementById('progressFill'),
    filesSection: document.getElementById('filesSection'),
    filesList: document.getElementById('filesList'),
    activeStreams: document.getElementById('activeStreams'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    errorModal: document.getElementById('errorModal'),
    errorMessage: document.getElementById('errorMessage'),
    // Debug elements
    debugStreamId: document.getElementById('debugStreamId'),
    debugCurrentVideo: document.getElementById('debugCurrentVideo'),
    debugLastUpdate: document.getElementById('debugLastUpdate'),
    debugVideoFiles: document.getElementById('debugVideoFiles')
};

// Utility Functions
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSecond) {
    return formatBytes(bytesPerSecond) + '/s';
}

function showLoading(message = 'Loading...') {
    elements.loadingText.textContent = message;
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorModal.style.display = 'flex';
}

function closeErrorModal() {
    elements.errorModal.style.display = 'none';
}

function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
        section.classList.add('fade-in');
    }
}

function hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'none';
        section.classList.remove('fade-in');
    }
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

async function startStream(magnet, filename = null) {
    const payload = { magnet };
    if (filename) {
        payload.filename = filename;
    }

    return await apiRequest('/stream', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

async function getStreamStatus(streamId) {
    return await apiRequest(`/stream/${streamId}/status`);
}

async function stopStream(streamId) {
    return await apiRequest(`/stream/${streamId}`, {
        method: 'DELETE'
    });
}

async function getActiveStreams() {
    return await apiRequest('/streams');
}

async function getHealthStatus() {
    return await apiRequest('/health');
}

// Stream Management
async function handleStartStream() {
    const magnet = elements.magnetInput.value.trim();
    const filename = elements.filenameInput.value.trim() || null;

    if (!magnet) {
        showError('Please enter a magnet link');
        return;
    }

    if (!magnet.startsWith('magnet:?')) {
        showError('Please enter a valid magnet link');
        return;
    }

    try {
        showLoading('Starting stream...');
        
        const streamData = await startStream(magnet, filename);
        currentStreamId = streamData.streamId;
        
        console.log('Stream started:', streamData);
        
        // Update UI
        elements.videoTitle.textContent = streamData.name;
        showSection('statusSection');
        showSection('filesSection');
        
        // Start status updates
        startStatusUpdates();
        
        // Update files list
        updateFilesList(streamData.files);
        
        hideLoading();
        
        // Show success message
        showNotification('Stream started successfully!', 'success');
        
    } catch (error) {
        hideLoading();
        showError(`Failed to start stream: ${error.message}`);
    }
}

function startStatusUpdates() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }

    // Update status more frequently (every 1 second instead of 2)
    statusUpdateInterval = setInterval(async () => {
        if (currentStreamId) {
            try {
                const status = await getStreamStatus(currentStreamId);
                updateStatusDisplay(status);
                updateFilesList(status.files);
                
                // Auto-play video when ready (check for video files that are streamable)
                if (status.files.length > 0 && !currentVideoFile) {
                    const videoFile = status.files.find(file => 
                        file.streamable && 
                        /\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v|3gp)$/i.test(file.name)
                    );
                    
                    if (videoFile) {
                        console.log('Auto-playing video file:', videoFile.name);
                        playVideo(videoFile);
                    }
                }
                
                // Log progress for debugging
                if (status.files.length > 0) {
                    const videoFiles = status.files.filter(file => 
                        /\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v|3gp)$/i.test(file.name)
                    );
                    if (videoFiles.length > 0) {
                        console.log('Video files progress:', videoFiles.map(f => `${f.name}: ${f.progress}% (streamable: ${f.streamable})`));
                    }
                }
                
            } catch (error) {
                console.error('Status update failed:', error);
                // Stop updates if stream doesn't exist
                if (error.message.includes('not found')) {
                    stopStatusUpdates();
                    currentStreamId = null;
                }
            }
        }
    }, 1000); // Changed from 2000ms to 1000ms for more frequent updates
}

function stopStatusUpdates() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = null;
    }
}

function updateStatusDisplay(status) {
    elements.streamStatus.textContent = status.status;
    elements.overallProgress.textContent = `${status.progress}%`;
    elements.overallSpeed.textContent = `${status.downloadSpeed} MB/s`;
    elements.overallPeers.textContent = status.peers;
    
    // Update progress bar
    elements.progressFill.style.width = `${status.progress}%`;
    
    // Update video stats if playing
    if (currentVideoFile) {
        const file = status.files.find(f => f.name === currentVideoFile.name);
        if (file) {
            elements.videoProgress.textContent = `${file.progress}%`;
            elements.downloadSpeed.textContent = `${status.downloadSpeed} MB/s`;
            elements.peerCount.textContent = `${status.peers} peers`;
        }
    }
    
    // Update debug information
    elements.debugStreamId.textContent = currentStreamId || '-';
    elements.debugCurrentVideo.textContent = currentVideoFile ? currentVideoFile.name : '-';
    elements.debugLastUpdate.textContent = new Date().toLocaleTimeString();
    
    // Count video files
    const videoFiles = status.files.filter(file => 
        /\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v|3gp)$/i.test(file.name)
    );
    const streamableVideos = videoFiles.filter(file => file.streamable);
    elements.debugVideoFiles.textContent = `${streamableVideos.length}/${videoFiles.length} ready to stream`;
}

function updateFilesList(files) {
    elements.filesList.innerHTML = '';
    
    if (files.length === 0) {
        elements.filesList.innerHTML = '<p style="text-align: center; opacity: 0.6; padding: 20px;">Loading files...</p>';
        return;
    }
    
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = formatBytes(file.size);
        
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        
        const fileProgress = document.createElement('div');
        fileProgress.className = 'file-progress';
        
        // Show progress with streaming status
        const isVideo = /\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v|3gp)$/i.test(file.name);
        const progressText = isVideo ? 
            `${file.progress}% ${file.streamable ? '(Ready to stream)' : '(Need 3% to stream)'}` :
            `${file.progress}%`;
        
        fileProgress.textContent = progressText;
        fileProgress.style.color = file.streamable ? '#4ecdc4' : '#ff6b6b';
        
        const fileActions = document.createElement('div');
        fileActions.className = 'file-actions';
        
        if (file.streamable && isVideo) {
            const playBtn = document.createElement('button');
            playBtn.className = 'btn btn-primary';
            playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
            playBtn.onclick = () => playVideo(file);
            fileActions.appendChild(playBtn);
        } else if (isVideo) {
            const waitingText = document.createElement('span');
            waitingText.textContent = `Waiting (${file.progress}%)`;
            waitingText.style.opacity = '0.6';
            fileActions.appendChild(waitingText);
        } else {
            const downloadText = document.createElement('span');
            downloadText.textContent = 'Downloading...';
            downloadText.style.opacity = '0.6';
            fileActions.appendChild(downloadText);
        }
        
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(fileProgress);
        fileItem.appendChild(fileActions);
        
        elements.filesList.appendChild(fileItem);
    });
}

function playVideo(file) {
    if (!file.streamable) {
        showError('File is not ready for streaming yet');
        return;
    }
    
    console.log('Starting video playback for:', file.name);
    currentVideoFile = file;
    const videoUrl = `${API_BASE_URL}/stream/${currentStreamId}/${encodeURIComponent(file.name)}`;
    
    console.log('Video URL:', videoUrl);
    
    // Configure video player for streaming
    elements.videoPlayer.preload = 'metadata';
    elements.videoPlayer.crossOrigin = 'anonymous';
    
    elements.videoPlayer.src = videoUrl;
    elements.videoTitle.textContent = file.name;
    showSection('videoSection');
    
    // Scroll to video section
    elements.videoSection.scrollIntoView({ behavior: 'smooth' });
    
    // Add event listeners for better debugging
    elements.videoPlayer.addEventListener('loadstart', () => {
        console.log('Video load started');
        showLoading('Loading video...');
    });
    
    elements.videoPlayer.addEventListener('loadedmetadata', () => {
        console.log('Video metadata loaded');
    });
    
    elements.videoPlayer.addEventListener('canplay', () => {
        console.log('Video can start playing');
        hideLoading();
    });
    
    elements.videoPlayer.addEventListener('canplaythrough', () => {
        console.log('Video can play through without buffering');
    });
    
    elements.videoPlayer.addEventListener('progress', () => {
        console.log('Video buffering progress');
    });
    
    // Try to play the video
    const playPromise = elements.videoPlayer.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('Video playback started successfully');
            showNotification('Video playback started!', 'success');
        }).catch(error => {
            console.error('Video play failed:', error);
            showError(`Failed to play video: ${error.message}. Please try again.`);
        });
    }
}

async function handleStopStream(streamId) {
    try {
        await stopStream(streamId);
        
        if (streamId === currentStreamId) {
            currentStreamId = null;
            stopStatusUpdates();
            hideSection('videoSection');
            hideSection('statusSection');
            hideSection('filesSection');
            elements.videoPlayer.src = '';
            currentVideoFile = null;
        }
        
        loadActiveStreams();
        showNotification('Stream stopped successfully!', 'success');
        
    } catch (error) {
        showError(`Failed to stop stream: ${error.message}`);
    }
}

async function loadActiveStreams() {
    try {
        const streams = await getActiveStreams();
        elements.activeStreams.innerHTML = '';
        
        if (streams.length === 0) {
            elements.activeStreams.innerHTML = '<p style="text-align: center; opacity: 0.6;">No active streams</p>';
            return;
        }
        
        streams.forEach(stream => {
            const streamItem = document.createElement('div');
            streamItem.className = 'stream-item';
            
            const streamHeader = document.createElement('div');
            streamHeader.className = 'stream-header';
            
            const streamName = document.createElement('div');
            streamName.className = 'stream-name';
            streamName.textContent = stream.name;
            
            const streamActions = document.createElement('div');
            streamActions.className = 'stream-actions';
            
            // Stop button
            const stopBtn = document.createElement('button');
            stopBtn.className = 'btn btn-danger';
            stopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
            stopBtn.onclick = () => handleStopStream(stream.streamId);
            streamActions.appendChild(stopBtn);

            // Open Video button (redirect to first streamable video file)
            const videoFile = stream.files.find(file => file.streamable && /\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v|3gp)$/i.test(file.name));
            if (videoFile && videoFile.streamUrl) {
                const openBtn = document.createElement('button');
                openBtn.className = 'btn btn-primary';
                openBtn.innerHTML = '<i class="fas fa-play"></i> Open Video';
                openBtn.onclick = () => {
                    window.open(videoFile.streamUrl, '_blank');
                };
                streamActions.appendChild(openBtn);
            }
            
            streamHeader.appendChild(streamName);
            streamHeader.appendChild(streamActions);
            
            const streamStats = document.createElement('div');
            streamStats.className = 'stream-stats';
            
            const stats = [
                { label: 'Progress', value: `${stream.progress}%` },
                { label: 'Files', value: stream.files.length }
            ];
            
            stats.forEach(stat => {
                const statDiv = document.createElement('div');
                statDiv.className = 'stream-stat';
                statDiv.innerHTML = `<span>${stat.label}:</span><span>${stat.value}</span>`;
                streamStats.appendChild(statDiv);
            });
            
            streamItem.appendChild(streamHeader);
            streamItem.appendChild(streamStats);
            elements.activeStreams.appendChild(streamItem);
        });
        
    } catch (error) {
        console.error('Failed to load active streams:', error);
    }
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(45deg, #4ecdc4, #44a08d)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(45deg, #ff6b6b, #ff8e53)';
    } else {
        notification.style.background = 'rgba(255, 255, 255, 0.2)';
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Event Listeners
elements.streamBtn.addEventListener('click', handleStartStream);

elements.magnetInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleStartStream();
    }
});

elements.filenameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleStartStream();
    }
});

// Video player event listeners
elements.videoPlayer.addEventListener('error', (e) => {
    console.error('Video error:', e);
    showError('Video playback error. Please try again.');
});

elements.videoPlayer.addEventListener('loadstart', () => {
    showLoading('Loading video...');
});

elements.videoPlayer.addEventListener('canplay', () => {
    hideLoading();
});

// Close modal when clicking outside
elements.errorModal.addEventListener('click', (e) => {
    if (e.target === elements.errorModal) {
        closeErrorModal();
    }
});

// Initialize
async function initialize() {
    try {
        // Check server health
        const health = await getHealthStatus();
        console.log('Server health:', health);
        
        // Load active streams
        await loadActiveStreams();
        
        // Auto-refresh active streams every 10 seconds
        setInterval(loadActiveStreams, 10000);
        
    } catch (error) {
        console.error('Initialization failed:', error);
        showError('Failed to connect to server. Please make sure the server is running.');
    }
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);

// Start the application
document.addEventListener('DOMContentLoaded', initialize); 