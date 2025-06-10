const express = require("express");
const { ExpressPeerServer } = require("peer");

const app = express();
const PORT = 9000;

// Create a PeerJS server
const server = app.listen(PORT, () => {
  console.log(`PeerJS server is running on port ${PORT}`);
});

app.get("/", (req, res) => {
    res.send("Peerjs server")
})
// Create a PeerJS server
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

module.exports = peerServer;
