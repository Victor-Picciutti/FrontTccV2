// =====================================================
// EstudeX | duvidas.js — Visão do Professor
// Conectado à API Spring Boot
// =====================================================

// -------------------------------------------------------
// CONFIGURAÇÃO — ajuste a BASE_URL conforme seu ambiente
// -------------------------------------------------------
const API = {
    BASE_URL:   'http://localhost:8080',   // <- troque em produção
    DUVIDAS:    '/duvidas',
    RESPOSTAS:  '/respostas',
};

// ID do professor logado (substitua pelo valor real da sessão/localStorage)
//const ID_PROFESSOR_LOGADO = 6;

// =====================================================
// ESTADO
// =====================================================
let doubtsData   = [];   // dados crus da API (dúvidas + respostas cruzadas)
let filterStatus = 'all';
let filterSubject= 'all';
let searchId     = '';
let searchName   = '';
let sortCol      = 'momento';
let sortDir      = 'desc';
let activeDoubtId= null;

// =====================================================
// ELEMENTOS DOM
// =====================================================
const tableBody       = document.getElementById('table-body');
const loadingState    = document.getElementById('loading-state');
const errorState      = document.getElementById('error-state');
const errorMsg        = document.getElementById('error-msg');
const tableWrapper    = document.getElementById('table-wrapper');
const emptyState      = document.getElementById('empty-state');
const resultsCount    = document.getElementById('results-count');
const searchIdInput   = document.getElementById('search-id');
const searchNameInput = document.getElementById('search-name');
const btnClear        = document.getElementById('btn-clear');
const btnRefresh      = document.getElementById('btn-refresh');
const btnRetry        = document.getElementById('btn-retry');
const filterBtns      = document.querySelectorAll('.filter-btn');
const filterSelect    = document.getElementById('filter-subject');
const modalOverlay    = document.getElementById('modal-overlay');
const modalClose      = document.getElementById('modal-close');
const btnSendAnswer   = document.getElementById('btn-send-answer');
const btnCancel       = document.getElementById('btn-cancel');
const answerInput     = document.getElementById('answer-input');
const menuToggle      = document.getElementById('menu-toggle');
const sidebar         = document.querySelector('.sidebar');
const toast           = document.getElementById('toast');
const toastMsg        = document.getElementById('toast-msg');
const toastIcon       = document.getElementById('toast-icon');

// =====================================================
// CAMADA DE API
// =====================================================

/**
 * Busca todas as dúvidas e todas as respostas,
 * cruza os dados e monta doubtsData.
 */
async function fetchDados() {
    mostrarEstado('loading');

    try {
        // Faz as duas requisições em paralelo
        const [resDuvidas, resRespostas] = await Promise.all([
            fetch(`${API.BASE_URL}${API.DUVIDAS}`),
            fetch(`${API.BASE_URL}${API.RESPOSTAS}`)
        ]);

        if (!resDuvidas.ok)   throw new Error(`Erro ao buscar dúvidas: ${resDuvidas.status}`);
        if (!resRespostas.ok) throw new Error(`Erro ao buscar respostas: ${resRespostas.status}`);

        const duvidas   = await resDuvidas.json();
        const respostas = await resRespostas.json();

        // Monta mapa de respostas: { idDuvida -> resposta }
        const mapaRespostas = {};
            respostas.forEach(r => {
                // ✅ idDuvida é a PK da tabela — Jackson serializa direto
                const chave = r.idDuvida ?? r.duvida?.idDuvida;
                if (chave != null) mapaRespostas[chave] = r;
        });

        // Enriquece cada dúvida com os dados da resposta (se existir)
        doubtsData = duvidas.map(d => {
    const resposta = mapaRespostas[d.idDuvida] ?? null;
    return {
            idDuvida:     d.idDuvida,
            titulo:       d.titulo    ?? d.Titulo    ?? '(sem título)',
            descricao:    d.descricao ?? d.Descricao ?? '',
            statusDuvida: d.statusDuvida ?? d.StatusDuvida ?? 'Aberta',
            momento:      d.momento   ?? d.Momento   ?? null,

        // ✅ CORRIGIDO: Hibernate serializa "utilizador" como objeto aninhado
            idAluno:   d.utilizador?.idUtilizador ?? null,
            nomeAluno: d.utilizador?.nome         // <- minúsculo (padrão Jackson)
                ?? d.utilizador?.Nome
                ?? d.nomeAluno
                ?? 'Aluno',

            // ✅ CORRIGIDO: conteudo -> disciplina -> nome
            disciplina: d.conteudo?.disciplina?.nome
                 ?? d.conteudo?.disciplina?.Nome
                 ?? d.disciplina
                 ?? '—',

            // ✅ CORRIGIDO: resposta vem de TBL_RESPOSTADUVIDA
            // A PK é idDuvida — mapa já está correto, mas os campos precisam bater
            resposta: resposta ? {
                conteudo: resposta.conteudoResposta  // <- camelCase do Jackson
                   ?? resposta.ConteudoResposta
                   ?? '',
                momento:  resposta.momento ?? resposta.Momento ?? null,
                idProf:   resposta.idUtilizador
                   ?? resposta.utilizador?.idUtilizador
                   ?? null,
            } : null,
        };
    });

        popularFiltroMateria();
        renderTabela();
        atualizarStats();
        mostrarEstado('table');

    } catch (err) {
        console.error('[EstudeX] Erro ao carregar dados:', err);
        errorMsg.textContent = `Não foi possível conectar à API. (${err.message})`;
        mostrarEstado('error');
    }
}

