const firebaseConfig = {
    apiKey: "AIzaSyDvj-9BlmWy2EpSC-XSFhOGOnqrQ8JYB3E",
    authDomain: "painel-ets.firebaseapp.com",
    databaseURL: "https://painel-ets-default-rtdb.firebaseio.com", 
    projectId: "painel-ets"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let dados = {};
let editando = null; 
let filtroAtual = 'Todos'; 
let ordemAtual = 'Antigo'; 
let cardapioCoord = {}; // NOVO: Guarda as coordenadas base

// ==========================================
// TEMA NOTURNO
// ==========================================
function alternarTema() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('temaCaern', isDark ? 'escuro' : 'claro');
    document.getElementById('btnTheme').innerText = isDark ? '☀️' : '🌙';
}

window.onload = () => {
    if (localStorage.getItem('temaCaern') === 'escuro') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('btnTheme');
        if(btn) btn.innerText = '☀️';
    }
};

// ==========================================
// FUNÇÕES ÚTEIS
// ==========================================
function calcularDias(dataString) {
    if (!dataString) return { formatada: '', dias: '', diffDias: 0 };
    const [ano, mes, dia] = dataString.split('-');
    const dataServico = new Date(ano, mes - 1, dia);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diffDias = Math.floor((hoje - dataServico) / (1000 * 60 * 60 * 24));
    const dataFormatada = `${dia}/${mes}/${ano}`;
    let textoDias = "";
    if (diffDias === 0) textoDias = "Hoje";
    else if (diffDias === 1) textoDias = "1 dia";
    else if (diffDias > 1) textoDias = `${diffDias} dias`;
    else if (diffDias < 0) textoDias = `Faltam ${Math.abs(diffDias)} dias`;
    return { formatada: dataFormatada, dias: textoDias, diffDias: diffDias };
}

