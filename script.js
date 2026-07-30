/* =========================================================
   LUMIÈRE FASHION — Catálogo
   JavaScript Vanilla. Lê uma planilha do Google Sheets publicada
   em .csv e monta a vitrine dinamicamente.
   ========================================================= */

/* ---------------------------------------------------------
   1) CONFIGURAÇÃO — edite apenas estas duas constantes
   --------------------------------------------------------- */

/* ATENÇÃO: está apontando para o arquivo de DEMONSTRAÇÃO (produtos-exemplo.csv),
   com peças e fotos fictícias, só para a página poder ser vista funcionando.

   Para entrar no ar de verdade, troque o valor abaixo pelo link do Google Sheets
   publicado na web em formato CSV.
   Como gerar: Arquivo → Compartilhar → Publicar na web →
   selecione a aba → formato "Valores separados por vírgula (.csv)" → Publicar.
   O link tem o formato:
   https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv */
const URL_PLANILHA_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSb45jKY0bN3BFrH1Gbi1-nRLKmXIF8jKXAaFVTju-tg-55IpFxuAOKY07DdyIw0zBfjGZEyoCGxQyj/pub?output=csv';

/* Número da loja no formato internacional, apenas dígitos:
   55 (Brasil) + DDD + número. Ex.: '5534998371534' */
const NUMERO_WHATSAPP = '5534998371534';

/* Colunas usadas, na primeira linha da planilha:
   id, nome_produto, categoria, link_imagem

   As colunas são localizadas pelo NOME do cabeçalho, então a ordem não importa
   e colunas extras (preço, estoque, tamanho, fornecedor...) são simplesmente
   ignoradas — a loja pode manter seus controles na mesma planilha sem
   quebrar o site.

   Não existe coluna de preço em uso: por decisão da marca o valor não aparece
   no site, para que a cliente chame no WhatsApp. */

/* Mensagem que já vem escrita quando a cliente toca em "Consultar valor".
   Edite o texto à vontade. Os campos entre chaves são trocados pelos dados da peça:

     {nome}       nome_produto
     {categoria}  categoria
     {codigo}     id
     {foto}       link_imagem (link completo)

   O {foto} está disponível mas fora da mensagem por opção: ele entraria como
   um endereço longo no meio do texto. Para voltar a usá-lo, basta acrescentar
   '{foto}' como uma linha da lista abaixo — o WhatsApp passa a mostrar uma
   prévia com a miniatura da peça. (Anexar a imagem de fato não é possível:
   links wa.me só transportam texto.)

   Formatação do WhatsApp: *negrito*, _itálico_.
   Se a peça não tiver categoria ou código na planilha, a linha correspondente
   é removida sozinha — não fica "Categoria:" vazio. */
const MENSAGEM_WHATSAPP = [
  'Olá! Vim pelo catálogo da Lumière Fashion e tenho interesse nesta peça:',
  '',
  '*{nome}*',
  'Categoria: {categoria}',
  'Código: {codigo}',
  '',
  'Poderia me informar o valor e as formas de pagamento?'
].join('\n');

/* ---------------------------------------------------------
   2) ELEMENTOS DA PÁGINA
   --------------------------------------------------------- */

const vitrine = document.getElementById('vitrine');
const statusCarregando = document.getElementById('status-carregando');
const statusErro = document.getElementById('status-erro');
const statusVazio = document.getElementById('status-vazio');
const statusConfig = document.getElementById('status-config');
const linkErroWhatsApp = document.getElementById('erro-whatsapp');

/* ---------------------------------------------------------
   3) LEITURA E PARSER DO CSV
   --------------------------------------------------------- */

/**
 * Converte o texto bruto do CSV em uma matriz de linhas/colunas.
 * Respeita campos entre aspas, que podem conter vírgulas e quebras
 * de linha — o Google Sheets usa aspas sempre que o conteúdo tem
 * vírgula (nomes de peça, URLs com parâmetros, etc.).
 */
