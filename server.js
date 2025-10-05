const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

let users = []; // کاربران آنلاین
let groups = []; // گروه‌ها و پیام‌ها

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

io.on("connection", (socket) => {
  console.log("کاربر وصل شد:", socket.id);

  socket.on("joinGroup", ({ username, group }) => {
    socket.join(group);
    socket.to(group).emit("message", { user: "سیستم", text: `${username} به گروه پیوست.` });
  });

  socket.on("sendMessage", ({ group, user, text }) => {
    io.to(group).emit("message", { user, text });
  });

  socket.on("disconnect", () => {
    console.log("کاربر خارج شد:", socket.id);
  });
});

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
