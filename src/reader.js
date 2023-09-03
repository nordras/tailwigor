const fs = require("fs");
const http = require("http");
const chokidar = require("chokidar");

// chokidar.watch("./src/*").on("all", (event, path) => {
//   generateStyles();
// });

const host = "localhost";
const port = 3000;

function watcher(req, res) {
  // const chokiWatcher = chokidar
  //   .watch(".*", {
  //     ignored: /(^|[\/\\])\../,
  //     persistent: true,
  //   })
  //   .on("all", (event, path) => {
  //     console.log(event, path);
  //     generateStyles();
  //   });

  const chokiWatcher = chokidar.watch(".", {
    ignored: /(^|[\/\\])\../,
    persistent: true,
  });

  const sendReload = () => {
    generateStyles();
    res.end("reload");
    chokiWatcher.close();
  };

  chokiWatcher.on("change", sendReload);

  req.on("close", () => {
    chokiWatcher.close();
  });
}

const requestListener = function (req, res) {
  if (req.url === "/wait-for-change") {
    watcher(req, res);
  } else {
    fs.readFile(
      `./src/${req.url === "/" ? "/index.html" : req.url}`,
      (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end(JSON.stringify(err));
          return;
        }
        res.writeHead(200);
        res.end(data);
      }
    );
  }
};

const server = http.createServer(requestListener);

server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});

function generateStyles() {
  // Read target html
  fs.readFile("./src/index.html", "utf8", (err, htmlData) => {
    if (err) {
      console.error("Erro de leitura no index:", err);
      return;
    }

    const CSS = extractCSSRules(htmlData);

    // Create or Overwrite main css file with the extracted CSS rules
    fs.writeFile("./src/main.css", CSS.join("\n"), "utf8", (err) => {
      if (err) {
        console.error("Error:", err);
        return;
      }
      console.log("File genereated");
    });
  });
}

/* 
1. Varrer o html
2. aplicar um string regex para achar as classes
3. Armazenar as classes
4. TODO checar o uso de Set https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set para não ter q filtrar
5. TODO checar https://css-tricks.com/how-do-you-remove-unused-css-from-a-site/
 * 
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match
 * https://en.wikipedia.org/wiki/WebSocket
 * https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
*/
function extractCSSRules(htmlData) {
  const classRegex = /class="([^"]+)"/g;
  const classes = new Set();

  let match;
  while ((match = classRegex.exec(htmlData)) !== null) {
    const classNames = match[1].split(" ");
    classNames.forEach((className) => {
      classes.add(className);
    });
  }

  const data = fs.readFileSync("./src/global.css", "utf8");

  // Get rules from global.css
  const extracted = extractRules(data, classes);

  return extracted;
}

/**
 * Extract rules from global.css, it also compare the matched classes used in index and return it
 * Extract root rules and increment at first position
 */
function extractRules(globalCssData, classes) {
  const rootRegex = /:root\s*{([\s\S]*?)}/;
  const rootMatch = globalCssData.match(rootRegex);
  let rootRules = "";

  rootRules = rootMatch[0];

  const mediaRegex = /@media[^{]+\{([\s\S]+?})\s*}/g;
  let mediaMatches = globalCssData.match(mediaRegex) || [];
  mediaMatches = mediaMatches.join("\n");

  // Extrair regras de classe
  const classSelectors = Array.from(classes).map(
    (className) =>
      `\\.${className.replace(/\\/g, "\\\\")}(?:\\s*\\{|[\\s\\w\\W])*?\\}`
  );

  const classRegex = new RegExp(classSelectors.join("|"), "g");
  let relevantRules = globalCssData.match(classRegex) || [];

  // Concatena regras encontradas
  if (rootRules) {
    relevantRules = [rootRules, mediaMatches, ...relevantRules];
  }

  return relevantRules;
}
