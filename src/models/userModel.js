const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// User data storage directory
const USERS_DIR = path.join(__dirname, '../../users');
const USERS_FILE = path.join(USERS_DIR, 'users.json');
const FAVORITES_FILE = path.join(USERS_DIR, 'favorites.json');
const TOKENS_FILE = path.join(USERS_DIR, 'tokens.json');

// Ensure directories and files exist
function ensureDirectoriesExist() {
    if (!fs.existsSync(USERS_DIR)) {
        fs.mkdirSync(USERS_DIR, { recursive: true });
        console.log(`Created directory: ${USERS_DIR}`);
    }

    // Ensure users.json exists
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({}), 'utf8');
        console.log(`Created users file: ${USERS_FILE}`);
    }

    // Ensure favorites.json exists
    if (!fs.existsSync(FAVORITES_FILE)) {
        fs.writeFileSync(FAVORITES_FILE, JSON.stringify({}), 'utf8');
        console.log(`Created favorites file: ${FAVORITES_FILE}`);
    }

    // Ensure tokens.json exists
    if (!fs.existsSync(TOKENS_FILE)) {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify({}), 'utf8');
        console.log(`Created tokens file: ${TOKENS_FILE}`);
    }
}

// Initialize directories
ensureDirectoriesExist();

// Load users
function loadUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading users:', error);
        return {};
    }
}

// Save users
function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

// Load favorites
function loadFavorites() {
    try {
        const data = fs.readFileSync(FAVORITES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading favorites:', error);
        return {};
    }
}

// Save favorites
function saveFavorites(favorites) {
    try {
        fs.writeFileSync(FAVORITES_FILE, JSON.stringify(favorites, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving favorites:', error);
    }
}

// Load tokens
function loadTokens() {
    try {
        const data = fs.readFileSync(TOKENS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading tokens:', error);
        return {};
    }
}

// Save tokens
function saveTokens(tokens) {
    try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving tokens:', error);
    }
}

// Hash password
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { hash, salt };
}

// Verify password
function verifyPassword(password, hash, salt) {
    const hashVerify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === hashVerify;
}

// Generate token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// User registration
function registerUser(username, password, email) {
    const users = loadUsers();
    
    // Check if user exists
    if (users[username]) {
        return { success: false, message: '此用戶名已存在' };
    }
    
    // Check if email exists
    for (const user in users) {
        if (users[user].email === email) {
            return { success: false, message: '此電子郵件已註冊' };
        }
    }
    
    // Hash password
    const { hash, salt } = hashPassword(password);
    
    // Create user
    users[username] = {
        email,
        password: hash,
        salt,
        created: new Date().toISOString()
    };
    
    // Save users
    saveUsers(users);
    
    // Initialize favorites
    const favorites = loadFavorites();
    favorites[username] = [];
    saveFavorites(favorites);
    
    return { success: true, message: '註冊成功' };
}

// User login
function loginUser(username, password) {
    const users = loadUsers();
    
    // Check if user exists
    if (!users[username]) {
        return { success: false, message: '用戶名或密碼錯誤' };
    }
    
    // Verify password
    const user = users[username];
    if (!verifyPassword(password, user.password, user.salt)) {
        return { success: false, message: '用戶名或密碼錯誤' };
    }
    
    // Generate token
    const token = generateToken();
    const tokens = loadTokens();
    
    // Add token with expiry (7 days)
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    
    tokens[token] = {
        username,
        expiry: expiry.toISOString()
    };
    
    // Save tokens
    saveTokens(tokens);
    
    return { 
        success: true, 
        message: '登入成功', 
        token,
        username
    };
}

// Verify token
function verifyToken(token) {
    const tokens = loadTokens();
    
    // Check if token exists
    if (!tokens[token]) {
        return { valid: false };
    }
    
    // Check if token is expired
    const expiry = new Date(tokens[token].expiry);
    if (expiry < new Date()) {
        // Remove expired token
        delete tokens[token];
        saveTokens(tokens);
        return { valid: false };
    }
    
    return { 
        valid: true, 
        username: tokens[token].username 
    };
}

// Logout user
function logoutUser(token) {
    const tokens = loadTokens();
    
    // Check if token exists
    if (tokens[token]) {
        delete tokens[token];
        saveTokens(tokens);
        return { success: true, message: '登出成功' };
    }
    
    return { success: false, message: '無效的令牌' };
}

// Add favorite
function addFavorite(username, postId) {
    const favorites = loadFavorites();
    
    // Initialize if not exists
    if (!favorites[username]) {
        favorites[username] = [];
    }
    
    // Check if already favorited
    if (!favorites[username].includes(postId)) {
        favorites[username].push(postId);
        saveFavorites(favorites);
    }
    
    return { success: true, message: '已加入收藏' };
}

// Remove favorite
function removeFavorite(username, postId) {
    const favorites = loadFavorites();
    
    // Check if user exists in favorites
    if (favorites[username]) {
        favorites[username] = favorites[username].filter(id => id !== postId);
        saveFavorites(favorites);
    }
    
    return { success: true, message: '已移除收藏' };
}

// Get favorites
function getFavorites(username) {
    const favorites = loadFavorites();
    return favorites[username] || [];
}

// Check if post is favorited
function isFavorite(username, postId) {
    const favorites = loadFavorites();
    return favorites[username] && favorites[username].includes(postId);
}

module.exports = {
    registerUser,
    loginUser,
    verifyToken,
    logoutUser,
    addFavorite,
    removeFavorite,
    getFavorites,
    isFavorite
}; 