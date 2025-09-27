import fetch from "node-fetch";
import * as cheerio from "cheerio";

const TOP10_TICKERS = ["HGLG11","KNRI11","XPML11","VLOL11","RBRP11","GGRC11","MXRF11","BCFF11","IRDM11","HGRU11"];

async function getData(ticker) {
  const url = `https://statusinvest.com.br/fundos-imobiliarios/${ticker}`;
  const urlProvents = `https://statusinvest.com.br/fii/companytickerprovents?ticker=${ticker}`;
  const result = { ticker };

  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const preco = $(".info.special strong.value").first().text().trim();
    result.preco = preco || "Preço não encontrado";

    let pvp = null;
    $("div.info").each((_, el) => {
      const label = $(el).find("h3.title").text().trim();
      if (label.includes("P/VP")) pvp = $(el).find("strong.value").text().trim();
    });
    result.pvp = pvp || "P/VP não encontrado";

    let patrimonio = null;
    $("script[type='application/ld+json']").each((_, el) => {
      try {
        const json = JSON.parse($(el).contents().text());
        if (json["@type"] === "InvestmentFund" && json.amount?.value) {
          patrimonio = `R$ ${Number(json.amount.value).toLocaleString("pt-BR")}`;
        }
      } catch {}
    });
    result.patrimonio = patrimonio || "Patrimônio não encontrado";

    let variacao12m = null;
    $("div.info.w-50.w-lg-20").each((_, el) => {
      const label = $(el).find("h3.title").text().trim();
      if (label.includes("Valorização (12m)")) variacao12m = $(el).find("strong.value").text().trim();
    });
    result.variacao12m = variacao12m || "Variação 12m não encontrada";

    const resProv = await fetch(urlProvents);
    const jsonProv = await resProv.json();
    const proventos = jsonProv.assetEarningsModels || [];
    const ultimos12 = proventos.slice(0, 12);
    const somaProventos = ultimos12.reduce((acc, p) => acc + (p.v || 0), 0);

    const precoNum = parseFloat(preco.replace(".", "").replace(",", "."));
    if (precoNum && somaProventos > 0) {
      result.dy = ((somaProventos / precoNum) * 100).toFixed(2) + "%";
    } else {
      result.dy = "DY não encontrado";
    }

    return result;
  } catch (err) {
    console.error("Erro ao buscar", ticker, err);
    return { ticker, error: "Erro ao buscar dados" };
  }
}

export default async function handler(req, res) {
  const results = await Promise.all(TOP10_TICKERS.map(t => getData(t)));
  res.status(200).json(results);
}
