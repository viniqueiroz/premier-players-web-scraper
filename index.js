const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const fs = require("fs");
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
const topPremierLeagueScorers = [];
const nextSelector = "div.paginationBtn.paginationNextContainer";
const previousSelector = "div.paginationBtn.paginationPreviousContainer";
let goNext = true;
let html;
let isEmpty;
(async () => {
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    await page.setViewport({
        width: 768,
        height: 1024
    });
    html = await page.goto(url).then(function () {
        return page.content();
    });
    await page.waitFor(500);
    isEmpty = processTable(html);
    await page.waitForSelector(nextSelector, {
        timeout: 10000
    });

    while (goNext) {
        await page.waitFor(500);
        if (isEmpty) {
            await page.waitForSelector(previousSelector, {
                timeout: 10000
            });
            await click(previousSelector, page);
            await page.waitFor(500);
        } else {
            await page.waitForSelector(nextSelector, {
                timeout: 10000
            });
            await click(nextSelector, page);
            await page.waitFor(500);
        }
        isEmpty = processTable(html);
        html = await page.content();
    }
    await browser.close();
    fs.writeFileSync(
        "dump/greatestTopPlayers.json",
        JSON.stringify(topPremierLeagueScorers)
    );
})();

function processTable(html) {
    const $ = cheerio.load(html);
    const statsTable = $(".statsTableContainer > tr");
    if (statsTable.length == 1) {
        return true;
    }

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
    });

    if ($(nextSelector + '.inactive').length > 0) {
        goNext = false;
    }
    return false;
}

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