const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store servers and users
const servers = new Map(); // serverId -> { name, users: Map, password }
const userSockets = new Map(); // socketId -> { username, serverId }

// Default server
const DEFAULT_SERVER = 'general';
servers.set(DEFAULT_SERVER, {
    name: 'General Chat',
    users: new Map(),
    password: null
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send available servers list
    socket.emit('serversList', getServersList());

    // Handle creating a server
    socket.on('createServer', (data) => {
        const { serverName, password } = data;
        const serverId = generateServerId();
        
        servers.set(serverId, {
            name: serverName,
            users: new Map(),
            password: password || null
        });
        
        io.emit('serversList', getServersList());
        console.log(`Server "${serverName}" created with ID: ${serverId}`);
        
        socket.emit('serverCreated', { serverId, serverName });
    });

    // Handle joining a server
    socket.on('joinServer', (data) => {
        const { serverId, username, password } = data;
        
        if (!servers.has(serverId)) {
            socket.emit('joinError', 'Server not found');
            return;
        }
        
        const server = servers.get(serverId);
        
        // Check password if server is protected
        if (server.password && server.password !== password) {
            socket.emit('joinError', 'Incorrect password');
            return;
        }
        
        // Leave current server if user is in one
        leaveCurrentServer(socket.id);
        
        // Join new server
        server.users.set(socket.id, username);
        userSockets.set(socket.id, { username, serverId });
        
        // Join socket room
        socket.join(serverId);
        
        // Notify others in the server
        socket.to(serverId).emit('userJoined', username);
        
        // Send server info and user list to the new user
        socket.emit('serverJoined', {
            serverId,
            serverName: server.name,
            userList: Array.from(server.users.values())
        });
        
        // Send updated user list to all users in the server
        io.to(serverId).emit('userList', Array.from(server.users.values()));
        
        console.log(`${username} joined server "${server.name}" (${serverId})`);
    });

    // Handle leaving server
    socket.on('leaveServer', () => {
        leaveCurrentServer(socket.id);
        socket.emit('serverLeft');
    });
    
    // Admin functions
    socket.on('resetAllServers', (adminPassword) => {
        // Simple admin password check (you can change this)
        if (adminPassword !== 'admin123') {
            socket.emit('adminError', 'Invalid admin password');
            return;
        }
        
        resetAllServers();
        console.log('Admin reset: All servers have been reset');
        socket.emit('adminSuccess', 'All servers have been reset');
    });
    
    socket.on('endChatForAll', (adminPassword) => {
        // Simple admin password check (you can change this)
        if (adminPassword !== 'admin123') {
            socket.emit('adminError', 'Invalid admin password');
            return;
        }
        
        endChatForAllUsers();
        console.log('Admin action: Chat ended for all users');
        socket.emit('adminSuccess', 'Chat ended for all users');
    });
    
    // Keep the original join handler for backward compatibility
    socket.on('join', (username) => {
        // Join the default server
        socket.emit('joinServer', { serverId: DEFAULT_SERVER, username, password: null });
    });

    // Handle messages
    socket.on('message', (data) => {
        const userInfo = userSockets.get(socket.id);
        if (userInfo && servers.has(userInfo.serverId)) {
            const messageData = {
                username: userInfo.username,
                message: data.message,
                timestamp: new Date().toLocaleTimeString()
            };
            io.to(userInfo.serverId).emit('message', messageData);
        }
    });

    // Handle typing indicator
    socket.on('typing', (isTyping) => {
        const userInfo = userSockets.get(socket.id);
        if (userInfo && servers.has(userInfo.serverId)) {
            socket.to(userInfo.serverId).emit('typing', { 
                username: userInfo.username, 
                isTyping 
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        leaveCurrentServer(socket.id);
        console.log('User disconnected:', socket.id);
    });
});

// Helper functions
function generateServerId() {
    return Math.random().toString(36).substring(2, 15);
}

function getServersList() {
    const serversList = [];
    servers.forEach((server, serverId) => {
        serversList.push({
            id: serverId,
            name: server.name,
            userCount: server.users.size,
            hasPassword: !!server.password
        });
    });
    return serversList;
}

function leaveCurrentServer(socketId) {
    const userInfo = userSockets.get(socketId);
    if (userInfo && servers.has(userInfo.serverId)) {
        const server = servers.get(userInfo.serverId);
        const username = userInfo.username;
        
        // Remove user from server
        server.users.delete(socketId);
        userSockets.delete(socketId);
        
        // Leave socket room
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
            socket.leave(userInfo.serverId);
            
            // Notify others in the server
            socket.to(userInfo.serverId).emit('userLeft', username);
            
            // Send updated user list to remaining users in the server
            io.to(userInfo.serverId).emit('userList', Array.from(server.users.values()));
        }
        
        console.log(`${username} left server "${server.name}" (${userInfo.serverId})`);
        
        // Clean up empty servers (except default)
        if (server.users.size === 0 && userInfo.serverId !== DEFAULT_SERVER) {
            servers.delete(userInfo.serverId);
            io.emit('serversList', getServersList());
            console.log(`Empty server "${server.name}" (${userInfo.serverId}) removed`);
        }
    }
}

function resetAllServers() {
    // Remove all users from all servers
    userSockets.forEach((userInfo, socketId) => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
            socket.leave(userInfo.serverId);
            socket.emit('forceDisconnect', 'All servers have been reset by admin');
        }
    });
    
    // Clear all data
    servers.clear();
    userSockets.clear();
    
    // Recreate default server
    servers.set(DEFAULT_SERVER, {
        name: 'General Chat',
        users: new Map(),
        password: null
    });
    
    // Broadcast updated server list
    io.emit('serversList', getServersList());
    io.emit('systemMessage', 'All servers have been reset. Please rejoin a server.');
}

function endChatForAllUsers() {
    // Send disconnect message to all users
    userSockets.forEach((userInfo, socketId) => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
            socket.emit('forceDisconnect', 'Chat has been ended by admin');
        }
    });
    
    // Clear all users but keep servers
    servers.forEach((server, serverId) => {
        server.users.clear();
        io.to(serverId).emit('userList', []);
    });
    
    userSockets.clear();
    
    // Broadcast updated server list
    io.emit('serversList', getServersList());
    io.emit('systemMessage', 'Chat session has been ended by admin.');
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Local WiFi Messenger running on port ${PORT}`);
    console.log(`Access it at: http://localhost:${PORT}`);
    
    // Get local IP address
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    
    Object.keys(networkInterfaces).forEach((interfaceName) => {
        networkInterfaces[interfaceName].forEach((interface) => {
            if (interface.family === 'IPv4' && !interface.internal) {
                console.log(`Or from other devices: http://${interface.address}:${PORT}`);
            }
        });
    });
});
