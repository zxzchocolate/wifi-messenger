class LocalMessenger {
    constructor() {
        this.socket = null;
        this.currentUsername = '';
        this.currentServerId = null;
        this.currentServerName = '';
        this.typingTimeout = null;
        this.isTyping = false;
        this.pendingServerJoin = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeSocket();
    }

    initializeElements() {
        // Server select elements
        this.serverSelectScreen = document.getElementById('serverSelectScreen');
        this.chatScreen = document.getElementById('chatScreen');
        this.usernameInput = document.getElementById('usernameInput');
        this.serversList = document.getElementById('serversList');
        this.newServerName = document.getElementById('newServerName');
        this.newServerPassword = document.getElementById('newServerPassword');
        this.createServerBtn = document.getElementById('createServerBtn');
        
        // Password modal elements
        this.passwordModal = document.getElementById('passwordModal');
        this.serverPasswordInput = document.getElementById('serverPasswordInput');
        this.passwordSubmitBtn = document.getElementById('passwordSubmitBtn');
        this.passwordCancelBtn = document.getElementById('passwordCancelBtn');
        
        // Admin panel elements
        this.adminPasswordInput = document.getElementById('adminPasswordInput');
        this.resetServersBtn = document.getElementById('resetServersBtn');
        this.endChatBtn = document.getElementById('endChatBtn');
        this.adminMessage = document.getElementById('adminMessage');

        // Chat elements
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.usersList = document.getElementById('usersList');
        this.userCount = document.getElementById('userCount');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.serverTitle = document.getElementById('serverTitle');
        this.leaveServerBtn = document.getElementById('leaveServerBtn');
    }

    bindEvents() {
        // Server management events
        this.createServerBtn.addEventListener('click', () => this.createServer());
        this.newServerName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createServer();
        });
        this.newServerPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createServer();
        });
        
        // Password modal events
        this.passwordSubmitBtn.addEventListener('click', () => this.submitPassword());
        this.passwordCancelBtn.addEventListener('click', () => this.hidePasswordModal());
        this.serverPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitPassword();
        });
        
        // Chat events
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            } else {
                this.handleTyping();
            }
        });
        
        this.messageInput.addEventListener('input', () => {
            this.handleTyping();
        });
        
        this.leaveServerBtn.addEventListener('click', () => this.leaveServer());
        
        // Admin events
        this.resetServersBtn.addEventListener('click', () => this.resetAllServers());
        this.endChatBtn.addEventListener('click', () => this.endChatForAll());
    }

    validateUsername() {
        const username = this.usernameInput.value.trim();
        
        if (!username) {
            alert('Please enter a username');
            return false;
        }

        if (username.length < 2) {
            alert('Username must be at least 2 characters long');
            return false;
        }
        
        this.currentUsername = username;
        return true;
    }
    
    createServer() {
        if (!this.validateUsername()) return;
        
        const serverName = this.newServerName.value.trim();
        if (!serverName) {
            alert('Please enter a server name');
            return;
        }
        
        const password = this.newServerPassword.value.trim() || null;
        
        this.socket.emit('createServer', {
            serverName,
            password
        });
        
        this.newServerName.value = '';
        this.newServerPassword.value = '';
    }
    
    joinServer(serverId, serverName, hasPassword) {
        if (!this.validateUsername()) return;
        
        if (hasPassword) {
            this.pendingServerJoin = { serverId, serverName };
            this.showPasswordModal();
        } else {
            this.socket.emit('joinServer', {
                serverId,
                username: this.currentUsername,
                password: null
            });
        }
    }
    
    leaveServer() {
        this.socket.emit('leaveServer');
    }
    
    showPasswordModal() {
        this.passwordModal.classList.remove('hidden');
        this.serverPasswordInput.focus();
    }
    
    hidePasswordModal() {
        this.passwordModal.classList.add('hidden');
        this.serverPasswordInput.value = '';
        this.pendingServerJoin = null;
    }
    
    submitPassword() {
        if (!this.pendingServerJoin) return;
        
        const password = this.serverPasswordInput.value.trim();
        
        this.socket.emit('joinServer', {
            serverId: this.pendingServerJoin.serverId,
            username: this.currentUsername,
            password: password
        });
        
        this.hidePasswordModal();
    }
    
    resetAllServers() {
        const adminPassword = this.adminPasswordInput.value.trim();
        if (!adminPassword) {
            this.showAdminMessage('Please enter admin password', 'error');
            return;
        }
        
        if (!confirm('Are you sure you want to reset ALL servers? This will disconnect all users and delete all servers except General Chat.')) {
            return;
        }
        
        this.socket.emit('resetAllServers', adminPassword);
        this.adminPasswordInput.value = '';
    }
    
    endChatForAll() {
        const adminPassword = this.adminPasswordInput.value.trim();
        if (!adminPassword) {
            this.showAdminMessage('Please enter admin password', 'error');
            return;
        }
        
        if (!confirm('Are you sure you want to end chat for ALL users? This will disconnect everyone from their current servers.')) {
            return;
        }
        
        this.socket.emit('endChatForAll', adminPassword);
        this.adminPasswordInput.value = '';
    }
    
    showAdminMessage(message, type = 'info') {
        this.adminMessage.textContent = message;
        this.adminMessage.className = `admin-message ${type}`;
        
        // Clear message after 5 seconds
        setTimeout(() => {
            this.adminMessage.textContent = '';
            this.adminMessage.className = 'admin-message';
        }, 5000);
    }

    initializeSocket() {
        this.socket = io();

        // Connection events
        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
            if (this.currentServerId) {
                this.addSystemMessage('Disconnected from server. Trying to reconnect...');
            }
        });

        this.socket.on('connect_error', () => {
            this.updateConnectionStatus(false);
            this.addSystemMessage('Connection failed. Please check your network.');
        });

        // Server management events
        this.socket.on('serversList', (servers) => {
            this.updateServersList(servers);
        });
        
        this.socket.on('serverCreated', (data) => {
            this.addSystemMessage(`Server "${data.serverName}" created successfully!`);
        });
        
        this.socket.on('serverJoined', (data) => {
            this.currentServerId = data.serverId;
            this.currentServerName = data.serverName;
            this.updateUsersList(data.userList);
            this.showChatScreen();
        });
        
        this.socket.on('serverLeft', () => {
            this.showServerSelectScreen();
        });
        
        this.socket.on('joinError', (error) => {
            alert(`Failed to join server: ${error}`);
        });
        
        // Admin events
        this.socket.on('adminSuccess', (message) => {
            this.showAdminMessage(message, 'success');
        });
        
        this.socket.on('adminError', (error) => {
            this.showAdminMessage(error, 'error');
        });
        
        this.socket.on('forceDisconnect', (reason) => {
            alert(`Disconnected: ${reason}`);
            this.showServerSelectScreen();
        });
        
        this.socket.on('systemMessage', (message) => {
            this.showAdminMessage(message, 'info');
        });

        // User events
        this.socket.on('userJoined', (username) => {
            this.addSystemMessage(`${username} joined the server`);
        });

        this.socket.on('userLeft', (username) => {
            this.addSystemMessage(`${username} left the server`);
        });

        this.socket.on('userList', (users) => {
            this.updateUsersList(users);
        });

        // Message events
        this.socket.on('message', (data) => {
            this.addMessage(data);
        });

        // Typing events
        this.socket.on('typing', (data) => {
            this.updateTypingIndicator(data);
        });
    }

    showChatScreen() {
        this.serverSelectScreen.classList.add('hidden');
        this.chatScreen.classList.remove('hidden');
        this.serverTitle.textContent = this.currentServerName;
        this.messageInput.focus();
        
        // Clear messages
        this.messagesContainer.innerHTML = '<div class="welcome-message">Welcome to the server! Start typing to send messages.</div>';
    }
    
    showServerSelectScreen() {
        this.chatScreen.classList.add('hidden');
        this.serverSelectScreen.classList.remove('hidden');
        this.currentServerId = null;
        this.currentServerName = '';
        this.usernameInput.focus();
    }
    
    updateServersList(servers) {
        this.serversList.innerHTML = '';
        
        if (servers.length === 0) {
            this.serversList.innerHTML = '<div class="no-servers">No servers available</div>';
            return;
        }
        
        servers.forEach(server => {
            const serverDiv = document.createElement('div');
            serverDiv.className = 'server-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'server-name';
            nameSpan.textContent = server.name;
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'server-info';
            
            const usersSpan = document.createElement('span');
            usersSpan.className = 'user-count';
            usersSpan.textContent = `${server.userCount} users`;
            
            const joinBtn = document.createElement('button');
            joinBtn.className = 'join-server-btn';
            joinBtn.textContent = 'Join';
            joinBtn.addEventListener('click', () => {
                this.joinServer(server.id, server.name, server.hasPassword);
            });
            
            if (server.hasPassword) {
                const lockIcon = document.createElement('span');
                lockIcon.className = 'lock-icon';
                lockIcon.textContent = '🔒';
                infoDiv.appendChild(lockIcon);
            }
            
            infoDiv.appendChild(usersSpan);
            infoDiv.appendChild(joinBtn);
            
            serverDiv.appendChild(nameSpan);
            serverDiv.appendChild(infoDiv);
            
            this.serversList.appendChild(serverDiv);
        });
    }

    updateConnectionStatus(isConnected) {
        if (isConnected) {
            this.connectionStatus.classList.remove('disconnected');
            this.connectionStatus.textContent = '●';
        } else {
            this.connectionStatus.classList.add('disconnected');
            this.connectionStatus.textContent = '●';
        }
    }

    updateUsersList(users) {
        this.usersList.innerHTML = '';
        
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user === this.currentUsername ? `${user} (You)` : user;
            if (user === this.currentUsername) {
                li.style.fontWeight = 'bold';
            }
            this.usersList.appendChild(li);
        });

        const count = users.length;
        this.userCount.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message || !this.socket) return;

        this.socket.emit('message', { message });
        this.messageInput.value = '';
        this.messageInput.focus();

        // Stop typing indicator
        if (this.isTyping) {
            this.socket.emit('typing', false);
            this.isTyping = false;
        }
    }

    handleTyping() {
        if (!this.socket) return;

        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing', true);
        }

        // Clear existing timeout
        clearTimeout(this.typingTimeout);

        // Set new timeout
        this.typingTimeout = setTimeout(() => {
            if (this.isTyping) {
                this.isTyping = false;
                this.socket.emit('typing', false);
            }
        }, 1000);
    }

    addMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${data.username === this.currentUsername ? 'own' : 'other'}`;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        headerDiv.textContent = data.username;

        const contentDiv = document.createElement('div');
        contentDiv.textContent = data.message;

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = data.timestamp;

        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);

        // Remove welcome message if it exists
        const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addSystemMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = message;

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    updateTypingIndicator(data) {
        if (data.isTyping) {
            this.typingIndicator.textContent = `${data.username} is typing...`;
        } else {
            this.typingIndicator.textContent = '';
        }
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

// Initialize the messenger when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new LocalMessenger();
});