/**
 * Envia a resposta do professor para POST /respostas
 * e atualiza StatusDuvida via PATCH /duvidas/{id} se disponível.
 */
/* async function enviarResposta(idDuvida, textoResposta) {
    // Payload conforme TBL_RESPOSTADUVIDA
    const payload = {
        idDuvida:          idDuvida,
        idUtilizador:      ID_PROFESSOR_LOGADO,
        momento:           new Date().toISOString(),
        conteudoResposta:  textoResposta,

        // Alguns JPA mapeiam como objeto aninhado — enviamos os dois formatos
        // para cobrir qualquer configuração de serialização
        duvida:      { idDuvida: idDuvida },
        utilizador:  { idUtilizador: ID_PROFESSOR_LOGADO },
    };

    const res = await fetch(`${API.BASE_URL}${API.RESPOSTAS}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
    });

    if (!res.ok) {
        const corpo = await res.text();
        throw new Error(`Status ${res.status}: ${corpo}`);
    }

    return await res.json();
}*/

async function enviarResposta(idDuvida, textoResposta) {
    const payload = {
        idDuvida:         idDuvida,
        momento:          new Date().toISOString(),
        conteudoResposta: textoResposta,

        // mantém só a duvida (se seu backend usa)
        duvida: { idDuvida: idDuvida }
    };
''
    const res = await fetch(`${API.BASE_URL}${API.RESPOSTAS}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
    });

    if (!res.ok) {
        const corpo = await res.text();
        throw new Error(`Status ${res.status}: ${corpo}`);
    }

    return await res.json();
}

async function validarResposta()
{
    if(ConteudoResposta != null)
        {
            duvida.statusDuvida = "Respondida"
        }
    else
        {
            duvida.statusDuvida = "Pendente"
        }
}

// =====================================================
// RENDERIZAÇÃO
// =====================================================

function getFiltered() {
    return doubtsData.filter(d => {
        const matchStatus  = filterStatus  === 'all' || d.statusDuvida === filterStatus;
        const matchSubject = filterSubject === 'all' || d.disciplina   === filterSubject;
        const matchId      = !searchId     || String(d.idDuvida).includes(searchId.trim());
        const matchName    = !searchName   || d.nomeAluno.toLowerCase().includes(searchName.trim().toLowerCase());
        return matchStatus && matchSubject && matchId && matchName;
    });
}

function getSorted(lista) {
    return [...lista].sort((a, b) => {
        let va = a[sortCol];
        let vb = b[sortCol];

        if (sortCol === 'momento') {
            va = va ? new Date(va) : new Date(0);
            vb = vb ? new Date(vb) : new Date(0);
        } else {
            va = String(va ?? '').toLowerCase();
            vb = String(vb ?? '').toLowerCase();
        }

        if (va < vb) return sortDir === 'asc' ? -1 :  1;
        if (va > vb) return sortDir === 'asc' ?  1 : -1;
        return 0;
    });
}

function renderTabela() {
    const filtrado = getSorted(getFiltered());
    resultsCount.textContent = `${filtrado.length} resultado${filtrado.length !== 1 ? 's' : ''}`;

    // Atualizar ícones de ordenação
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.col === sortCol) {
            th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });

    if (!filtrado.length) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    tableBody.innerHTML = filtrado.map(d => {
        const respondida  = d.statusDuvida === 'Respondida';
        const iniciais    = getIniciais(d.nomeAluno);
        const dataLabel   = formatarData(d.momento);

        return `
        <tr>
            <td><span class="cell-id">#${String(d.idDuvida).padStart(3, '0')}</span></td>
            <td>
                <div class="cell-student">
                    <div class="avatar-mini">${iniciais}</div>
                    <span>${escapeHTML(d.nomeAluno)}</span>
                </div>
            </td>
            <td><span class="cell-title" title="${escapeHTML(d.titulo)}">${escapeHTML(d.titulo)}</span></td>
            <td><span class="badge badge-subject">${escapeHTML(d.disciplina)}</span></td>
            <td><span class="cell-date">${dataLabel}</span></td>
            <td>
                <span class="badge ${respondida ? 'badge-answered' : 'badge-pending'}">
                    ${respondida ? 'Respondida' : 'Pendente'}
                </span>
            </td>
            <td>
                <button class="btn-action ${respondida ? '' : 'reply'}" data-id="${d.idDuvida}">
                    <i class="fas ${respondida ? 'fa-eye' : 'fa-reply'}"></i>
                    ${respondida ? 'Ver' : 'Responder'}
                </button>
            </td>
        </tr>`;
    }).join('');

    tableBody.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', () => abrirModal(parseInt(btn.dataset.id)));
    });
}

function atualizarStats() {
    document.getElementById('cnt-total').textContent    = doubtsData.length;
    document.getElementById('cnt-pending').textContent  = doubtsData.filter(d => d.statusDuvida !== 'Respondida').length;
    document.getElementById('cnt-answered').textContent = doubtsData.filter(d => d.statusDuvida === 'Respondida').length;
}

function popularFiltroMateria() {
    const materias = [...new Set(doubtsData.map(d => d.disciplina).filter(Boolean))].sort();
    const opcoes   = materias.map(m => `<option value="${escapeHTML(m)}">${escapeHTML(m)}</option>`).join('');
    filterSelect.innerHTML = `<option value="all">Todas as matérias</option>${opcoes}`;
}

// =====================================================
// ESTADOS DA TABELA (loading / error / table)
// =====================================================

function mostrarEstado(estado) {
    loadingState.style.display  = estado === 'loading' ? 'flex'  : 'none';
    errorState.style.display    = estado === 'error'   ? 'flex'  : 'none';
    tableWrapper.style.display  = estado === 'table'   ? 'block' : 'none';
    emptyState.style.display    = 'none';
}

// =====================================================
// MODAL
// =====================================================

function abrirModal(id) {
    const d = doubtsData.find(x => x.idDuvida === id);
    if (!d) return;
    activeDoubtId = id;

    document.getElementById('modal-id').textContent      = `#${String(d.idDuvida).padStart(3, '0')}`;
    document.getElementById('modal-title').textContent   = d.titulo;
    document.getElementById('modal-student').textContent = d.nomeAluno;
    document.getElementById('modal-avatar').textContent  = getIniciais(d.nomeAluno);
    document.getElementById('modal-description').textContent = d.descricao;
    document.getElementById('modal-meta').textContent    = `${d.disciplina} · Enviada em ${formatarData(d.momento)}`;

    const badge        = document.getElementById('modal-badge');
    const respondida   = d.statusDuvida === 'Respondida';
    badge.textContent  = respondida ? 'Respondida' : 'Pendente';
    badge.className    = `badge ${respondida ? 'badge-answered' : 'badge-pending'}`;

    const answerDisplay = document.getElementById('answer-display');
    const answerForm    = document.getElementById('answer-form-section');

    if (respondida && d.resposta) {
        answerDisplay.style.display = 'flex';
        answerForm.style.display    = 'none';
        document.getElementById('modal-answer-text').textContent = d.resposta.conteudo;
        document.getElementById('modal-answer-date').innerHTML   =
            `<i class="fas fa-check-circle"></i> Respondida em ${formatarData(d.resposta.momento)}`;
    } else {
        answerDisplay.style.display = 'none';
        answerForm.style.display    = 'flex';
        answerInput.value           = '';
        answerInput.classList.remove('error');
    }

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (!respondida) setTimeout(() => answerInput.focus(), 300);
}

function fecharModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    activeDoubtId = null;
}

