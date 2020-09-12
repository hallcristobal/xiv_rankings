interface IDataCenter {
    [key: string]: IServer[]
}

interface IServer {
    [key: string]: IJob[]
}

interface IJob {
    [key: string]: IRanking[]
}

interface IRanking {
    ranking: number,
    rank_change: number | null,
    lodestone_url: string,
    portrait_url: string,
    name: string,
    free_company: string | null,
    free_company_crest_urls: string[] | null,
    free_company_url: string | null,
    score: number,
    score_change: number | null,
    server: string,
    datacenter: string
}
