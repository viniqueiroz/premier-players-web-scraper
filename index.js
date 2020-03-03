const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
var json2xls = require('json2xls');
const fs = require("fs");
// URL alvo do scraper
const url =
    "https://www.premierleague.com/stats/top/players/goals?se=-1&cl=-1&iso=-1&po=-1?se=-1";

const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-infobars",
    "--window-position=0,0",
    "--ignore-certifcate-errors",
    "--ignore-certifcate-errors-spki-list",
    '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"'
];
const options = {
    args,
    headless: true,
    ignoreHTTPSErrors: true,
    userDataDir: "./tmp"
};
let topPremierLeagueScorers = [];
let nacionalidades = {};
let result = {};
const nextSelector = "div.paginationBtn.paginationNextContainer";
const previousSelector = "div.paginationBtn.paginationPreviousContainer";
let goNext = true;
let html;
let isEmpty = false;
let pagina = 0;
(async () => {
    // Inicia o Puppeteer
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();

    await page.setViewport({
        width: 768,
        height: 1024
    });

    html = await page.goto(url).then(function () {
        return page.content();
    });

    await page.waitForSelector(nextSelector, {
        timeout: 10000
    });

    // Itera a tabela de players
    while (goNext) {
        await page.waitFor(500);
        html = await page.content();
        // Checa de a página atual dbela está vazia
        if (isEmpty) {
            // Clica no botão voltar para recarregar a página
            await page.waitForSelector(previousSelector, {
                timeout: 10000
            });
            await click(previousSelector, page);
            pagina--;
            await page.waitFor(500);
        } else {
            // Avança uma página
            await page.waitForSelector(nextSelector, {
                timeout: 10000
            });
            await click(nextSelector, page);
            pagina++;
            await page.waitFor(500);
        }
        // Processa a página atual da tabela de players
        isEmpty = processTable(html);
    }
    // Encerra o puppeteer
    await browser.close();
    // Ajusta objeto de resultado
    result = { topPremierLeagueScorers,Nacionalidades: nacionalidades };

    writeFile("dump/greatestTopPlayers.json", topPremierLeagueScorers);
    writeFile("dump/nacionalidades.json", nacionalidades);
    writeFile("dump/result.json", result);
    writeFile("dump/result.txt", result);

    console.log("Arquivo de resultados Gravado na pasta /dump !");


})();

function processTable(html) {
    console.log("Processando Página: " + pagina);

    const $ = cheerio.load(html);
    const statsTable = $(".statsTableContainer > tr");
    if (statsTable.length == 1) {
        console.log("Página: " + pagina + " Vazia!");
        return true;
    }
    // Itera os itens da tabela
    statsTable.each(function () {
        const rank = $(this)
            .find(".rank > strong")
            .text();
        const playerName = $(this)
            .find(".playerName > strong")
            .text();
        const nationality = $(this)
            .find(".playerCountry")
            .text();
        const goals = $(this)
            .find(".mainStat")
            .text();
        topPremierLeagueScorers.push({
            rank,
            name: playerName,
            nationality,
            goals
        });
        // Incrementa quantidade de players daquela nacionalidade
        nacionalidades[nationality] = (nacionalidades[nationality]) ? nacionalidades[nationality] + 1 : 1;
    });

    if ($(nextSelector + '.inactive').length > 0) {
        console.log("Processamento Concluído!");
        goNext = false;
    }
    return false;
}
// Executa clique na tela
async function click(selector, page) {
    try {
        await page
            .waitForSelector(selector, {
                timeout: 10000
            })
            .then(() => {
                page.click(selector);
            });
    } catch (err) {
        throw err;
    }
}
// Escreve JSON em arquivo
function writeFile(fileName, json) {
    fs.writeFileSync(
        fileName,
        JSON.stringify(json)
    );
}

