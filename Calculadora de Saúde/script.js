// Função para classificar o IMC + classe CSS
function classificarIMC(imc) {
  if (imc < 18.5) return { texto: "Abaixo do peso", classe: "imc-abaixo" };
  else if (imc < 24.9) return { texto: "Peso normal", classe: "imc-normal" };
  else if (imc < 29.9) return { texto: "Sobrepeso", classe: "imc-sobrepeso" };
  else if (imc < 34.9) return { texto: "Obesidade grau I", classe: "imc-obesidade" };
  else if (imc < 39.9) return { texto: "Obesidade grau II", classe: "imc-obesidade" };
  else return { texto: "Obesidade grau III", classe: "imc-obesidade" };
}

document.getElementById("form").addEventListener("submit", function(e) {
  e.preventDefault();

  const idade = parseInt(document.getElementById("idade").value);
  const sexo = document.getElementById("sexo").value;
  const peso = parseFloat(document.getElementById("peso").value);
  const altura = parseInt(document.getElementById("altura").value);
  const horas = parseFloat(document.getElementById("horas").value);

  const alturaM = altura / 100;
  const imcNum = peso / (alturaM * alturaM);
  const imc = imcNum.toFixed(2);
  const classificacao = classificarIMC(imcNum); // usa o valor numérico

  // Cálculo TMB
  let tmb;
  if (sexo === "masculino") {
    tmb = 10 * peso + 6.25 * altura - 5 * idade + 5;
  } else {
    tmb = 10 * peso + 6.25 * altura - 5 * idade - 161;
  }

  // Fator atividade baseado em horas
  let fator = 1.2;
  if (horas >= 1 && horas <= 3) fator = 1.375;
  else if (horas > 3 && horas <= 6) fator = 1.55;
  else if (horas > 6 && horas <= 10) fator = 1.725;
  else if (horas > 10) fator = 1.9;

  const tmbFinal = (tmb * fator).toFixed(2);

  // Exibir resultado
  const resultadoDiv = document.getElementById("resultado");
  resultadoDiv.innerHTML = `
    <p><strong>IMC:</strong> ${imc} 
       <span class="${classificacao.classe}">(${classificacao.texto})</span></p>
    <p><strong>TMB:</strong> ${tmb.toFixed(2)} kcal/dia</p>
    <p><strong>TMB Ajustado (atividade):</strong> ${tmbFinal} kcal/dia</p>
  `;
  resultadoDiv.classList.add("show");
});
