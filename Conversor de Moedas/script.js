const fiatAPI = "https://api.frankfurter.app";
const cryptoAPI = "https://api.coingecko.com/api/v3/simple/price";

// Lista de moedas FIAT (Frankfurter)
const fiatCurrencies = ["USD", "EUR", "GBP", "BRL", "JPY", "AUD", "CAD", "CHF", "CNY", "SEK", "NZD"];

// Lista de criptos (CoinGecko IDs → Símbolo)
const cryptoCurrencies = {
  bitcoin: "BTC",
  ethereum: "ETH",
  ripple: "XRP",
  litecoin: "LTC",
  cardano: "ADA",
  dogecoin: "DOGE",
  polkadot: "DOT",
  solana: "SOL",
  tron: "TRX",
  tether: "USDT"
};

// Elements
const fromSelect = document.getElementById("from");
const toSelect = document.getElementById("to");
const resultDiv = document.getElementById("result");

// Popula selects (fiat + crypto)
function populateSelect(select) {
  // Moedas FIAT
  fiatCurrencies.forEach(code => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code;
    select.appendChild(opt);
  });

  // Criptos (usamos o id do CoinGecko como value)
  for (let [id, symbol] of Object.entries(cryptoCurrencies)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = symbol;
    select.appendChild(opt);
  }
}

populateSelect(fromSelect);
populateSelect(toSelect);

// valores default (opcional, facilita testes)
if (fromSelect.querySelector('option[value="USD"]')) fromSelect.value = "USD";
if (toSelect.querySelector('option[value="BRL"]')) toSelect.value = "BRL";

/**
 * Formata número de saída com precisão adaptativa
 */
function formatResult(num) {
  if (!isFinite(num)) return "—";
  const abs = Math.abs(num);
  let decimals = 4;
  if (abs === 0) return "0";
  if (abs < 0.000001) return num.toExponential(6);
  if (abs < 0.01) decimals = 8;
  else if (abs < 1) decimals = 6;
  else if (abs >= 1000) decimals = 2;
  return Number(num).toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/**
 * função principal: devolve o valor numérico convertido
 */
async function converterMoeda(amount, from, to) {
  const fromIsFiat = fiatCurrencies.includes(from);
  const toIsFiat = fiatCurrencies.includes(to);
  const fromIsCrypto = Object.prototype.hasOwnProperty.call(cryptoCurrencies, from);
  const toIsCrypto = Object.prototype.hasOwnProperty.call(cryptoCurrencies, to);

  // mesmo código -> retorna mesmo valor
  if (from === to) return amount;

  // FIAT -> FIAT (Frankfurter)
  if (fromIsFiat && toIsFiat) {
    const res = await fetch(`${fiatAPI}/latest?amount=${amount}&from=${from}&to=${to}`);
    if (!res.ok) throw new Error("Erro na API de FIAT");
    const data = await res.json();
    const r = data.rates && data.rates[to];
    if (typeof r !== "number") throw new Error("Resposta inválida da API de FIAT");
    return r;
  }

  // se 'from' é crypto -> buscamos o preço do 'from' na moeda 'to' (to pode ser fiat ou crypto)
  if (fromIsCrypto) {
    const targetParam = to.toLowerCase(); // CoinGecko aceita fiat (usd) e ids (ethereum)
    const res = await fetch(`${cryptoAPI}?ids=${encodeURIComponent(from)}&vs_currencies=${encodeURIComponent(targetParam)}`);
    if (!res.ok) throw new Error("Erro na API CoinGecko (crypto -> ...)"); 
    const data = await res.json();
    if (!data || !data[from] || typeof data[from][targetParam] === "undefined") {
      throw new Error("Resposta inválida da CoinGecko (crypto -> ...)");
    }
    const price = data[from][targetParam]; // preço de 1 'from' em 'to'
    return price * amount;
  }

  // from é FIAT e to é CRYPTO: buscamos o preço de 1 'to' na moeda 'from' e dividimos
  if (toIsCrypto) {
    const vs = from.toLowerCase(); // queremos o preço do crypto em 'from'
    const res = await fetch(`${cryptoAPI}?ids=${encodeURIComponent(to)}&vs_currencies=${encodeURIComponent(vs)}`);
    if (!res.ok) throw new Error("Erro na API CoinGecko (fiat -> crypto)");
    const data = await res.json();
    if (!data || !data[to] || typeof data[to][vs] === "undefined") {
      throw new Error("Resposta inválida da CoinGecko (fiat -> crypto)");
    }
    const priceOfOneCryptoInFrom = data[to][vs];
    if (!priceOfOneCryptoInFrom) throw new Error("Preço inválido (zero)");
    return amount / priceOfOneCryptoInFrom;
  }

  throw new Error("Conversão não suportada.");
}

/**
 * Helper: mostra mensagem no #result com animação (reinicia a animação ao atualizar)
 */
function showResultText(text) {
  // reinicia animação: remove, forçamos reflow, adicionamos novamente
  resultDiv.classList.remove("show");
  // força reflow para reiniciar animação
  void resultDiv.offsetWidth;
  resultDiv.textContent = text;
  resultDiv.classList.add("show");
}

// Evento submit
document.getElementById("converter-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById("amount").value);
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;

  if (isNaN(amount) || amount <= 0) {
    showResultText("Insira um valor válido.");
    return;
  }

  try {
    showResultText("Calculando...");

    const value = await converterMoeda(amount, from, to); // número
    const fromLabel = cryptoCurrencies[from] || from; // ex: BTC ou USD
    const toLabel = cryptoCurrencies[to] || to;

    const formatted = formatResult(value);

    showResultText(`${amount} ${fromLabel} = ${formatted} ${toLabel}`);
  } catch (err) {
    console.error(err);
    showResultText("Erro ao converter. Tente novamente.");
  }
});
