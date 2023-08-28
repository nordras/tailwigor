const fs = require("fs");

/**
 * 1. Ler o arquivo
 * 2. Tratar esse monte de erro
 */
fs.readFile("index.html", "utf8", (err, htmlData) => {
  if (err) {
    console.error("Erro de leitura no index:", err);
    return;
  }

  const CSS = extractCSSRules(htmlData);

  // Cria um arquivo css
  fs.writeFile("main.css", CSS.join("\n"), "utf8", (err) => {
    if (err) {
      console.error("Error:", err);
      return;
    }
    console.log("File genereated");
  });
});

/* 
1. Varrer o html
2. aplicar um string regex para achar as classes
3. Armazenar as classes
4. TODO checar o uso de Set https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set para não ter q filtrar
5. TODO checar https://css-tricks.com/how-do-you-remove-unused-css-from-a-site/
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

  const data = fs.readFileSync("global.css", "utf8");
  const extracted = extractRules(data, classes);

  return extracted;
}

function extractRules(globalCssData, classes) {
  const classSelectors = Array.from(classes).map(
    (className) => `\\.${className}(?:\\s*\\{|[\\s\\w\\W])*?\\}`
  );
  const classRegex = new RegExp(classSelectors.join("|"), "g");
  const relevantRules = globalCssData.match(classRegex) || [];

  return relevantRules;
}
