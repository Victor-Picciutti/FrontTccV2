const LETRAS = ["A","B","C","D","E"];
let contador = 0;
let questaoAtual = 1;
const totalQuestoes = 10;
const questoesSalvas = [];

function atualizarCount() {
  document.getElementById("count-label").textContent = `${contador} / 5`;
  document.querySelector(".btn-add").style.display = contador >= 5 ? "none" : "flex";
}

function atualizarQuestaoHeader() {
  document.getElementById("questao-numero").textContent = `Questão ${questaoAtual} de ${totalQuestoes}`;
  document.getElementById("questao-progress").style.width = `${(questaoAtual / totalQuestoes) * 100}%`;

  const btnSalvar = document.getElementById("btn-salvar");
  if (questaoAtual === totalQuestoes) {
    btnSalvar.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      Finalizar Atividade
    `;
  } else {
    btnSalvar.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Próxima Questão
    `;
  }
}

function adicionarOpcao() {
  if (contador >= 5) return;
  const letra = LETRAS[contador];
  contador++;
  const container = document.getElementById("opcoes-container");
  const row = document.createElement("div");
  row.classList.add("opcao-row");

  row.innerHTML = `
    <input type="radio" name="resposta" class="opcao-radio" title="Marcar como correta" />
    <div class="opcao-letra">${letra}</div>
    <input type="text" class="opcao-input" placeholder="Digite a alternativa ${letra}..." />
    <button class="btn-remove" title="Remover" onclick="removerOpcao(this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
      </svg>
    </button>
  `;

  const radio = row.querySelector(".opcao-radio");
  radio.addEventListener("change", () => {
    document.querySelectorAll(".opcao-letra").forEach(l => {
      l.style.borderColor = "";
      l.style.color = "";
      l.style.background = "";
    });
    if (radio.checked) {
      const letraEl = row.querySelector(".opcao-letra");
      letraEl.style.borderColor = "var(--accent)";
      letraEl.style.color = "var(--accent)";
      letraEl.style.background = "var(--accent-soft)";
    }
  });

  container.appendChild(row);
  atualizarCount();
}

function removerOpcao(btn) {
  const row = btn.closest(".opcao-row");
  row.style.opacity = "0";
  row.style.transform = "translateX(20px)";
  row.style.transition = ".2s ease";
  setTimeout(() => { row.remove(); reordenarOpcoes(); }, 200);
}

function reordenarOpcoes() {
  const rows = document.querySelectorAll(".opcao-row");
  contador = rows.length;
  rows.forEach((row, i) => {
    row.querySelector(".opcao-letra").textContent = LETRAS[i];
    row.querySelector(".opcao-input").placeholder = `Digite a alternativa ${LETRAS[i]}...`;
  });
  atualizarCount();
}

function limparFormulario() {
  document.getElementById("enunciado").value = "";
  document.getElementById("opcoes-container").innerHTML = "";
  contador = 0;
  adicionarOpcao();
  atualizarCount();
}

function mostrarToast(msg, cor) {
  const t = document.getElementById("toast");
  document.getElementById("toast-msg").textContent = msg;
  t.style.borderColor = cor || "var(--accent)";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

function salvarQuestao() {
  const enunciado = document.getElementById("enunciado").value.trim();
  const opcoes = [...document.querySelectorAll(".opcao-input")].map(i => i.value.trim());
  const corretaEl = document.querySelector(".opcao-radio:checked");

  if (!enunciado) { mostrarToast("⚠ Preencha o enunciado!", "#ff4466"); return; }
  if (opcoes.length < 2) { mostrarToast("⚠ Adicione pelo menos 2 alternativas!", "#ff4466"); return; }
  if (!corretaEl) { mostrarToast("⚠ Selecione a alternativa correta!", "#ff4466"); return; }

  const corretaIndex = [...document.querySelectorAll(".opcao-radio")].indexOf(corretaEl);

  questoesSalvas.push({
    numero: questaoAtual,
    enunciado,
    opcoes,
    correta: LETRAS[corretaIndex]
  });

  if (questaoAtual === totalQuestoes) {
    mostrarToast("✓ Atividade finalizada com sucesso!");
    console.log("Questões salvas:", questoesSalvas);
    // aqui você envia pro banco: fetch('/api/salvar', { method: 'POST', body: JSON.stringify(questoesSalvas) })
    return;
  }

  mostrarToast(`✓ Questão ${questaoAtual} salva!`);
  questaoAtual++;
  atualizarQuestaoHeader();
  limparFormulario();
}

// Inicializa
adicionarOpcao();
atualizarQuestaoHeader();