function parsearCSV(texto) {
  const linhas = [];
  let campos = [];
  let campoAtual = '';
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const caractere = texto[i];

    if (dentroDeAspas) {
      if (caractere === '"') {
        // Duas aspas seguidas representam uma aspa literal dentro do campo
        if (texto[i + 1] === '"') {
          campoAtual += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campoAtual += caractere;
      }
      continue;
    }

    if (caractere === '"') {
      dentroDeAspas = true;
    } else if (caractere === ',') {
      campos.push(campoAtual);
      campoAtual = '';
    } else if (caractere === '\n' || caractere === '\r') {
      // Trata \r\n como uma única quebra
      if (caractere === '\r' && texto[i + 1] === '\n') i++;
      campos.push(campoAtual);
      linhas.push(campos);
      campos = [];
      campoAtual = '';
    } else {
      campoAtual += caractere;
    }
  }

  // Última linha, quando o arquivo não termina em quebra de linha
  if (campoAtual !== '' || campos.length > 0) {
    campos.push(campoAtual);
    linhas.push(campos);
  }

  return linhas;
}

/**
 * Transforma a matriz do CSV em um array de objetos, usando a
 * primeira linha como nome das propriedades.
 */
function converterEmObjetos(linhas) {
  if (linhas.length < 2) return [];

  const cabecalho = linhas[0].map(function (coluna) {
    return coluna.trim().toLowerCase();
  });

  return linhas
    .slice(1)
    .filter(function (linha) {
      // Ignora linhas totalmente vazias
      return linha.some(function (valor) { return valor.trim() !== ''; });
    })
    .map(function (linha) {
      const produto = {};
      cabecalho.forEach(function (coluna, indice) {
        produto[coluna] = (linha[indice] || '').trim();
      });
      return produto;
    });
}

/**
 * Busca o CSV publicado e devolve o array de produtos.
 */
async function buscarProdutos() {
  const resposta = await fetch(URL_PLANILHA_CSV);

  if (!resposta.ok) {
    throw new Error('Falha ao buscar a planilha: HTTP ' + resposta.status);
  }

  const texto = await resposta.text();
  return converterEmObjetos(parsearCSV(texto));
}

/* ---------------------------------------------------------
   4) FORMATAÇÃO DOS DADOS
   --------------------------------------------------------- */

/**
 * Links do Google Drive apontam para a página de visualização e não
 * carregam dentro de uma tag <img>. Converte para o endpoint de
 * miniatura, que serve o arquivo diretamente.
 */
function normalizarImagem(url) {
  const correspondencia = String(url || '')
    .match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?[^ ]*id=)([\w-]{20,})/);

  return correspondencia
    ? 'https://drive.google.com/thumbnail?id=' + correspondencia[1] + '&sz=w1000'
    : url;
}

/**
 * O WhatsApp só consegue gerar a prévia da foto a partir de um endereço
 * completo. Se a planilha trouxer um caminho relativo, resolve contra a
 * página atual.
 */
function urlAbsoluta(url) {
  try {
    return new URL(url, window.location.href).href;
  } catch (erro) {
    return '';
  }
}

/**
 * Preenche o MENSAGEM_WHATSAPP com os dados da peça.
 * Linhas cujo campo veio vazio da planilha são descartadas, para a mensagem
 * nunca chegar com "Categoria:" sem nada depois.
 */
function montarMensagem(produto) {
  const valores = {
    '{nome}': produto.nome_produto || '',
    '{categoria}': produto.categoria || '',
    '{codigo}': produto.id || '',
    '{foto}': produto.link_imagem ? urlAbsoluta(normalizarImagem(produto.link_imagem)) : ''
  };

  return MENSAGEM_WHATSAPP
    .split('\n')
    .map(function (linha) {
      let vazia = false;

      const preenchida = linha.replace(/\{\w+\}/g, function (campo) {
        const valor = valores[campo] || '';
        if (!valor) vazia = true;
        return valor;
      });

      // null marca a linha para remoção; '' seria uma linha em branco legítima
      return vazia ? null : preenchida;
    })
    .filter(function (linha) { return linha !== null; })
    // Sem a linha removida podem sobrar duas linhas em branco seguidas
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Monta o link da API do WhatsApp com a mensagem já escrita.
 */
function montarLinkWhatsApp(produto) {
  return 'https://wa.me/' + NUMERO_WHATSAPP + '?text=' + encodeURIComponent(montarMensagem(produto));
}

/* ---------------------------------------------------------
   5) RENDERIZAÇÃO DOS CARDS
   --------------------------------------------------------- */

const ICONE_WHATSAPP =
  'M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 ' +
  '1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.86 9.86 0 0 0 12.04 2zm0 18.15h-.01a8.2 ' +
  '8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.22 8.22 0 0 1-1.26-4.39c0-4.54 3.7-8.24 8.25-8.24 ' +
  '2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.24-8.26 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.42-.14 0-.31-.02-.48-.02-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.2.88 2.37 1 2.53.12.17 1.74 2.65 4.21 3.72.59.25 1.05.4 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28z';

function criarIconeWhatsApp() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '17');
  svg.setAttribute('height', '17');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', ICONE_WHATSAPP);
  svg.appendChild(path);

  return svg;
}

