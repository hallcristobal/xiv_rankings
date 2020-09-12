const cheerio = require('cheerio');
const got = require('got');
const fs = require('fs');
const servers = require('./ServerList.json')
const log4js = require("log4js");

log4js.configure({
    appenders: { default: { type: "file", filename: "output.log" }, console: { type: 'console' } },
    categories: { default: { appenders: ["default", "console"], level: "trace" } }
});

const logger = log4js.getLogger("default");

/**
 * @param {CheerioStatic} $ context
 * @param {CheerioElement} e element
 * @param {IRanking[]} array parent array
 */
function parseElementForRanking($, e, array, server, datacenter) {
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
        score_change: scoreChange,
        server: server,
        datacenter: datacenter
    });
}

async function Query(server, dc, job) {
    var response;
    var tries = 1
    while (tries < 6) {
        try {
            const url = `https://na.finalfantasyxiv.com/lodestone/ishgardian_restoration/ranking/${job}?worldname=${server}&dcgroup=${dc}`;
            response = await got(url);
            break;
        } catch (e) {
            logger.error(e);
            logger.error(`Failed to get response, sleeping for 5 seconds and trying again: attempt ${++tries}`);
            await sleep(5000);
        } finally {
            tries = tries + 1;
        }
    }

    if (response === undefined || response === null) {
        logger.error("Querying server failed over all attempts.", server, dc, job);
        return {
            server: server,
            job: job,
            dc: dc,
            array: null
        }
    }

    const $ = cheerio.load(response.body);
    const topRankings = [];
    const otherRankings = [];

    $(".ranking-soyf .ranking-list").find("li").each((i, e) => parseElementForRanking($, e, topRankings, server, dc));
    $(".ranking-wrapper .ranking-list").find("li").each((i, e) => parseElementForRanking($, e, otherRankings, server, dc));

    logger.debug(`Finished Query ${dc} - ${server} - ${job}`);
    return {
        server: server,
        job: job,
        dc: dc,
        array: topRankings.concat(otherRankings),
        shortArray: topRankings
    };
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

const debug = false;

(async () => {
    let queries = [];
    let fullArray = [];

    if (debug) {
        logger.debug("Debug mode active, only querying Diabolos");

        for (const job of jobs) {
            logger.debug(`Querying Diabolos - Crystal - ${job}`);
            queries.push(Query("Diabolos", "Crystal", job));
        }
        let results = await Promise.all(queries);
        fullArray = fullArray.concat(results);
        await sleep(5000);
        queries = [];
    } else {
        for (const dc of Object.keys(servers)) {
            for (const server of servers[dc]) {
                for (const job of jobs) {
                    logger.debug(`Querying ${dc} - ${server} - ${job}`);
                    queries.push(Query(server, dc, job));
                }
                let results = await Promise.all(queries);
                results.forEach((e) => {
                    if (e.array === null) {
                        let message = `Invalid result in array: ${e.server}, ${e.dc}, ${e.job}, ${e.array}`;
                        logger.error(message);
                        throw message;
                    }
                })
                fullArray = fullArray.concat(results);
                await sleep(5000);
                queries = [];
            }
        }
    }

    let rankings = {};
    let shortRankings = {};
    for (const array of fullArray) {
        if (array === null)
            continue;
        if (rankings[array.dc] === undefined)
            rankings[array.dc] = {};

        if (shortRankings[array.dc] === undefined)
            shortRankings[array.dc] = {};

        if (rankings[array.dc][array.server] === undefined)
            rankings[array.dc][array.server] = {};

        if (shortRankings[array.dc][array.server] === undefined)
            shortRankings[array.dc][array.server] = {};

        rankings[array.dc][array.server][array.job] = array.array;
        shortRankings[array.dc][array.server][array.job] = array.shortArray;
    }

    fs.writeFile("output.json", Buffer.from(JSON.stringify(rankings)), null, () => {
        logger.debug("Wrote full file.");
    });
    fs.writeFile("output_short.json", Buffer.from(JSON.stringify(shortRankings)), null, () => {
        logger.debug("Wrote short file.");
    });
})();
