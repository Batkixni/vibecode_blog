const { app, startServer } = require('./src/app');

// If app.js is already listening on a port, we don't need to do it again here
// This file serves as the entry point for the application

// 啟動伺服器
const server = startServer();

console.log('Server started successfully'); 