function exportarExcel() {
    let csv = "Encarregado;Local;Servico;Data;Dias;Status;Urgencia;No Mapa;Observacao\n";
    for (const [encarregado, servicos] of Object.entries(dados)) {
        servicos.forEach(item => {
            if(item.dummy) return;
            const infoData = calcularDias(item.data);
            const urg = item.urgencia ? "Sim" : "Nao";
            const noMapa = item.coordId ? "Sim" : "Nao"; // Mostra no excel se tá no mapa
            const nota = item.nota ? item.nota.replace(/;/g, ',') : "";
            csv += `${encarregado};${item.local};${item.servico};${infoData.formatada};${infoData.dias};${item.status};${urg};${noMapa};${nota}\n`;
        });
    }
    const blob = new Blob(["\uFEFF"+csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Relatorio_GFT.csv";
    a.click();
}

// ==========================================
// BANCO DE DADOS
// ==========================================
db.ref('obrasCaern').on('value', (snapshot) => {
    dados = snapshot.val() || {}; 
    renderizarDashboard();
    renderizarAdmin();
});

// LÊ O CARDÁPIO DE COORDENADAS
db.ref('cardapioCoordenadas').on('value', (snapshot) => {
    cardapioCoord = snapshot.val() || {};
    preencherSelectCoordenadas();
});

db.ref('ultimaAtualizacao').on('value', (snapshot) => {
    const dataHora = snapshot.val();
    const textoAtt = document.getElementById('ultimaAtualizacaoTexto');
    if(textoAtt && dataHora) textoAtt.innerText = `Última atualização: ${dataHora}`;
});

function salvarDados() {
    db.ref('obrasCaern').set(dados);
    const agora = new Date().toLocaleString('pt-BR');
    db.ref('ultimaAtualizacao').set(agora);
}

// Preenche a lista suspensa com os endereços em ordem alfabética
function preencherSelectCoordenadas() {
    const select = document.getElementById('selectCoordenada');
    if (!select) return;
    
    const valorAtual = select.value; // Guarda o que estava selecionado pra não piscar
    select.innerHTML = '<option value="">📍 Não vincular a nenhum ponto no mapa</option>';
    
    // Converte objeto em array pra poder ordenar por nome (A-Z)
    const lista = Object.entries(cardapioCoord).map(([id, val]) => ({ id, ...val }));
    lista.sort((a, b) => a.tituloCompleto.localeCompare(b.tituloCompleto));

    lista.forEach(item => {
        select.innerHTML += `<option value="${item.id}">${item.tituloCompleto}</option>`;
    });
    
    select.value = valorAtual;
}

// ==========================================
// LÓGICA DA TV (Dashboard Principal)
// ==========================================
function atualizarFiltros() {
    filtroAtual = document.getElementById('filtroStatus').value;
    ordemAtual = document.getElementById('ordemData').value;
    renderizarDashboard(); 
}

function renderizarDashboard() {
    const dashboard = document.getElementById('dashboard');
    const statsContainer = document.getElementById('statsContainer');
    if (!dashboard) return; 
    
    dashboard.innerHTML = ''; 
    let contagem = { Iniciar: 0, Execucao: 0, Parada: 0, Total: 0 };

    for (const [encarregado, servicosOriginais] of Object.entries(dados)) {
        let servicosFiltrados = servicosOriginais.filter(item => {
            if(item.dummy) return false;
            contagem[item.status]++;
            contagem.Total++;
            if (filtroAtual !== 'Todos' && item.status !== filtroAtual) return false;
            return true;
        });

        servicosFiltrados.sort((a, b) => {
            const dataA = new Date(a.data);
            const dataB = new Date(b.data);
            return ordemAtual === 'Antigo' ? dataA - dataB : dataB - dataA;
        });

        const urgentes = servicosFiltrados.filter(item => item.urgencia);
        const normais = servicosFiltrados.filter(item => !item.urgencia);
        const servicosFinais = [...urgentes, ...normais];

        if (servicosFinais.length === 0) continue;

        const card = document.createElement('div');
        card.className = 'card';
        let htmlServicos = '';

        servicosFinais.forEach(item => {
            const infoData = calcularDias(item.data);
            let classeAlerta = (item.status === 'Parada' && infoData.diffDias >= 10) ? 'alerta-vermelho' : '';
            const badgeUrgencia = item.urgencia ? `<span class="tag-urgencia">Urgente</span>` : '';
            const badgeMapa = item.coordId ? `<span title="Vinculado ao Mapa" style="font-size:0.8rem;">📍</span>` : '';
            const htmlData = item.data ? `<div class="data-info">📅 ${infoData.formatada} <span class="contador-dias ${classeAlerta}">${infoData.dias}</span></div>` : '';

            htmlServicos += `
                <div class="servico-item">
                    <div class="servico-header">
                        <div style="flex: 1; padding-right: 10px;">
                            <span><strong>${item.local}</strong> ${badgeMapa} - ${item.servico} ${badgeUrgencia}</span>
                            ${htmlData}
                        </div>
                        <span class="status status-${item.status.toLowerCase()}">${item.status}</span>
                    </div>
                    ${item.nota ? `<div class="nota">Obs: ${item.nota}</div>` : ''}
                </div>
            `;
        });

        card.innerHTML = `<h2>👷 ${encarregado}</h2><div class="servicos-lista">${htmlServicos}</div>`;
        dashboard.appendChild(card);
    }

    if (statsContainer) {
        statsContainer.innerHTML = `
            <span>📋 Total: ${contagem.Total}</span>
            <span>🚧 Em Execução: ${contagem.Execucao}</span>
            <span>⏳ A Iniciar: ${contagem.Iniciar}</span>
            <span style="color: #e03e3e;">⏸️ Paradas: ${contagem.Parada}</span>
        `;
    }
}

// ==========================================
// LÓGICA DO PC (Com Busca e Mapa)
// ==========================================
function renderizarAdmin() {
    const select = document.getElementById('selectEncarregado');
    const lista = document.getElementById('listaAdmin');
    const inputBusca = document.getElementById('buscaAdmin');
    const termoBusca = inputBusca ? inputBusca.value.toLowerCase().trim() : '';

    if (!select || !lista) return; 

    select.innerHTML = '<option value="">Selecione...</option>';
    for (const encarregado in dados) {
        select.innerHTML += `<option value="${encarregado}">${encarregado}</option>`;
    }

    lista.innerHTML = '';
    for (const [encarregado, servicos] of Object.entries(dados)) {
        let htmlServicos = '';
        let encontrouNaBusca = false;
        
        servicos.forEach((item, index) => {
            if (item.dummy) return; 

            if (termoBusca) {
                const txtLocal = item.local.toLowerCase();
                const txtServ = item.servico.toLowerCase();
                if (!txtLocal.includes(termoBusca) && !txtServ.includes(termoBusca)) return;
            }

            encontrouNaBusca = true;

            const infoData = calcularDias(item.data);
            const badgeUrg = item.urgencia ? '🚨' : '';
            const badgeMapa = item.coordId ? '<span title="Vinculado ao Mapa">📍</span>' : '';
            const txtData = item.data ? `| 📅 ${infoData.formatada} (${infoData.dias})` : '';

            htmlServicos += `
                <div class="servico-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <strong>${badgeUrg} ${item.local} ${badgeMapa}</strong> - ${item.servico} <span style="font-size: 0.8rem; color: #787774; margin-left: 5px;">${txtData}</span>
                        <div style="margin-top: 5px;"><span class="status status-${item.status.toLowerCase()}">${item.status}</span></div>
                    </div>
                    <div class="acoes-btn">
                        <button class="btn-edit" onclick="prepararEdicao('${encarregado}', ${index})">Editar</button>
                        <button class="btn-delete" onclick="deletarServico('${encarregado}', ${index})">Remover</button>
                    </div>
                </div>
            `;
        });

        if (termoBusca && !encontrouNaBusca) continue;

        lista.innerHTML += `
            <div class="card" style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2>${encarregado}</h2>
                    <button class="btn-delete" onclick="deletarEncarregado('${encarregado}')">Excluir Encarregado</button>
                </div>
                ${htmlServicos}
            </div>
        `;
    }
}

// ==========================================
// FUNÇÕES DE AÇÃO (SALVAR OBRA)
// ==========================================
function adicionarEncarregado(event) {
    event.preventDefault();
    const nome = document.getElementById('nomeEncarregado').value.trim();
    if (nome && !dados[nome]) {
        dados[nome] = [{ dummy: true }]; 
        salvarDados();
        document.getElementById('nomeEncarregado').value = '';
    }
}

function adicionarOuEditarServico(event) {
    event.preventDefault();
    const encarregado = document.getElementById('selectEncarregado').value;
    const servico = document.getElementById('nomeServico').value.trim();
    const local = document.getElementById('nomeLocal').value.trim();
    const data = document.getElementById('dataLocal').value; 
    const status = document.getElementById('statusLocal').value;
    const nota = document.getElementById('notaLocal').value.trim();
    const urgencia = document.getElementById('urgenciaLocal').checked; 
    
    // Captura o ID do mapa selecionado
    const coordId = document.getElementById('selectCoordenada').value;

    if (encarregado && servico && local && data) {
        
        // Monta o objeto que vai pro banco
        const objObra = { servico, local, data, status, nota, urgencia };
        
        // Se a pessoa vinculou no mapa, injeta os dados espaciais no objeto
        if (coordId && cardapioCoord[coordId]) {
            objObra.coordId = coordId;
            objObra.lat = cardapioCoord[coordId].lat;
            objObra.lng = cardapioCoord[coordId].lng;
            objObra.coordNome = cardapioCoord[coordId].tituloCompleto;
        }

        if (editando) {
            dados[editando.encarregado][editando.index] = objObra;
            editando = null;
            document.getElementById('btnSubmitServico').innerText = 'Adicionar Obra';
            document.getElementById('selectEncarregado').disabled = false;
        } else {
            if(!dados[encarregado]) dados[encarregado] = [];
            if(dados[encarregado].length === 1 && dados[encarregado][0].dummy) {
                dados[encarregado] = [];
            }
            dados[encarregado].push(objObra);
        }

        salvarDados();
        
        // Limpa tudo
        document.getElementById('nomeServico').value = '';
        document.getElementById('nomeLocal').value = '';
        document.getElementById('dataLocal').value = '';
        document.getElementById('notaLocal').value = '';
        document.getElementById('urgenciaLocal').checked = false; 
        document.getElementById('selectCoordenada').value = ''; 
        document.getElementById('statusLocal').value = 'Iniciar';
    } else {
        alert("Preencha todos os campos obrigatórios!");
    }
}

function prepararEdicao(encarregado, index) {
    const item = dados[encarregado][index];
    document.getElementById('selectEncarregado').value = encarregado;
    document.getElementById('selectEncarregado').disabled = true; 
    document.getElementById('nomeServico').value = item.servico;
    document.getElementById('nomeLocal').value = item.local;
    document.getElementById('dataLocal').value = item.data || ''; 
    document.getElementById('statusLocal').value = item.status;
    document.getElementById('notaLocal').value = item.nota || '';
    document.getElementById('urgenciaLocal').checked = item.urgencia || false; 
    
    // Restaura a seleção do mapa se houver
    document.getElementById('selectCoordenada').value = item.coordId || ''; 
    
    document.getElementById('btnSubmitServico').innerText = 'Salvar Edição';
    editando = { encarregado, index };
    window.scrollTo(0, document.getElementById('formServico').offsetTop - 20);
}

function deletarServico(encarregado, index) {
    dados[encarregado].splice(index, 1);
    if (dados[encarregado].length === 0) {
        dados[encarregado] = [{ dummy: true }];
    }
    salvarDados();
}

function deletarEncarregado(encarregado) {
    if(confirm(`Tem certeza que deseja remover ${encarregado} e todas as suas obras?`)) {
        delete dados[encarregado];
        salvarDados();
    }
}

const formEnc = document.getElementById('formEncarregado');
if (formEnc) formEnc.addEventListener('submit', adicionarEncarregado);
const formServ = document.getElementById('formServico');
if (formServ) formServ.addEventListener('submit', adicionarOuEditarServico);