// server.js
import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = 3000;

async function getData(ticker) {
  const url = `https://statusinvest.com.br/fundos-imobiliarios/${ticker}`;
  const urlProvents = `https://statusinvest.com.br/fii/companytickerprovents?ticker=${ticker}`;
  const result = { ticker };

  try {
    // 1) Fetch da página principal
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    // 2) Preço
    const preco = $(".info.special strong.value").first().text().trim();
    result.preco = preco || "Preço não encontrado";

    // 3) P/VP
    let pvp = null;
    $("div.info").each((_, el) => {
      const label = $(el).find("h3.title").text().trim();
      if (label.includes("P/VP")) {
        pvp = $(el).find("strong.value").text().trim();
      }
    });
    result.pvp = pvp || "P/VP não encontrado";

    // 4) Patrimônio líquido (via JSON-LD)
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

    // 5) Variação 12 meses
    let variacao12m = null;
    $("div.info.w-50.w-lg-20").each((_, el) => {
      const label = $(el).find("h3.title").text().trim();
      if (label.includes("Valorização (12m)")) {
        variacao12m = $(el).find("strong.value").text().trim();
      }
    });
    result.variacao12m = variacao12m || "Variação 12m não encontrada";

    // 6) DY (endpoint separado, anualizado)
const resProv = await fetch(urlProvents);
const jsonProv = await resProv.json();

// Pegar os proventos (últimos 12 registros ou menos)
const proventos = jsonProv.assetEarningsModels || [];
const ultimos12 = proventos.slice(0, 12); 

// Somar os valores pagos
const somaProventos = ultimos12.reduce((acc, p) => acc + (p.v || 0), 0);

// Converter preço (ex: "159,11") para número
const precoNum = parseFloat(preco.replace(".", "").replace(",", "."));

// Calcular DY anualizado
if (precoNum && somaProventos > 0) {
  const dyPercentual = ((somaProventos / precoNum) * 100).toFixed(2) + "%";
  result.dy = dyPercentual;
} else {
  result.dy = "DY não encontrado";
}


    return result;
  } catch (err) {
    console.error("❌ Erro:", err);
    return { ticker, error: "Erro ao buscar dados" };
  }
}

// Rota única (mantida)
app.get("/api/fii/:ticker", async (req, res) => {
  const data = await getData(req.params.ticker.toUpperCase());
  res.json(data);
});

// Novo endpoint múltiplo: /api/fiis?tickers=HGLG11,KNRI11,XPLG11
app.get("/api/fiis", async (req, res) => {
  const { tickers } = req.query;
  if (!tickers) return res.status(400).json({ error: "Forneça ?tickers=HGLG11,KNRI11" });

  const list = tickers.split(",").map(t => t.trim().toUpperCase()).filter(Boolean);
  // roda em paralelo
  const results = await Promise.all(list.map(t => getData(t)));
  res.json(results);
});

// Servir arquivos estáticos da pasta "public"
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`🚀 Server rodando em http://localhost:${PORT}`);
});
