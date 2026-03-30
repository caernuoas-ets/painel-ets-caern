const firebaseConfig = {
    apiKey: "AIzaSyDvj-9BlmWy2EpSC-XSFhOGOnqrQ8JYB3E",
    authDomain: "painel-ets.firebaseapp.com",
    databaseURL: "https://painel-ets-default-rtdb.firebaseio.com", 
    projectId: "painel-ets"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth(); // Módulo de Autenticação

let dados = {};
let editando = null; 
let filtroAtual = 'Todos'; 
let ordemAtual = 'Antigo'; 
let cardapioCoord = {}; 

// ==========================================
// CONTROLO DE SESSÃO E LOGIN (TRAVA DE SEGURANÇA)
// ==========================================
auth.onAuthStateChanged(user => {
    // Verifica se estamos na página de login
    const isLoginPage = window.location.pathname.includes('login.html');

    if (!user) {
        // Se NÃO estiver logado e não estiver no login, manda para o login
        if (!isLoginPage) {
            window.location.replace('login.html');
        }
    } else {
        // Se ESTIVER logado e tentar abrir a página de login, manda para o painel
        if (isLoginPage) {
            window.location.replace('index.html');
        } else {
            // Só libera o carregamento dos dados se a pessoa for autorizada
            carregarDadosDoBanco();
        }
    }
});

function fazerLogin(event) {
    event.preventDefault();
    // O .trim() remove espaços em branco acidentais no início ou no fim
    const email = document.getElementById('emailLogin').value.trim(); 
    const senha = document.getElementById('senhaLogin').value;
    
    auth.signInWithEmailAndPassword(email, senha).catch(error => {
        // Agora o alerta vai mostrar o código de erro EXATO do Firebase
        alert("Erro do Firebase: " + error.code + "\n\nDetalhe: " + error.message);
        console.error(error);
    });
}

function fazerLogout() {
    auth.signOut();
}

// ==========================================
// CARREGAMENTO SEGURO DE DADOS
// ==========================================
function carregarDadosDoBanco() {
    db.ref('obrasCaern').on('value', (snapshot) => {
        dados = snapshot.val() || {}; 
        if (typeof renderizarDashboard === 'function') renderizarDashboard();
        if (typeof renderizarAdmin === 'function') renderizarAdmin();
    });

    db.ref('cardapioCoordenadas').on('value', (snapshot) => {
        cardapioCoord = snapshot.val() || {};
        if (typeof preencherSelectCoordenadas === 'function') preencherSelectCoordenadas();
        if (typeof renderizarListaCadastrados === 'function') renderizarListaCadastrados();
    });

    db.ref('ultimaAtualizacao').on('value', (snapshot) => {
        const dataHora = snapshot.val();
        const textoAtt = document.getElementById('ultimaAtualizacaoTexto');
        if (textoAtt && dataHora) textoAtt.innerText = `Última atualização: ${dataHora}`;
    });
}

function salvarDados() {
    db.ref('obrasCaern').set(dados);
    const agora = new Date().toLocaleString('pt-BR');
    db.ref('ultimaAtualizacao').set(agora);
}

// ==========================================
// TEMA NOTURNO
// ==========================================
function alternarTema() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('temaCaern', isDark ? 'escuro' : 'claro');
    const btn = document.getElementById('btnTheme');
    if (btn) btn.innerText = isDark ? '☀️' : '🌙';
}

