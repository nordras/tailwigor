const http = require("http");
const crypto = require("crypto");

const server = http.createServer((req, res) => {
  res.end("Not a ws request :(");
});

server.on("upgrade", (req, socket, head) => {
  if (req.headers["upgrade"] !== "websocket") {
    socket.end("HTTP/1.1 400 Bad Request");
    return;
  }

  const acceptKey = req.headers["sec-websocket-key"];
  const hash = genHash(acceptKey);
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

  sendTextData(socket, "Hello, I'm the server, everything is going good here.");
});

// Generate the hash value
function genHash(acceptKey) {
  return crypto
    .createHash("sha1")
    .update(acceptKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", "binary")
    .digest("base64");
}
/**
 * Decode a message!
 * References:
 * https://stackoverflow.com/questions/9182350/decode-a-websocket-frame
 * https://stackoverflow.com/questions/15770079/decode-continuation-frame-in-websocket
 * https://datatracker.ietf.org/doc/html/draft-ietf-hybi-thewebsocketprotocol-17#section-5.6
 * https://github.com/ErickWendel/websockets-with-nodejs-from-scratch
 * https://datatracker.ietf.org/doc/html/draft-ietf-hybi-thewebsocketprotocol-17#autoid-30
 * Capturar os tipos de frame
 * Verificar se é o final
 * Verificar se esta Mascarado
 * Decodigifcar
 */
function decodeMessage(buffer) {
  const isFinalFrame = Boolean(buffer[0] & 0x80);
  const [opcode, payloadLength] = [buffer[0] & 0x0f, buffer[1] & 0x7f];
  const isMasked = Boolean(buffer[1] & 0x80);

  // Caso não ache os bytes corretos no frame
  if (isFinalFrame === false || isMasked === false || opcode !== 0x1) {
    console.log("Unsupported WebSocket frame.");
    return null;
  }

  // Decode usando xor
  const maskingKey = buffer.slice(2, 6);
  const payloadData = buffer.slice(6, 6 + payloadLength);

  for (let i = 0; i < payloadData.length; i++) {
    payloadData[i] ^= maskingKey[i % 4];
  }

  // Resolve mensagem em utf-8
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
  let t = 5;
  let f = 3;
  t ^= f;
  console.log(t);
  console.log("Server started on http://localhost:3000/");
});

/**

Estrutura do Frame WebSocket
Um frame WebSocket começa com dois bytes obrigatórios. O primeiro byte contém informações como se o frame é o último frame de uma mensagem e qual é o tipo da mensagem (texto, binário, etc.). O segundo byte contém o comprimento da "carga útil" (dados reais) e pode também indicar se a carga útil foi mascarada.

O primeiro byte: buffer[0]

Bits 8-4: São usados para indicar coisas como se o frame é o último frame, etc.
Bits 4-1: Contém o opcode, que indica o tipo da mensagem (texto, binário, fechamento, ping, pong).
O segundo byte: buffer[1]

Bit 8: Indica se a mensagem está mascarada.
Bits 7-1: Contêm o comprimento da carga útil se for menor que 126.
Operações bitwise
buffer[0] & 0x0f: Pega os 4 bits menos significativos do primeiro byte, que contêm o opcode. A operação & é um "AND" bitwise, que será 1 se ambos os bits comparados forem 1. Portanto, buffer[0] & 0x0f mascara fora os 4 bits mais significativos e mantém os 4 bits menos significativos.

buffer[1] & 0x7f: Pega os 7 bits menos significativos do segundo byte, que contêm o comprimento da carga útil. Isso é feito para descartar o bit mais significativo, que é usado para indicar se a carga útil está mascarada ou não.


 */

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
