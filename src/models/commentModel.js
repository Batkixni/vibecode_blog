const fs = require('fs');
const path = require('path');

// Comment data storage directory
const COMMENTS_DIR = path.join(__dirname, '../../comments');
const COMMENTS_FILE = path.join(COMMENTS_DIR, 'comments.json');

// Ensure directories and files exist
function ensureDirectoriesExist() {
    if (!fs.existsSync(COMMENTS_DIR)) {
        fs.mkdirSync(COMMENTS_DIR, { recursive: true });
        console.log(`Created directory: ${COMMENTS_DIR}`);
    }

    // Ensure comments.json exists
    if (!fs.existsSync(COMMENTS_FILE)) {
        fs.writeFileSync(COMMENTS_FILE, JSON.stringify({}), 'utf8');
        console.log(`Created comments file: ${COMMENTS_FILE}`);
    }
}

// Initialize directories
ensureDirectoriesExist();

// Load comments
function loadComments() {
    try {
        const data = fs.readFileSync(COMMENTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading comments:', error);
        return {};
    }
}

// Save comments
function saveComments(comments) {
    try {
        fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving comments:', error);
    }
}

// Add comment
function addComment(postId, username, content) {
    const comments = loadComments();
    
    // Initialize if not exists
    if (!comments[postId]) {
        comments[postId] = [];
    }
    
    // Generate comment ID
    const commentId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // Add comment
    comments[postId].push({
        id: commentId,
        username,
        content,
        created: new Date().toISOString()
    });
    
    // Save comments
    saveComments(comments);
    
    return { 
        success: true, 
        message: '評論已發佈',
        commentId
    };
}

// Delete comment
function deleteComment(postId, commentId, username) {
    const comments = loadComments();
    
    // Check if post exists
    if (!comments[postId]) {
        return { success: false, message: '文章不存在' };
    }
    
    // Find comment index
    const commentIndex = comments[postId].findIndex(comment => 
        comment.id === commentId && comment.username === username
    );
    
    // Check if comment exists and belongs to user
    if (commentIndex === -1) {
        return { success: false, message: '無法刪除評論' };
    }
    
    // Remove comment
    comments[postId].splice(commentIndex, 1);
    
    // Save comments
    saveComments(comments);
    
    return { success: true, message: '評論已刪除' };
}

// Get comments for post
function getComments(postId) {
    const comments = loadComments();
    return comments[postId] || [];
}

module.exports = {
    addComment,
    deleteComment,
    getComments
}; 