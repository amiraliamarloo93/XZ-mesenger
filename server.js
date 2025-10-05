const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// ذخیره موقت کاربران و گروه‌ها
let users = {};
let groups = {};

// Socket.io
io.on('connection', socket => {
  console.log('کاربر متصل شد');

  socket.on('joinGroup', ({ username, group }) => {
    socket.join(group);
    socket.username = username;
    socket.group = group;
    if (!groups[group]) groups[group] = [];
    socket.emit('messages', groups[group]);
    io.to(group).emit('messages', groups[group]);
  });

  socket.on('sendMessage', msg => {
    const message = { user: socket.username, text: msg, time: new Date().toLocaleTimeString() };
    if (!groups[socket.group]) groups[socket.group] = [];
    groups[socket.group].push(message);
    io.to(socket.group).emit('newMessage', message);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
