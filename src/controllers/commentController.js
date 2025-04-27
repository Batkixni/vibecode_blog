const commentModel = require('../models/commentModel');

// Add comment
exports.addComment = (req, res) => {
    try {
        const { postId, content } = req.body;
        const username = req.username; // Added by auth middleware
        
        // Validate inputs
        if (!postId || !content) {
            return res.status(400).json({ success: false, message: '所有欄位都必須填寫' });
        }
        
        // Add comment
        const result = commentModel.addComment(postId, username, content);
        
        // Return result
        res.json(result);
    } catch (error) {
        console.error('評論發佈失敗:', error);
        res.status(500).json({ success: false, message: '評論發佈失敗' });
    }
};

// Delete comment
exports.deleteComment = (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const username = req.username; // Added by auth middleware
        
        // Delete comment
        const result = commentModel.deleteComment(postId, commentId, username);
        
        // Return result
        res.json(result);
    } catch (error) {
        console.error('評論刪除失敗:', error);
        res.status(500).json({ success: false, message: '評論刪除失敗' });
    }
};

// Get comments for post
exports.getComments = (req, res) => {
    try {
        const { postId } = req.params;
        
        // Get comments
        const comments = commentModel.getComments(postId);
        
        // Return comments
        res.json(comments);
    } catch (error) {
        console.error('獲取評論失敗:', error);
        res.status(500).json({ success: false, message: '獲取評論失敗' });
    }
}; 