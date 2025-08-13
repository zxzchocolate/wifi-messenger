# Local WiFi Messenger 🌐

A real-time web-based messenger application that works on your local WiFi network. Perfect for communication between devices on the same network without requiring internet access.

## Features ✨

- **Real-time messaging** with WebSocket connections
- **User presence** - see who's online
- **Typing indicators** - know when someone is typing
- **Responsive design** - works on desktop, tablet, and mobile
- **Local network only** - no internet required
- **Simple setup** - just run and connect

## Quick Start 🚀

1. **Install dependencies:**
   ```bash
   cd local-messenger
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Access the messenger:**
   - On the same computer: `http://localhost:3000`
   - From other devices on your WiFi network: `http://[YOUR-IP]:3000`
   
   The server will display the local IP addresses when it starts.

## How to Use 💬

1. **Join the chat:**
   - Enter a username (2+ characters)
   - Click "Join Chat"

2. **Start messaging:**
   - Type your message and press Enter or click Send
   - See who's online in the sidebar
   - Watch for typing indicators

3. **Multiple devices:**
   - Anyone on your WiFi network can join using your computer's IP address
   - Each person needs a unique username

## Technical Details 🔧

- **Backend:** Node.js with Express and Socket.IO
- **Frontend:** Vanilla HTML, CSS, and JavaScript
- **Real-time:** WebSocket connections for instant messaging
- **Network:** Binds to `0.0.0.0` to accept connections from all network interfaces

## File Structure 📁

```
local-messenger/
├── server.js          # Node.js server with Socket.IO
├── package.json       # Dependencies and scripts
├── README.md          # This file
└── public/
    ├── index.html     # Main HTML page
    ├── style.css      # Styling
    └── script.js      # Client-side JavaScript
```

## Development 🛠️

For development with auto-restart:
```bash
npm run dev
```

## Network Access 🔗

The server automatically detects and displays your local IP addresses. Common scenarios:

- **Same computer:** `http://localhost:3000`
- **Local network:** `http://192.168.1.100:3000` (example IP)
- **Mobile devices:** Use the same IP address as shown in the server startup

## Security Note 🔒

This application is designed for local network use only. It doesn't include authentication or encryption, making it perfect for trusted local environments like home or office networks. Admin Access: admin123

## Customization 🎨

- **Port:** Change the `PORT` environment variable or modify `server.js`
- **Styling:** Edit `public/style.css` for custom themes
- **Features:** Extend `server.js` and `public/script.js` for additional functionality

## Troubleshooting 🔍

**Can't connect from other devices:**
- Make sure all devices are on the same WiFi network
- Check if firewall is blocking port 3000
- Verify the IP address is correct

**Messages not sending:**
- Check browser console for errors
- Ensure WebSocket connection is established (green indicator)
- Try refreshing the page

## License 📄

MIT License - feel free to use and modify as needed!
