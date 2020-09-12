const cheerio = require('cheerio');
const got = require('got');
const fs = require('fs');
const servers = require('./ServerList.json')
const log4js = require("log4js");

log4js.configure({
    appenders: { default: { type: "file", filename: "output.log" }, console: { type: 'console'} },
    categories: { default: { appenders: ["default", "console"], level: "trace" } }
});

const logger = log4js.getLogger("default");

/**
 * 
 * @param {CheerioStatic} $ context
 * @param {CheerioElement} e element
 * @param {object[]} array parent array
 */
function parseElementForRanking($, e, array) {
    const nameFcElement = $("p", ".ranking-name", e).map((i, e) => $(e).text()).get();

    let name = nameFcElement[0];
    let fc = null;
    let fcUrl = null;
    let fcCrestUrls = null;
    if (nameFcElement.length > 1) {
        fc = nameFcElement[1];
        fcUrl = $("a", ".ranking-fc", ".ranking-name", e).attr("href");
        fcCrestUrls = $("img", ".ranking-fc__crest", ".ranking-fc", e).map((i, ele) => $(ele).attr("src")).get();
    }

    let rankChangeElement = $("p", ".ranking-prev_order", e);
    let rankChange = null;
    if (rankChangeElement.length > 0) {
        rankChange = parseInt(rankChangeElement.text());
        if (rankChangeElement.hasClass("rankig-prev_order__rank_down")) {
            rankChange = rankChange * -1;
        }
    }

    const scoreChangeElement = $("span", ".ranking-score", e);
    let scoreChange = null;
    if (scoreChangeElement.length > 0) {
        scoreChange = parseInt(scoreChangeElement.text().substr(1));
        // Pretty sure this check is useless...
        if (scoreChangeElement.text().startsWith("-")) {
            scoreChange = scoreChange * -1;
        }
    }

    array.push({
        ranking: parseInt($(".ranking-order", e).text()),
        rank_change: rankChange,
        lodestone_url: `https://na.finalfantasyxiv.com${$(e).attr("data-href")}`,
        portrait_url: $("img", ".ranking-face", e).attr("src"),
        name: name,
        free_company: fc,
        free_company_crest_urls: fcCrestUrls != null && fcCrestUrls.length > 0 ? fcCrestUrls : null,
        free_company_url: fcUrl != null ? `https://na.finalfantasyxiv.com${fcUrl}` : null,
        score: parseInt($("p", ".ranking-score", e).text()),
        score_change: scoreChange
    });
}

async function Query(server, dc, job) {
    try {
        const url = `https://na.finalfantasyxiv.com/lodestone/ishgardian_restoration/ranking/${job}?worldname=${server}&dcgroup=${dc}`;
        const response = await got(url);
        const $ = cheerio.load(response.body);


        const gotRankings = [];

        $(".ranking-soyf .ranking-list").find("li").each((i, e) => parseElementForRanking($, e, gotRankings));
        $(".ranking-wrapper .ranking-list").find("li").each((i, e) => parseElementForRanking($, e, gotRankings));

        logger.debug(`Finished Query ${dc} - ${server} - ${job}`);
        return {
            server: server,
            job: job,
            dc: dc,
            array: gotRankings,
        };
    } catch (e) {
        logger.error(e);
        return null;
    }
}

let jobs = [
    "carpenter",
    "blacksmith",
    "armorer",
    "goldsmith",
    "leatherworker",
    "weaver",
    "alchemist",
    "culinarian",
    "miner",
    "botanist",
    "fisher",
];
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    let queries = [];
    let arrays = [];

    for (const dc of Object.keys(servers)) {
        for (const server of servers[dc]) {
            for (const job of jobs) {
                logger.debug(`Querying ${dc} - ${server} - ${job}`);
                queries.push(Query(server, dc, job));
            }
            let results = await Promise.all(queries);
            arrays = arrays.concat(results);
            await sleep(5000);
            queries = [];
        }
    }

    let rankings = {};
    for (const array of arrays) {
        if (array === null)
            continue;
        if (rankings[array.dc] === undefined)
            rankings[array.dc] = {};

        if (rankings[array.dc][array.server] === undefined)
            rankings[array.dc][array.server] = {};

        rankings[array.dc][array.server][array.job] = array.array;
    }

    fs.writeFile("output.json", Buffer.from(JSON.stringify(rankings, null, 4)), null, () => {
        logger.debug("Wrote file");
    })
})();