/**
 * Cria o card de um produto.
 * Os textos vindos da planilha são inseridos via textContent,
 * nunca via innerHTML, para que conteúdo da planilha não vire HTML.
 */
function criarCard(produto) {
  const card = document.createElement('article');
  card.className = 'card';

  // --- Imagem ---
  const media = document.createElement('div');
  media.className = 'card-media';

  const imagem = document.createElement('img');
  imagem.className = 'card-image';
  imagem.src = normalizarImagem(produto.link_imagem);
  imagem.alt = produto.nome_produto || 'Peça Lumière Fashion';
  imagem.loading = 'lazy';
  // Link quebrado na planilha: remove a imagem e deixa o fundo creme do
  // .card-media no lugar, em vez do ícone de imagem quebrada do navegador
  imagem.addEventListener('error', function () {
    imagem.remove();
  });
  media.appendChild(imagem);

  // --- Conteúdo ---
  const corpo = document.createElement('div');
  corpo.className = 'card-body';

  if (produto.categoria) {
    const categoria = document.createElement('p');
    categoria.className = 'card-categoria';
    categoria.textContent = produto.categoria;
    corpo.appendChild(categoria);
  }

  const nome = document.createElement('h2');
  nome.className = 'card-nome';
  nome.textContent = produto.nome_produto;
  corpo.appendChild(nome);

  // --- Botão de compra ---
  const botao = document.createElement('a');
  botao.className = 'card-btn';
  botao.href = montarLinkWhatsApp(produto);
  botao.target = '_blank';
  botao.rel = 'noopener noreferrer';
  botao.appendChild(criarIconeWhatsApp());
  // Como o card não mostra preço, o rótulo deixa explícito o motivo do toque
  botao.appendChild(document.createTextNode('Consultar peça'));
  corpo.appendChild(botao);

  card.appendChild(media);
  card.appendChild(corpo);

  return card;
}

/**
 * Injeta todos os cards na vitrine de uma só vez.
 */
function renderizarVitrine(produtos) {
  const fragmento = document.createDocumentFragment();

  produtos.forEach(function (produto) {
    if (produto.nome_produto) {
      fragmento.appendChild(criarCard(produto));
    }
  });

  vitrine.replaceChildren(fragmento);
}

/* ---------------------------------------------------------
   6) CONTROLE DE ESTADOS E INICIALIZAÇÃO
   --------------------------------------------------------- */

function mostrarStatus(elementoVisivel) {
  [statusCarregando, statusErro, statusVazio, statusConfig].forEach(function (elemento) {
    elemento.hidden = elemento !== elementoVisivel;
  });
}

async function iniciar() {
  // Sem link da planilha não há o que buscar: é falta de configuração,
  // não falha de rede — por isso a mensagem é outra
  if (!URL_PLANILHA_CSV) {
    mostrarStatus(statusConfig);
    console.warn('Cole o link do CSV na constante URL_PLANILHA_CSV, no topo de script.js.');
    return;
  }

  // Saída pelo WhatsApp caso o catálogo não carregue
  linkErroWhatsApp.href = 'https://wa.me/' + NUMERO_WHATSAPP;

  try {
    const produtos = await buscarProdutos();

    if (produtos.length === 0) {
      mostrarStatus(statusVazio);
      return;
    }

    renderizarVitrine(produtos);
    mostrarStatus(null);
  } catch (erro) {
    console.error(erro);
    mostrarStatus(statusErro);
  }
}

iniciar();
