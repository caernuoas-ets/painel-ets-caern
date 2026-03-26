================================================================================
DOCUMENTAÇÃO OFICIAL - GFT (Gestão de Frentes de Trabalho) v3.1
================================================================================

1. VISÃO GERAL DO SISTEMA
O GFT (Gestão de Frentes de Trabalho) é um sistema web integrado, desenvolvido 
para otimizar o acompanhamento, o controle de status e a visualização espacial 
de serviços de engenharia e manutenção. 

O sistema opera em tempo real, utilizando banco de dados em nuvem (BaaS), e foi 
projetado para funcionar em duas frentes: uma visão tática de monitoramento em 
telas grandes (Dashboard) e um ambiente de gestão operacional (Admin).

Desenvolvedor: Kauã Carlos - @kauacsilva
Versão Atual: 3.1
Tecnologias: HTML5, CSS3, Vanilla JavaScript, Firebase Realtime Database, Leaflet GIS.

--------------------------------------------------------------------------------

2. ARQUITETURA DE ARQUIVOS (MÓDULOS)
O sistema é dividido em 4 módulos principais, representados por seus arquivos:

- index.html (Dashboard): Tela de visualização passiva. Desenvolvida para ficar 
  aberta em TVs ou monitores de Centro de Controle (CCO). Atualiza em tempo 
  real e exibe cards por encarregado e contagem de status.

- admin.html (Painel de Gestão): Acesso restrito aos gestores/controladores. 
  Permite criar quadros de encarregados, adicionar frentes de serviço, alterar 
  status, definir graus de urgência e exportar relatórios para Excel.

- mapa.html (Visão Geográfica - GIS): Mapa interativo que cruza a base de 
  coordenadas com as frentes de trabalho ativas. Possui inteligência de cores e 
  filtros em tempo real para tomada de decisão espacial.

- importador.html (Data Manager): Ferramenta administrativa oculta para injeção 
  em massa ou exclusão de coordenadas no banco de dados, utilizando o padrão 
  copia-e-cola direto do Excel.

- app.js e style.css: O "cérebro" e a "roupagem" do sistema, respectivamente.

--------------------------------------------------------------------------------

3. GUIA DE USO BÁSICO (PASSO A PASSO)

A. Como Criar um Novo Quadro (Encarregado):
1. Acesse a tela de Gerenciamento (admin.html).
2. Na Seção 1, digite o nome do Encarregado ou Equipe.
3. Clique em "Criar Quadro". O nome ficará disponível imediatamente nas listas.

B. Como Adicionar/Editar uma Obra ou Serviço:
1. Na Seção 2 do Gerenciamento, selecione o Encarregado responsável.
2. Preencha o nome do Serviço (ex: Substituição de Bomba) e o Local.
3. [OPCIONAL] Vincular ao Mapa: Digite o nome do Poço/Estação para buscar na 
   base de coordenadas. Se vinculado, um ícone (📍) aparecerá na obra e o pino 
   será ativado no mapa.
4. Defina a Data de Registro e o Status (A Iniciar, Em Execução ou Parada).
5. Clique em "Adicionar Obra".

C. Transferência de Obras entre Equipes:
Para passar uma obra para outro encarregado, basta clicar em "Editar" na obra 
desejada, trocar o nome do encarregado na lista suspensa do topo e salvar.

D. Exportação de Relatórios:
No topo da tela de Gerenciamento, o botão "Exportar Excel" baixa 
instantaneamente toda a base de obras ativas em formato .CSV, compatível com 
Excel ou Power BI, já com cálculos de dias em andamento.

--------------------------------------------------------------------------------

4. LÓGICA DO MAPA DE INFRAESTRUTURA (GIS)

O módulo de mapa utiliza a cartografia Voyager e processa o status das obras 
para alertar visualmente os gestores. Ao passar o mouse sobre os pinos, o 
sistema detalha os serviços ocorrendo naquele exato local.

Regra de Cores e Prioridades (Do mais crítico ao menos crítico):
🔴 VERMELHO (Pulsante): Prioridade máxima. Indica que há pelo menos uma obra 
   "PARADA" naquele local (mesmo que haja outras rodando).
🟢 VERDE: Local com obras "EM EXECUÇÃO". Tudo operando conforme o planejado.
🟠 LARANJA: Local com obras "A INICIAR". Pendente de mobilização.
⚪ CINZA: Infraestrutura mapeada no banco, mas sem nenhuma obra ativa no momento.

Filtros Táticos:
Utilize os menus flutuantes no mapa para ocultar locais sem obras ativas (limpar 
a tela) ou filtrar para visualizar onde a equipe de um encarregado específico 
está espalhada na cidade.

--------------------------------------------------------------------------------

5. SUPORTE E MANUTENÇÃO
- Base de Dados: Firebase (Google). Nenhuma instalação de servidor local é 
  necessária.
- Tema: O sistema possui Modo Escuro (Dark Mode) nativo, com preferência salva 
  no navegador do usuário.
- Dúvidas ou melhorias devem ser reportadas ao desenvolvedor responsável.

================================================================================