window.onload = () => {
    if (localStorage.getItem('temaCaern') === 'escuro') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('btnTheme');
        if (btn) btn.innerText = '☀️';
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
            if (item.dummy) return;
            const infoData = calcularDias(item.data);
            const urg = item.urgencia ? "Sim" : "Nao";
            const noMapa = item.coordId ? "Sim" : "Nao"; 
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
// GESTÃO DO DATALIST E LISTA DA SEÇÃO 4
// ==========================================
function preencherSelectCoordenadas() {
    const datalist = document.getElementById('listaCoordenadas');
    if (!datalist) return;
    
    datalist.innerHTML = '';
    const lista = Object.entries(cardapioCoord).map(([id, val]) => ({ id, ...val }));
    lista.sort((a, b) => a.tituloCompleto.localeCompare(b.tituloCompleto));
    
    lista.forEach(item => { 
        datalist.innerHTML += `<option value="${item.tituloCompleto}"></option>`; 
    });
}

function renderizarListaCadastrados() {
    const divListaCadastro = document.getElementById('listaCadastrados');
    const inputBusca = document.getElementById('buscaLocaisBase');
    if (!divListaCadastro) return;

    const termoBusca = inputBusca ? inputBusca.value.toLowerCase().trim() : '';
    divListaCadastro.innerHTML = '';

    const lista = Object.entries(cardapioCoord).map(([id, val]) => ({ id, ...val }));
    lista.sort((a, b) => a.tituloCompleto.localeCompare(b.tituloCompleto));
    let contadorResultados = 0;

    lista.forEach(item => {
        if (termoBusca && !item.tituloCompleto.toLowerCase().includes(termoBusca)) return;
        
        divListaCadastro.innerHTML += `
            <div class="local-item-admin">
                <div>
                    <strong>${item.tituloCompleto}</strong><br>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">Lat: ${item.lat} | Lng: ${item.lng}</span>
                </div>
                <button class="btn-excluir-local" onclick="eliminarLocal('${item.id}', '${item.tituloCompleto}')">Excluir</button>
            </div>`;
        contadorResultados++;
    });

    if (lista.length === 0) {
        divListaCadastro.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--text-muted);">Nenhum local cadastrado.</div>';
    } else if (contadorResultados === 0) {
        divListaCadastro.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--text-muted);">Nenhum local encontrado.</div>';
    }
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
            if (item.dummy) return false;
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
                </div>`;
        });
        
        card.innerHTML = `<h2>👷 ${encarregado}</h2><div class="servicos-lista">${htmlServicos}</div>`;
        dashboard.appendChild(card);
    }
    
    if (statsContainer) {
        statsContainer.innerHTML = `<span>📋 Total: ${contagem.Total}</span><span>🚧 Em Execução: ${contagem.Execucao}</span><span>⏳ A Iniciar: ${contagem.Iniciar}</span><span style="color: #e03e3e;">⏸️ Paradas: ${contagem.Parada}</span>`;
    }
}

// ==========================================
// LÓGICA DO PC (Admin)
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
                </div>`;
        });
        
        if (termoBusca && !encontrouNaBusca) continue;
        
        lista.innerHTML += `
            <div class="card" style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2>${encarregado}</h2>
                    <button class="btn-delete" onclick="deletarEncarregado('${encarregado}')">Excluir Quadro</button>
                </div>
                ${htmlServicos}
            </div>`;
    }
}

// ==========================================
// FUNÇÕES DE AÇÃO (SALVAR OBRA E EDITAR)
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
    const encarregadoNovo = document.getElementById('selectEncarregado').value;
    const servico = document.getElementById('nomeServico').value.trim();
    const local = document.getElementById('nomeLocal').value.trim();
    const data = document.getElementById('dataLocal').value; 
    const status = document.getElementById('statusLocal').value;
    const nota = document.getElementById('notaLocal').value.trim();
    const urgencia = document.getElementById('urgenciaLocal').checked; 
    
    const textoCoordenada = document.getElementById('inputCoordenada').value.trim();
    let coordId = "";
    
    if (textoCoordenada) {
        const localEncontrado = Object.entries(cardapioCoord).find(([id, val]) => val.tituloCompleto === textoCoordenada);
        if (localEncontrado) coordId = localEncontrado[0];
    }

    if (encarregadoNovo && servico && local && data) {
        const objObra = { servico, local, data, status, nota, urgencia };
        
        if (coordId && cardapioCoord[coordId]) {
            objObra.coordId = coordId; 
            objObra.lat = cardapioCoord[coordId].lat;
            objObra.lng = cardapioCoord[coordId].lng; 
            objObra.coordNome = cardapioCoord[coordId].tituloCompleto;
        }

        if (editando) {
            const encarregadoAntigo = editando.encarregado;
            const indexAntigo = editando.index;
            
            if (encarregadoAntigo === encarregadoNovo) {
                dados[encarregadoAntigo][indexAntigo] = objObra;
            } else {
                if (!dados[encarregadoNovo]) dados[encarregadoNovo] = [];
                if (dados[encarregadoNovo].length === 1 && dados[encarregadoNovo][0].dummy) dados[encarregadoNovo] = [];
                
                dados[encarregadoNovo].push(objObra);
                dados[encarregadoAntigo].splice(indexAntigo, 1);
                
                if (dados[encarregadoAntigo].length === 0) dados[encarregadoAntigo] = [{ dummy: true }]; 
            }
            
            editando = null;
            document.getElementById('btnSubmitServico').innerText = 'Adicionar Obra/serviço';
        } else {
            if (!dados[encarregadoNovo]) dados[encarregadoNovo] = [];
            if (dados[encarregadoNovo].length === 1 && dados[encarregadoNovo][0].dummy) dados[encarregadoNovo] = [];
            dados[encarregadoNovo].push(objObra);
        }
        
        salvarDados();
        
        document.getElementById('nomeServico').value = ''; 
        document.getElementById('nomeLocal').value = '';
        document.getElementById('dataLocal').value = ''; 
        document.getElementById('notaLocal').value = '';
        document.getElementById('urgenciaLocal').checked = false; 
        document.getElementById('inputCoordenada').value = ''; 
        document.getElementById('statusLocal').value = 'Iniciar';
    } else {
        alert("Preencha todos os campos obrigatórios!");
    }
}