async function confirmarResposta() {
    const texto = answerInput.value.trim();
    if (!texto) {
        answerInput.classList.add('error');
        answerInput.focus();
        setTimeout(() => answerInput.classList.remove('error'), 1500);
        return;
    }

    // UI: estado de carregamento no botão
    btnSendAnswer.disabled = true;
    document.getElementById('btn-send-text').textContent = 'Enviando...';
    document.getElementById('btn-send-icon').style.display   = 'none';
    document.getElementById('btn-spinner').style.display     = 'block';

    try {
        await enviarResposta(activeDoubtId, texto);

        // Atualiza localmente sem precisar recarregar tudo
        const idx = doubtsData.findIndex(d => d.idDuvida === activeDoubtId);
        if (idx !== -1) {
            doubtsData[idx].statusDuvida = 'Respondida';
            doubtsData[idx].resposta     = {
                conteudo: texto,
                momento:  new Date().toISOString(),
                //idProf:   null,
            };
        }

        fecharModal();
        renderTabela();
        atualizarStats();
        showToast('Resposta enviada com sucesso!', 'success');

    } catch (err) {
        console.error('[EstudeX] Erro ao enviar resposta:', err);
        showToast(`Erro ao enviar resposta. ${err.message}`, 'error');
    } finally {
        // Restaura botão
        btnSendAnswer.disabled = false;
        document.getElementById('btn-send-text').textContent = 'Enviar Resposta';
        document.getElementById('btn-send-icon').style.display   = 'inline';
        document.getElementById('btn-spinner').style.display     = 'none';
    }
}

