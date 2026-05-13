const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

// Socket.io setup
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// MongoDB connection
mongoose.connect("mongodb://10.21.217.18/sds_logs", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

const userSocketMap = {}; // { userId: socketId }
// Schema & model
const messageSchema = new mongoose.Schema({
  text: String,
  sender: String,
  recipientId : String,
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", messageSchema);

// API endpoint to insert message
app.post("/messages", async (req, res) => {
  try {
    const { text, sender, recipientId } = req.body;

    const newMessage = new Message({
      text,
      sender: sender || "Anonymous",
      recipientId : recipientId
    });

    await newMessage.save();
    console.log(recipientId);
    // Fire WebSocket event after saving
    sendMessageToUser(recipientId, newMessage);

    res.status(201).json({ success: true, message: newMessage });
  } catch (err) {
    console.error("Error saving message:", err);
    res.status(500).json({ success: false, error: "Failed to save message" });
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

function sendMessageToUser(userId, message) {
  const socketId = userSocketMap[userId];
  if (socketId) {
    io.to(socketId).emit("message", message);
    console.log(`📨 Sent message to ${userId}`);
  } else {
    console.log(`⚠️ User ${userId} is not connected`);
  }
}

// Route
app.get("/", (req, res) => {
  res.send("Socket.IO + MongoDB API server running 🚀");
});

// Start server
server.listen(3000, () => {
  console.log("Server listening on port 3000");
});
