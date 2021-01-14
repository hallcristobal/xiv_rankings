/**@type IServer */
var jsonData;
var DatacenterSelectBox = $("#DatacenterSelectBox");
var ServerSelectBox = $("#ServerSelectBox");
var JobSelectBox = $("#JobSelectBox");

var numberFormatter = new Intl.NumberFormat();

function createServerHeader() {
    return $("<thead>").addClass("thead-light")
        .append([
            $("<th>").text("Ranking"),
            $("<th>").text("Name"),
            $("<th>").text("Score"),
            $("<th>").text("Day Score Change")
        ]);
}

/**
 * @param {IRanking} ranking
 */
function createRecordRow(idx, ranking) {
    var nameText = `${ranking.name} - (${ranking.server})`;
    return $("<tr>")
        .append([
            $("<td>").text(idx),
            $("<td>").append(
                $("<a>").attr("href", ranking.lodestone_url).attr("target", "_blank").text(nameText)
            ),
            $("<td>").text(numberFormatter.format(ranking.score)),
            $("<td>").text(numberFormatter.format(ranking.score_change)),
        ]);
}

/**
 * @param {string} job 
 */
function getAllForJob(job) {
    /**@type IRanking[] */
    var rankings = [];
    for (var datacenter of Object.keys(jsonData)) {
        for (var server of Object.keys(jsonData[datacenter])) {
            rankings = rankings.concat(jsonData[datacenter][server][job]);
        }
    }
    return rankings;
}

/**
 * @param {string} datacenter 
 * @param {string} job 
 */
function getAllForDatacenter(datacenter, job) {
    /**@type IRanking[] */
    var rankings = [];
    for (var server of Object.keys(jsonData[datacenter])) {
        rankings = rankings.concat(jsonData[datacenter][server][job]);
    }
    return rankings;
}

/**
 * @param {string} server 
 * @param {string} job 
 * @returns {IRanking[]}
 */
function getAllForServer(datacenter, server, job) {
    return jsonData[datacenter][server][job];
}

function populateTables() {
    var table = $("<table>").addClass([
        "table",
        "table-sm",
        "table-bordered"
    ]);
    var tableBody = $("<tbody>").attr("id", "MainTableBody");
    table.append(createServerHeader());
    table.append(tableBody);
    $("#table").append(table);
}

function submitSearch() {
    var dataceneterInput = DatacenterSelectBox.val();
    var serverInput = ServerSelectBox.val();
    var jobInput = JobSelectBox.val();
    console.log("Search submited", dataceneterInput, serverInput, jobInput);

    if(dataceneterInput === null || jobInput === null) {
        return;
    }
    var tableBody = $("#MainTableBody");
    tableBody.empty();

    /**@type IRanking[] */
    var rankings;
    if(dataceneterInput === "worldwide") {
        rankings = getAllForJob(jobInput);
    } else if (serverInput === "all") {
        rankings = getAllForDatacenter(dataceneterInput, jobInput);
    } else {
        rankings = getAllForServer(dataceneterInput, serverInput, jobInput);
    }

    rankings.sort(function (a, b) {
        return b.score - a.score;
    }).slice(0, 200).forEach(function (ranking, idx) {
        tableBody.append(createRecordRow(idx + 1, ranking));
    });
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

function populateServerSelect(datacenter) {
    ServerSelectBox.empty();
    if (datacenter === "worldwide") {
        ServerSelectBox.append(
            $("<option>").attr("selected", "").attr("Disabled", "").attr("value", "").text("N/A")
        );
        return;
    }

    ServerSelectBox.append(
        $("<option>").attr("selected", "").attr("Disabled", "").attr("value", "").text("Choose...")
    );

    if (datacenter === null) {
        return;
    }

    ServerSelectBox.append(
        $("<option>").attr("value", "all").text("All")
    );

    for (var server of (Object.keys(jsonData[datacenter]))) {
        ServerSelectBox.append(
            $("<option>").attr("value", server).text(server)
        );
    }
}

function init() {
    DatacenterSelectBox.append(
        $("<option>").attr("selected", "").attr("Disabled", "").attr("value", "").text("Choose..."),
        $("<option>").attr("value", "worldwide").text("Worldwide")
    );
    ServerSelectBox.append(
        $("<option>").attr("selected", "").attr("Disabled", "").attr("value", "").text("Choose...")
    );
    JobSelectBox.append(
        $("<option>").attr("selected", "").attr("Disabled", "").attr("value", "").text("Choose...")
    );

    DatacenterSelectBox.change(function (e) {
        populateServerSelect(DatacenterSelectBox.val());
    })

    jobs.forEach(function (job) {
        JobSelectBox.append(
            $("<option>").attr("value", job).text(job.charAt(0).toUpperCase() + job.slice(1))
        );
    });

    for (var datacenter of Object.keys(jsonData)) {
        DatacenterSelectBox.append(
            $("<option>").attr("value", datacenter).text(datacenter)
        );
    }

    $("#SearchSubmit").click(function (e) {
        submitSearch();
    });
}

(function () {
    var params = new URLSearchParams(window.location.search)
    console.debug(params);
    var useFull = params.get("full") === 'true';
    console.log("Use full lists: ", useFull);
    $.getJSON(useFull ? "output.json" : "output_short.json")
        .then(function (data) {
            jsonData = data;
            init();
            populateTables();
        })
        .catch(function (err) {
            console.error(err);
            alert("Failed to load data, cannot continue loading page.");
        })
})();