// =====================================================
// EVENTOS
// =====================================================

// Filtros de status
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterStatus = btn.dataset.filter;
        renderTabela();
    });
});

// Filtro de matéria
filterSelect.addEventListener('change', () => {
    filterSubject = filterSelect.value;
    renderTabela();
});

// Pesquisa por ID (apenas números)
searchIdInput.addEventListener('input', () => {
    searchId = searchIdInput.value.replace(/\D/g, '');
    searchIdInput.value = searchId;
    renderTabela();
});

// Pesquisa por nome
searchNameInput.addEventListener('input', () => {
    searchName = searchNameInput.value;
    renderTabela();
});

// Limpar campos de pesquisa
btnClear.addEventListener('click', () => {
    searchIdInput.value   = '';
    searchNameInput.value = '';
    searchId   = '';
    searchName = '';
    renderTabela();
});

// Recarregar dados da API
btnRefresh.addEventListener('click', () => {
    btnRefresh.classList.add('spinning');
    fetchDados().finally(() => btnRefresh.classList.remove('spinning'));
});

// Tentar novamente em caso de erro
btnRetry.addEventListener('click', fetchDados);

// Ordenação por coluna
document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const col = th.dataset.col;
        sortDir   = sortCol === col && sortDir === 'asc' ? 'desc' : 'asc';
        sortCol   = col;
        renderTabela();
    });
});

// Modal: fechar
modalClose.addEventListener('click', fecharModal);
btnCancel.addEventListener('click', fecharModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) fecharModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModal(); });

// Modal: enviar resposta
btnSendAnswer.addEventListener('click', confirmarResposta);
answerInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) confirmarResposta();
});

// Sidebar toggle
menuToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebar.classList.toggle('collapsed');
});

// =====================================================
// TOAST
// =====================================================
let toastTimer = null;

function showToast(msg, tipo = 'success', duracao = 3500) {
    toastMsg.textContent = msg;
    toast.classList.remove('error-toast');
    if (tipo === 'error') toast.classList.add('error-toast');

    toastIcon.className = tipo === 'error'
        ? 'fas fa-exclamation-circle'
        : 'fas fa-check-circle';

    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), duracao);
}

// =====================================================
// UTILITÁRIOS
// =====================================================

function getIniciais(nome) {
    const partes = (nome || '').trim().split(' ');
    return partes.length >= 2
        ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
        : (nome || 'AL').substring(0, 2).toUpperCase();
}

function formatarData(valor) {
    if (!valor) return '—';
    const d = new Date(valor);
    if (isNaN(d)) return valor;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHTML(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// =====================================================
// INICIALIZAÇÃO
// =====================================================
fetchDados();