const firebaseConfig = {
    apiKey: "AIzaSyDvj-9BlmWy2EpSC-XSFhOGOnqrQ8JYB3E",
    authDomain: "painel-ets.firebaseapp.com",
    databaseURL: "https://painel-ets-default-rtdb.firebaseio.com", 
    projectId: "painel-ets",
    storageBucket: "painel-ets.firebasestorage.app",
    messagingSenderId: "809999984863",
    appId: "1:809999984863:web:251e244866c0b0debf616a",
    measurementId: "G-Q2JN0HYXSP"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let dados = {};
let editando = null; 

// ==========================================
// FUNÇÃO PARA CALCULAR DIAS
// ==========================================
function calcularDias(dataString) {
    if (!dataString) return { formatada: '', dias: '' };
    
    const [ano, mes, dia] = dataString.split('-');
    const dataServico = new Date(ano, mes - 1, dia);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const diffTempo = hoje - dataServico;
    const diffDias = Math.floor(diffTempo / (1000 * 60 * 60 * 24));
    
    const dataFormatada = `${dia}/${mes}/${ano}`;
    let textoDias = "";
    
    if (diffDias === 0) textoDias = "Hoje";
    else if (diffDias === 1) textoDias = "1 dia";
    else if (diffDias > 1) textoDias = `${diffDias} dias`;
    else if (diffDias < 0) textoDias = `Faltam ${Math.abs(diffDias)} dias`;
    
    return { formatada: dataFormatada, dias: textoDias };
}

// ==========================================
// BANCO DE DADOS
// ==========================================
db.ref('obrasCaern').on('value', (snapshot) => {
    dados = snapshot.val() || {}; 
    renderizarDashboard();
    renderizarAdmin();
});

function salvarDados() {
    db.ref('obrasCaern').set(dados);
}

// ==========================================
// LÓGICA DA TV (Dashboard)
// ==========================================
function renderizarDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return; 
    
    dashboard.innerHTML = ''; 

    for (const [encarregado, servicos] of Object.entries(dados)) {
        const card = document.createElement('div');
        card.className = 'card';
        
        let htmlServicos = '';
        let temServico = false;

        servicos.forEach(item => {
            // Ignora o serviço fantasma que criamos para enganar o Firebase
            if (item.dummy) return; 
            
            temServico = true;
            const infoData = calcularDias(item.data);
            const htmlData = item.data ? `<div class="data-info">📅 ${infoData.formatada} <span class="contador-dias">${infoData.dias}</span></div>` : '';

            htmlServicos += `
                <div class="servico-item">
                    <div class="servico-header">
                        <div style="flex: 1; padding-right: 10px;">
                            <span><strong>${item.local}</strong> - ${item.servico}</span>
                            ${htmlData}
                        </div>
                        <span class="status status-${item.status.toLowerCase()}">${item.status}</span>
                    </div>
                    ${item.nota ? `<div class="nota">Obs: ${item.nota}</div>` : ''}
                </div>
            `;
        });

        card.innerHTML = `
            <h2>👷 ${encarregado}</h2>
            <div class="servicos-lista">
                ${temServico ? htmlServicos : '<div class="nota">Nenhuma frente de trabalho.</div>'}
            </div>
        `;
        dashboard.appendChild(card);
    }
}

// ==========================================
// LÓGICA DO PC (Admin CRUD)
// ==========================================
function renderizarAdmin() {
    const select = document.getElementById('selectEncarregado');
    const lista = document.getElementById('listaAdmin');
    if (!select || !lista) return; 

    select.innerHTML = '<option value="">Selecione...</option>';
    for (const encarregado in dados) {
        select.innerHTML += `<option value="${encarregado}">${encarregado}</option>`;
    }

    lista.innerHTML = '';
    for (const [encarregado, servicos] of Object.entries(dados)) {
        let htmlServicos = '';
        
        servicos.forEach((item, index) => {
            if (item.dummy) return; // Esconde o fantasma no admin também

            const infoData = calcularDias(item.data);
            const txtData = item.data ? `| 📅 ${infoData.formatada} (${infoData.dias})` : '';

            htmlServicos += `
                <div class="servico-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <strong>${item.local}</strong> - ${item.servico} <span style="font-size: 0.8rem; color: #787774; margin-left: 5px;">${txtData}</span>
                        <div style="margin-top: 5px;"><span class="status status-${item.status.toLowerCase()}">${item.status}</span></div>
                    </div>
                    <div class="acoes-btn">
                        <button class="btn-edit" onclick="prepararEdicao('${encarregado}', ${index})">Editar</button>
                        <button class="btn-delete" onclick="deletarServico('${encarregado}', ${index})">Remover</button>
                    </div>
                </div>
            `;
        });

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
// FUNÇÕES DE AÇÃO
// ==========================================
function adicionarEncarregado(event) {
    event.preventDefault();
    const nome = document.getElementById('nomeEncarregado').value.trim();
    if (nome && !dados[nome]) {
        // Colocamos um objeto fantasma "dummy" para o Firebase não apagar o encarregado
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

    if (encarregado && servico && local && data) {
        if (editando) {
            dados[editando.encarregado][editando.index] = { servico, local, data, status, nota };
            editando = null;
            document.getElementById('btnSubmitServico').innerText = 'Adicionar Obra';
            document.getElementById('selectEncarregado').disabled = false;
        } else {
            if(!dados[encarregado]) dados[encarregado] = [];
            
            // Se for a primeira obra, apaga o fantasma
            if(dados[encarregado].length === 1 && dados[encarregado][0].dummy) {
                dados[encarregado] = [];
            }

            dados[encarregado].push({ servico, local, data, status, nota });
        }

        salvarDados();
        
        document.getElementById('nomeServico').value = '';
        document.getElementById('nomeLocal').value = '';
        document.getElementById('dataLocal').value = '';
        document.getElementById('notaLocal').value = '';
        document.getElementById('statusLocal').value = 'Iniciar';
    } else {
        alert("Preencha todos os campos obrigatórios, incluindo a data!");
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
    
    document.getElementById('btnSubmitServico').innerText = 'Salvar Edição';
    editando = { encarregado, index };
    window.scrollTo(0, document.getElementById('formServico').offsetTop - 20);
}

function deletarServico(encarregado, index) {
    dados[encarregado].splice(index, 1);
    
    // Se apagou todas as obras, coloca o fantasma de volta pra ele não sumir
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