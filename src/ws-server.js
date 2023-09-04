// ============ WS Lib
// const WebSocket = require("ws");
// const wss = new WebSocket.Server({ port: 8080 });

// wss.on("connection", function connection(ws) {
//   ws.on("message", function incoming(message) {
//     console.log("received: %s", message);
//   });

//   ws.send("Hello from WebSocket server");
// });

// ============ Native HTTP WebSocket
const http = require("http");
const crypto = require("crypto");

const server = http.createServer((req, res) => {
  res.end("Not a WebSocket request.");
});

server.on("upgrade", (req, socket, head) => {
  if (req.headers["upgrade"] !== "websocket") {
    socket.end("HTTP/1.1 400 Bad Request");
    return;
  }

  const acceptKey = req.headers["sec-websocket-key"];
  const hash = generateAcceptValue(acceptKey);
  const responseHeaders = [
    "HTTP/1.1 101 Web Socket Protocol Handshake",
    "Upgrade: WebSocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${hash}`,
  ];

  socket.write(responseHeaders.join("\r\n") + "\r\n\r\n");

  socket.on("data", (data) => {
    console.log("Received:", decodeMessage(data));
  });

  sendTextData(socket, "Hello from server");
});

function generateAcceptValue(acceptKey) {
  return crypto
    .createHash("sha1")
    .update(acceptKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", "binary")
    .digest("base64");
}

function decodeMessage(buffer) {
  const isFinalFrame = Boolean(buffer[0] & 0x80);
  const [opcode, payloadLength] = [buffer[0] & 0x0f, buffer[1] & 0x7f];
  const isMasked = Boolean(buffer[1] & 0x80);

  if (isFinalFrame === false || isMasked === false || opcode !== 0x1) {
    console.log("Unsupported WebSocket frame.");
    return null;
  }

  const maskingKey = buffer.slice(2, 6);
  const payloadData = buffer.slice(6, 6 + payloadLength);

  for (let i = 0; i < payloadData.length; i++) {
    payloadData[i] ^= maskingKey[i % 4];
  }

  return payloadData.toString("utf8");
}

function sendTextData(socket, message) {
  const frame = Buffer.concat([
    Buffer.from([0x81, message.length]),
    Buffer.from(message),
  ]);
  socket.write(frame);
}

server.listen(3000, () => {
  console.log("Server started on http://localhost:3000/");
});
