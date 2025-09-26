// server-debug.js
import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = 3001;

app.get("/debug/:ticker", async (req, res) => {
  const { ticker } = req.params;
  const url = `https://statusinvest.com.br/fundos-imobiliarios/${ticker}`;

  try {
    console.log(`🔎 Buscando HTML em: ${url}`);
    const response = await fetch(url);
    const body = await response.text();
    const $ = cheerio.load(body);

    let patrimonio = "Não encontrado";
    let variacao12m = "Não encontrado";

    // Procurar o valor de Patrimônio atual (exato R$ 5,49 B)
    $("*").each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes("5,49") && text.includes("B")) {
        patrimonio = text;
        console.log("📊 Bloco encontrado para Patrimônio ===");
        console.log($(el).parent().html()); // mostra contexto
      }
    });

    // Procurar o valor de Variação 12M (exato 8,47%)
    $("*").each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes("8,47%")) {
        variacao12m = text;
        console.log("📈 Bloco encontrado para Variação 12M ===");
        console.log($(el).parent().html());
      }
    });

    res.json({
      ticker,
      patrimonio,
      variacao12m,
    });
  } catch (err) {
    console.error("❌ Erro no debug:", err);
    res.status(500).json({ error: "Erro ao buscar dados" });
  }
});

app.listen(PORT, () => {
  console.log(`🐞 Server DEBUG rodando em http://localhost:${PORT}`);
});
