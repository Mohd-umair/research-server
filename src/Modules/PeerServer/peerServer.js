const express = require("express");
const { ExpressPeerServer } = require("peer");

// Function to create and configure PeerJS server
function createPeerServer(server) {
  // Create a PeerJS server attached to the provided server
  const peerServer = ExpressPeerServer(server, {
    debug: true,
  });

  // Add a route to the peer server
  peerServer.get("/", (req, res) => {
      res.send("Peerjs server")
  });

  return peerServer;
}

module.exports = createPeerServer;
