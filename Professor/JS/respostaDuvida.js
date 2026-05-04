// =====================================================
// ENVIO DE RESPOSTA — POST /respostas + PATCH /duvidas/{id}/status
// =====================================================

async function enviarResposta(idDuvida, textoResposta) {
    console.log('📤 Enviando resposta:', { idDuvida, textoResposta });

    // Busca o idUtilizador da dúvida ativa para saber quem é o aluno
    // O professor respondendo — por ora pegamos o utilizador da própria dúvida
    // Substitua pelo ID real do professor logado quando tiver sessão
    const duvida     = doubtsData.find(d => d.idDuvida === idDuvida);
    const idProf     = duvida?.idAluno ?? null; // <- troque pelo ID do professor quando tiver login

    const payload = {
        idDuvida:         idDuvida,
        momento:          new Date().toISOString(),
        conteudoResposta: textoResposta,
        // Envia o utilizador como objeto aninhado — Hibernate espera assim
        utilizador: idProf ? { idUtilizador: idProf } : null
    };

    console.log('📦 Payload:', JSON.stringify(payload));

    const resResposta = await fetch(`${API.BASE_URL}${API.RESPOSTAS}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
    });

    if (!resResposta.ok) {
        const corpo = await resResposta.text();
        throw new Error(`Erro ao salvar resposta: ${resResposta.status} — ${corpo}`);
    }

    const resStatus = await fetch(`${API.BASE_URL}${API.DUVIDAS}/${idDuvida}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ statusDuvida: 'Respondida' }),
    });

    if (!resStatus.ok) {
        const corpo = await resStatus.text();
        throw new Error(`Resposta salva, mas erro ao atualizar status: ${resStatus.status} — ${corpo}`);
    }

    return await resResposta.json();
}

// =====================================================
// CONFIRMAR RESPOSTA — chamado pelo botão do modal
// =====================================================

async function confirmarResposta() {
    console.log('🖱️ confirmarResposta chamada, activeDoubtId:', activeDoubtId);

    const texto = answerInput.value.trim();
    if (!texto) {
        answerInput.classList.add('error');
        answerInput.focus();
        setTimeout(() => answerInput.classList.remove('error'), 1500);
        return;
    }

    // Pega os elementos diretamente — sem depender de variáveis do duvidas.js
    const btnSend    = document.getElementById('btn-send-answer');
    const btnText    = document.getElementById('btn-send-text');
    const btnIcon    = document.getElementById('btn-send-icon');
    const btnSpinner = document.getElementById('btn-spinner');

    btnSend.disabled     = true;
    btnText.textContent  = 'Enviando...';
    btnIcon.style.display   = 'none';
    btnSpinner.style.display = 'block';

    try {
        await enviarResposta(activeDoubtId, texto);

        const idx = doubtsData.findIndex(d => d.idDuvida === activeDoubtId);
        if (idx !== -1) {
            doubtsData[idx].statusDuvida = 'Respondida';
            doubtsData[idx].resposta = {
                conteudo: texto,
                momento:  new Date().toISOString(),
            };
        }

        fecharModal();
        renderTabela();
        atualizarStats();
        showToast('Resposta enviada com sucesso!', 'success');

    } catch (err) {
        console.error('[EstudeX] Erro ao enviar resposta:', err);
        showToast(`Erro: ${err.message}`, 'error');

    } finally {
        btnSend.disabled        = false;
        btnText.textContent     = 'Enviar Resposta';
        btnIcon.style.display   = 'inline';
        btnSpinner.style.display = 'none';
    }
}

// =====================================================
// EVENTOS — registrados aqui pois confirmarResposta
// só existe após este arquivo carregar
// =====================================================
document.getElementById('btn-send-answer')
    .addEventListener('click', confirmarResposta);

document.getElementById('answer-input')
    .addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) confirmarResposta();
    });