function prepararEdicao(encarregado, index) {
    const item = dados[encarregado][index];
    document.getElementById('selectEncarregado').value = encarregado;
    document.getElementById('nomeServico').value = item.servico;
    document.getElementById('nomeLocal').value = item.local;
    document.getElementById('dataLocal').value = item.data || ''; 
    document.getElementById('statusLocal').value = item.status;
    document.getElementById('notaLocal').value = item.nota || '';
    document.getElementById('urgenciaLocal').checked = item.urgencia || false; 
    
    const inputCoord = document.getElementById('inputCoordenada');
    if (item.coordId && cardapioCoord[item.coordId]) {
        inputCoord.value = cardapioCoord[item.coordId].tituloCompleto;
    } else {
        inputCoord.value = '';
    }
    
    document.getElementById('btnSubmitServico').innerText = 'Salvar Edição';
    editando = { encarregado, index }; 
    window.scrollTo(0, document.getElementById('formServico').offsetTop - 20);
}

function deletarServico(encarregado, index) {
    dados[encarregado].splice(index, 1);
    if (dados[encarregado].length === 0) dados[encarregado] = [{ dummy: true }];
    salvarDados();
}

function deletarEncarregado(encarregado) {
    if(confirm(`Tem certeza que deseja remover ${encarregado} e todas as suas obras?`)) {
        delete dados[encarregado]; 
        salvarDados();
    }
}

// ==========================================
// FUNÇÕES DO IMPORTADOR / GESTOR DE LOCAIS
// ==========================================
function logImportacao(msg, isError = false) {
    const logDiv = document.getElementById('logImportacao');
    if (!logDiv) return;
    const cor = isError ? 'class="erro"' : '';
    logDiv.innerHTML += `<div ${cor}>> ${msg}</div>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

async function processarDados() {
    const logDiv = document.getElementById('logImportacao');
    if (logDiv) logDiv.innerHTML = '';
    
    const texto = document.getElementById('dadosExcel').value.trim();
    if (!texto) return alert("Cole os dados do Excel primeiro!");

    const linhas = texto.split('\n');
    let sucesso = 0; 
    let falha = 0;
    
    logImportacao(`Iniciando análise de ${linhas.length} linha(s)...`);

    for (let linha of linhas) {
        if (!linha.trim()) continue;
        let colunas = linha.split('\t'); 
        if (colunas.length < 3) colunas = linha.split('/'); 

        if (colunas.length < 3) { 
            logImportacao(`[ERRO] Linha fora do padrão (nome | complemento | lat,lng): ${linha}`, true); 
            falha++; 
            continue; 
        }

        const nome = colunas[0].trim();
        const sistema = colunas[1].trim();
        const coordenadasTexto = colunas[2].trim(); 
        const coordsArray = coordenadasTexto.split(',');

        if (coordsArray.length === 2) {
            const lat = parseFloat(coordsArray[0].trim());
            const lng = parseFloat(coordsArray[1].trim());

            if (isNaN(lat) || isNaN(lng)) { 
                logImportacao(`[ERRO] Coordenadas inválidas para: ${nome}`, true); 
                falha++; 
                continue; 
            }

            const localID = 'coord_' + Date.now() + Math.floor(Math.random() * 1000);
            const dadosLocal = { nome, sistema, tituloCompleto: `${nome} - ${sistema}`, lat, lng };

            await db.ref('cardapioCoordenadas/' + localID).set(dadosLocal);
            logImportacao(`[OK] ${nome} salvo na base!`);
            sucesso++;
        } else {
            logImportacao(`[ERRO] Formato de coordenada ruim para: ${nome}`, true); 
            falha++;
        }
    }
    
    logImportacao(`--- CONCLUSÃO: ${sucesso} salvos | ${falha} falhas ---`);
    document.getElementById('dadosExcel').value = ''; 
}

window.eliminarLocal = function(id, nome) {
    if(confirm(`ATENÇÃO! Tem certeza que deseja excluir "${nome}" da base de mapas? Isso não apagará as obras, mas elas perderão a marcação no mapa.`)) {
        db.ref('cardapioCoordenadas/' + id).remove();
    }
}

const formEnc = document.getElementById('formEncarregado');
if (formEnc) formEnc.addEventListener('submit', adicionarEncarregado);
const formServ = document.getElementById('formServico');
if (formServ) formServ.addEventListener('submit', adicionarOuEditarServico);