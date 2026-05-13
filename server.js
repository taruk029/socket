const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
// Enable CORS for all routes
app.use(cors());

// Socket.io setup
const io = new Server(server, {
  path: "/wsnotify/",   //Close for local
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const userSocketMap = {}; // { userId: socketId }

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});
// wsapi endpoint to insert message
app.post("/wsapi/messages", async (req, res) => {
  try {
    const {recipientId, type } = req.body;
    console.log(recipientId);
    // Fire WebSocket event after saving
    sendMessageToUser(recipientId, type);
    res.status(201).json({ success: true});
  } catch (err) {
    console.error("Error saving message:", err);
    res.status(500).json({ success: false, error: "Failed to save message" });
  }
});

app.post("/wsapi/login", async (req, res) => {
  try {
    const {login_code, user_id, token, type} = req.body;
    console.log(login_code);
    // Fire WebSocket event after saving
    sendDataToUser(login_code, user_id, token, type);
    res.status(201).json({ success: true});
  } catch (err) {
    console.error("Error saving message:", err);
    res.status(500).json({ success: false, error: "Failed to save message" });
  }
});

app.post("/wsapi/broadcast", async (req, res) => {
  try {
    const { type, datas} = req.body;
    sendToAll(type, datas);
    res.status(200).json({ success: true, message: "Broadcast sent to all users" });
  } catch (err) {
    console.error("Error broadcasting:", err);
    res.status(500).json({ success: false, error: "Failed to broadcast" });
  }
});


// WebSocket events
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  // Client should send its userId right after connecting
  socket.on("register", (userId) => {
    userSocketMap[userId] = socket.id;
    console.log(`✅ User ${userId} registered with socket ${socket.id}`);
  });

  socket.on("disconnect", () => {
    // Remove user from map when disconnected
    for (const userId in userSocketMap) {
      if (userSocketMap[userId] === socket.id) {
        delete userSocketMap[userId];
        break;
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

function sendMessageToUser(userId, type) {
  const socketId = userSocketMap[userId];
  if (socketId) {
    var details = {'message':"New Notification", 'type':type};
    io.to(socketId).emit("message", details);
    console.log(`📨 Sent message to ${userId}`);
  } else {
    console.log(`⚠️ User ${userId} is not connected`);
  }
}

function sendDataToUser(login_code, userId, token, type) {
  const socketId = userSocketMap[login_code];
  if (socketId) {
    var details = {'login_code':login_code, 'userId':userId, 'token':token, 'type':type};
    io.to(socketId).emit("message", details);
    console.log(`📨 Sent message to ${userId}`);
  } else {
    console.log(`⚠️ User ${userId} is not connected`);
  }
}

function sendToAll(type, datas) {
  // Prepare message payload
  const details = { type: type, data:datas};
  io.emit("message", details);
  console.log("🌐 Broadcasted message to all connected clients");
}


// Route
// app.get("/", (req, res) => {
//   res.send("Socket.IO + MongoDB wsapi server running 🚀");
// });

// Start server
server.listen(3000, () => {
  console.log("Server listening on port 3000");
});
