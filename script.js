/* =========================================================
   LUMIÈRE FASHION — Catálogo
   JavaScript Vanilla. Lê uma planilha do Google Sheets publicada
   em .csv e monta a vitrine dinamicamente.
   ========================================================= */

/* ---------------------------------------------------------
   1) CONFIGURAÇÃO — edite apenas estas duas constantes
   --------------------------------------------------------- */

/* Link do Google Sheets publicado na web em formato CSV — é daqui que saem
   as peças do catálogo. Para trocar de planilha:
   Arquivo → Compartilhar → Publicar na web →
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

/* Ordem em que as categorias aparecem no menu.
   Só entram no menu as que realmente têm peças na planilha — uma categoria
   listada aqui e sem produtos simplesmente não aparece.
   Categorias que existam na planilha mas não estejam nesta lista entram no
   final do menu, em ordem alfabética, para nenhuma peça ficar inacessível. */
const ORDEM_CATEGORIAS = [
  'Conjuntos',
  'Calças',
  'Vestidos',
  'Blusas',
  'Camisas',
  'Shorts'
];

/* Rótulo do botão que mostra o catálogo inteiro */
const ROTULO_TODAS = 'Todas';

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
const statusSemResultado = document.getElementById('status-sem-resultado');
const linkErroWhatsApp = document.getElementById('erro-whatsapp');
const filtros = document.getElementById('filtros');

const lightbox = document.getElementById('lightbox');
const lightboxPalco = document.getElementById('lightbox-palco');
const lightboxFoto = document.getElementById('lightbox-foto');
const lightboxPontos = document.getElementById('lightbox-pontos');
const lightboxLegenda = document.getElementById('lightbox-legenda');
const lightboxWhatsApp = document.getElementById('lightbox-whatsapp');
const lightboxDica = document.getElementById('lightbox-dica');
const lightboxFechar = document.getElementById('lightbox-fechar');
const lightboxAnterior = document.getElementById('lightbox-anterior');
const lightboxProxima = document.getElementById('lightbox-proxima');

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
 * Traduz o título de uma coluna para o nome que o site usa internamente.
 *
 * Existe porque a planilha pode ser preenchida de duas formas:
 *  - na mão, com as colunas já nomeadas: id, nome_produto, categoria, link_imagem
 *  - pelo Google Forms, que nomeia as colunas com o texto da pergunta:
 *    "Código da peça", "Nome da peça", "Categoria da peça", "Fotos da peça"
 *
 * A comparação ignora acentos e maiúsculas e busca por palavra-chave, para
 * pequenas diferenças de redação no formulário não quebrarem o catálogo.
 */
function padronizarCabecalho(titulo, jaUsados) {
  const limpo = String(titulo)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  // Colunas já nomeadas do jeito que o site espera passam direto
  if (/^(id|nome_produto|categoria|link_imagem(_\d+)?)$/.test(limpo)) return limpo;

  if (limpo.indexOf('codigo') !== -1) return 'id';
  if (limpo.indexOf('categoria') !== -1) return 'categoria';
  if (limpo.indexOf('nome') !== -1) return 'nome_produto';

  // "publicado", "Publicar no site?", "Ativo", "Visível no site"
  if (limpo.indexOf('publicad') !== -1 || limpo.indexOf('publicar') !== -1 ||
      limpo.indexOf('ativo') !== -1 || limpo.indexOf('visivel') !== -1) {
    return 'publicado';
  }

  if (limpo.indexOf('foto') !== -1 || limpo.indexOf('imagem') !== -1) {
    // Pode haver mais de uma coluna de foto: a primeira vira link_imagem,
    // as seguintes viram link_imagem_2, link_imagem_3...
    const quantas = jaUsados.filter(function (nome) {
      return /^link_imagem(_\d+)?$/.test(nome);
    }).length;
    return quantas === 0 ? 'link_imagem' : 'link_imagem_' + (quantas + 1);
  }

  // Colunas que o site não usa (carimbo de data/hora, e-mail, observações...)
  return limpo;
}

/**
 * Diz se um valor de célula parece ser o endereço de uma foto.
 * Cobre os links do Google Drive (que não terminam em .jpg) e endereços
 * comuns terminados em extensão de imagem.
 */
function pareceEnderecoDeFoto(valor) {
  const texto = String(valor || '').trim();
  if (!/^https?:\/\//i.test(texto)) return false;

  return /drive\.google\.com|googleusercontent\.com/i.test(texto) ||
         /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(texto);
}

/**
 * Rede de segurança para quando a coluna das fotos vem sem título.
 *
 * Acontece ao vincular um formulário novo a uma planilha que já existia: o
 * Sheets nomeia a coluna como "Coluna 5" e o cabeçalho deixa de dizer que
 * ali há fotos. Em vez de exigir que alguém renomeie a célula, o site olha o
 * CONTEÚDO das colunas ainda não identificadas e adota como foto aquela cujos
 * valores são endereços de imagem.
 */
function detectarColunasDeFotoPeloConteudo(cabecalho, linhas) {
  const jaTemFoto = cabecalho.some(function (nome) {
    return /^link_imagem(_\d+)?$/.test(nome);
  });
  if (jaTemFoto) return;

  const conhecidas = ['id', 'nome_produto', 'categoria', 'publicado'];
  let encontradas = 0;

  cabecalho.forEach(function (nome, coluna) {
    if (conhecidas.indexOf(nome) !== -1) return;

    // Basta uma célula com cara de foto para identificar a coluna
    const temFoto = linhas.some(function (linha) {
      return pareceEnderecoDeFoto(linha[coluna]);
    });

    if (temFoto) {
      encontradas += 1;
      cabecalho[coluna] = encontradas === 1 ? 'link_imagem' : 'link_imagem_' + encontradas;
    }
  });
}

/**
 * Transforma a matriz do CSV em um array de objetos, usando a
 * primeira linha como nome das propriedades.
 */
function converterEmObjetos(linhas) {
  if (linhas.length < 2) return [];

  const cabecalho = [];
  linhas[0].forEach(function (coluna) {
    cabecalho.push(padronizarCabecalho(coluna, cabecalho));
  });

  // Coluna de fotos sem título: identifica pelo conteúdo
  detectarColunasDeFotoPeloConteudo(cabecalho, linhas.slice(1));

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
  /* no-store: o navegador não guarda cópia da planilha. Sem isso, uma peça
     apagada (ou vendida) poderia continuar aparecendo para quem já tinha
     visitado o catálogo. O arquivo tem poucos KB, então não pesa.
     O Google ainda mantém um cache próprio de alguns minutos, que não dá
     para contornar daqui. */
  const resposta = await fetch(URL_PLANILHA_CSV, { cache: 'no-store' });

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
 * Diz se a peça deve aparecer no catálogo, conforme a coluna "publicado".
 *
 * A peça só some quando o NÃO está escrito de forma explícita. Célula vazia,
 * coluna inexistente ou qualquer outro texto mantêm a peça no ar — assim uma
 * planilha antiga, ou uma resposta de formulário sem esse campo, nunca some
 * do site por engano.
 *
 * Aceita as formas que costumam aparecer numa planilha: não, nao, n, no,
 * false, 0 e também "esgotado".
 */
function estaPublicado(produto) {
  const valor = String(produto.publicado || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  return !/^(nao|n|no|false|0|esgotado|desativado|inativo)$/.test(valor);
}

/**
 * Reúne todas as fotos da peça, na ordem das colunas da planilha:
 * link_imagem, link_imagem_2, link_imagem_3... (quantas a loja quiser).
 *
 * Também aceita mais de um endereço dentro da mesma célula. É o caso do
 * Google Forms: enviando 4 fotos numa pergunta de upload, ele grava os 4
 * links numa célula só, separados por vírgula. Vale ainda quebra de linha
 * e barra vertical, para quem colar vários links de uma vez.
 * Colunas vazias são descartadas, então deixar buracos no meio não quebra nada.
 */
function extrairImagens(produto) {
  return Object.keys(produto)
    .filter(function (coluna) {
      return /^link_imagem(_\d+)?$/.test(coluna);
    })
    .sort(function (a, b) {
      // "link_imagem" conta como 1; "link_imagem_2" como 2, e assim por diante
      const numero = function (coluna) {
        const partes = coluna.split('_');
        return coluna === 'link_imagem' ? 1 : Number(partes[partes.length - 1]);
      };
      return numero(a) - numero(b);
    })
    .reduce(function (lista, coluna) {
      return lista.concat(String(produto[coluna] || '').split(/[\n|,]+/));
    }, [])
    .map(function (url) { return url.trim(); })
    .filter(Boolean)
    .map(normalizarImagem);
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

const SETA_ESQUERDA = 'M15 4 L7 12 L15 20';
const SETA_DIREITA = 'M9 4 L17 12 L9 20';

function criarIconeSeta(desenho) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', desenho);
  svg.appendChild(path);

  return svg;
}

/**
 * Monta a área de foto do card.
 *
 * Com uma foto só, devolve a imagem simples de sempre. Com duas ou mais,
 * devolve um carrossel: no celular a navegação é por arraste (scroll-snap
 * nativo, que é mais fluido do que qualquer animação em JS) e no desktop
 * aparecem setas ao passar o mouse. Os pontos indicam a posição e também
 * navegam.
 */
function criarMedia(imagens, produto) {
  const media = document.createElement('div');
  media.className = 'card-media';

  const descricao = produto.nome_produto || 'Peça Lumière Fashion';

  // Sem foto na planilha: fica só o fundo creme do .card-media
  if (imagens.length === 0) return media;

  /* Abre o visualizador em tela cheia na foto que está à mostra.
     Fica guardado no próprio elemento para que o card inteiro — e não só a
     foto — possa disparar a abertura. */
  media.abrirVisualizador = function () {
    const trilhoAtual = media.querySelector('.carrossel-trilho');
    const largura = trilhoAtual ? trilhoAtual.clientWidth : 0;
    const visivel = largura ? Math.round(trilhoAtual.scrollLeft / largura) : 0;

    // Fotos quebradas já foram removidas: manda para o visualizador
    // apenas as que realmente carregaram
    const validas = Array.prototype.map.call(
      media.querySelectorAll('.card-image'),
      function (img) { return img.src; }
    );
    if (validas.length === 0) return;

    abrirVisualizador(produto, validas, Math.min(visivel, validas.length - 1), media);
  };

  // Alvo do teclado: a foto é o elemento que representa "ver as fotos"
  media.tabIndex = 0;
  media.setAttribute('role', 'button');
  media.setAttribute('aria-label', 'Ampliar fotos de ' + descricao);
  media.addEventListener('keydown', function (evento) {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      media.abrirVisualizador();
    }
  });

  const trilho = document.createElement('div');
  trilho.className = 'carrossel-trilho';

  const slides = imagens.map(function (url, indice) {
    const imagem = document.createElement('img');
    imagem.className = 'card-image';
    imagem.src = url;
    imagem.alt = imagens.length > 1
      ? descricao + ' — foto ' + (indice + 1) + ' de ' + imagens.length
      : descricao;
    /* Todas em lazy, inclusive a capa: o navegador já baixa na hora as que
       estão na tela, e adia o resto. Com 14 peças no 4G, marcar as capas
       como "eager" dispararia 14 downloads simultâneos logo na abertura. */
    imagem.loading = 'lazy';
    imagem.decoding = 'async';
    /* Não envia o endereço do site ao pedir a foto. O Google Drive usa esse
       campo para identificar uso da imagem por outro site e responde 429
       (excesso de requisições) — comprovado em teste: com o campo, 429;
       sem ele, 200. */
    imagem.referrerPolicy = 'no-referrer';
    trilho.appendChild(imagem);
    return imagem;
  });

  media.appendChild(trilho);

  if (imagens.length === 1) {
    // Link quebrado: remove a imagem e deixa o fundo creme no lugar,
    // em vez do ícone de imagem quebrada do navegador
    slides[0].addEventListener('error', function () {
      slides[0].remove();
    });
    return media;
  }

  media.classList.add('card-media--carrossel');

  // --- Pontos ---
  const pontos = document.createElement('div');
  pontos.className = 'carrossel-pontos';

  const botoesPonto = imagens.map(function (url, indice) {
    const ponto = document.createElement('button');
    ponto.type = 'button';
    ponto.className = 'carrossel-ponto';
    ponto.setAttribute('aria-label', 'Ver foto ' + (indice + 1));
    ponto.addEventListener('click', function (evento) {
      // Navegar entre as fotos do card não deve abrir o visualizador
      evento.stopPropagation();
      trilho.scrollTo({ left: trilho.clientWidth * indice, behavior: 'smooth' });
    });
    pontos.appendChild(ponto);
    return ponto;
  });

  media.appendChild(pontos);

  // --- Setas ---
  function criarSeta(classe, rotulo, desenho, passo) {
    const seta = document.createElement('button');
    seta.type = 'button';
    seta.className = 'carrossel-seta ' + classe;
    seta.setAttribute('aria-label', rotulo);
    seta.appendChild(criarIconeSeta(desenho));
    seta.addEventListener('click', function (evento) {
      // Navegar entre as fotos do card não deve abrir o visualizador
      evento.stopPropagation();
      trilho.scrollBy({ left: trilho.clientWidth * passo, behavior: 'smooth' });
    });
    media.appendChild(seta);
    return seta;
  }

  const setaAnterior = criarSeta('carrossel-seta--anterior', 'Foto anterior', SETA_ESQUERDA, -1);
  const setaProxima = criarSeta('carrossel-seta--proxima', 'Próxima foto', SETA_DIREITA, 1);

  // --- Sincronização: arrastar a foto acende o ponto correspondente ---
  function marcarAtual() {
    const restantes = trilho.children.length;
    if (restantes === 0) return;

    // Antes de o card entrar na página a largura é 0, e a divisão daria NaN:
    // nesse momento a foto exibida é a primeira
    const largura = trilho.clientWidth;
    const atual = largura ? Math.round(trilho.scrollLeft / largura) : 0;

    Array.prototype.forEach.call(pontos.children, function (ponto, indice) {
      const ativo = indice === atual;
      ponto.classList.toggle('carrossel-ponto--ativo', ativo);
      ponto.setAttribute('aria-current', ativo ? 'true' : 'false');
    });

    // Nas pontas, a seta correspondente não tem para onde levar
    setaAnterior.disabled = atual <= 0;
    setaProxima.disabled = atual >= restantes - 1;
  }

  let aguardandoQuadro = false;
  trilho.addEventListener('scroll', function () {
    // O scroll dispara dezenas de vezes por arraste: um quadro por vez basta
    if (aguardandoQuadro) return;
    aguardandoQuadro = true;
    window.requestAnimationFrame(function () {
      aguardandoQuadro = false;
      marcarAtual();
    });
  });

  // --- Foto quebrada: some o slide e o ponto dele ---
  slides.forEach(function (imagem, indice) {
    imagem.addEventListener('error', function () {
      imagem.remove();
      botoesPonto[indice].remove();

      const restantes = trilho.children.length;

      if (restantes === 0) {
        // Todas falharam: volta ao card sem foto
        media.classList.remove('card-media--carrossel');
        pontos.remove();
        setaAnterior.remove();
        setaProxima.remove();
        return;
      }

      if (restantes === 1) {
        // Sobrou uma: não é mais carrossel
        media.classList.remove('card-media--carrossel');
        pontos.remove();
        setaAnterior.remove();
        setaProxima.remove();
        return;
      }

      marcarAtual();
    });
  });

  marcarAtual();

  return media;
}

/**
 * Cria o card de um produto.
 * Os textos vindos da planilha são inseridos via textContent,
 * nunca via innerHTML, para que conteúdo da planilha não vire HTML.
 */
function criarCard(produto) {
  const card = document.createElement('article');
  card.className = 'card';

  // --- Fotos ---
  const media = criarMedia(extrairImagens(produto), produto);

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
  // O botão leva ao WhatsApp; não pode disparar o visualizador junto
  botao.addEventListener('click', function (evento) {
    evento.stopPropagation();
  });
  corpo.appendChild(botao);

  card.appendChild(media);
  card.appendChild(corpo);

  /* O card inteiro abre as fotos — no celular, um alvo de toque de ~165px de
     largura é muito mais fácil de acertar do que só a área da imagem.
     Pontos, setas e o botão do WhatsApp interrompem a propagação e seguem
     fazendo o que já faziam. */
  if (media.abrirVisualizador) {
    card.classList.add('card--clicavel');
    card.addEventListener('click', function () {
      media.abrirVisualizador();
    });
  }

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
   6) VISUALIZADOR EM TELA CHEIA (com zoom)
   --------------------------------------------------------- */

const ZOOM_MAXIMO = 4;
const ZOOM_DUPLO_TOQUE = 2.5;
/* Arraste horizontal, em pixels, para trocar de foto */
const ARRASTE_PARA_TROCAR = 60;

const visualizador = {
  fotos: [],
  indice: 0,
  produto: null,
  escala: 1,
  x: 0,
  y: 0,
  elementoQueAbriu: null
};

/* Estado dos gestos em andamento */
const gesto = {
  arrastando: false,
  xInicial: 0,
  yInicial: 0,
  baseX: 0,
  baseY: 0,
  distanciaInicial: 0,
  escalaInicial: 1,
  ultimoToque: 0
};

function aplicarTransformacao() {
  lightboxFoto.style.transform =
    'translate(' + visualizador.x + 'px, ' + visualizador.y + 'px) scale(' + visualizador.escala + ')';
  lightboxPalco.classList.toggle('lightbox-palco--ampliado', visualizador.escala > 1);
}

/**
 * Impede que a foto ampliada seja arrastada para fora da tela, deixando
 * área vazia à mostra.
 */
function limitarDeslocamento() {
  const limiteX = Math.max(0, (lightboxFoto.clientWidth * visualizador.escala - lightboxPalco.clientWidth) / 2);
  const limiteY = Math.max(0, (lightboxFoto.clientHeight * visualizador.escala - lightboxPalco.clientHeight) / 2);

  visualizador.x = Math.min(limiteX, Math.max(-limiteX, visualizador.x));
  visualizador.y = Math.min(limiteY, Math.max(-limiteY, visualizador.y));
}

function definirZoom(novaEscala, ancoraX, ancoraY) {
  const anterior = visualizador.escala;
  visualizador.escala = Math.min(ZOOM_MAXIMO, Math.max(1, novaEscala));

  if (visualizador.escala === 1) {
    visualizador.x = 0;
    visualizador.y = 0;
  } else if (typeof ancoraX === 'number') {
    // Mantém sob o dedo o ponto da foto que estava lá antes de ampliar
    const fator = visualizador.escala / anterior;
    const centro = lightboxPalco.getBoundingClientRect();
    const alvoX = ancoraX - (centro.left + centro.width / 2);
    const alvoY = ancoraY - (centro.top + centro.height / 2);

    visualizador.x = alvoX - (alvoX - visualizador.x) * fator;
    visualizador.y = alvoY - (alvoY - visualizador.y) * fator;
  }

  limitarDeslocamento();
  aplicarTransformacao();
}

function reiniciarZoom() {
  visualizador.escala = 1;
  visualizador.x = 0;
  visualizador.y = 0;
  aplicarTransformacao();
}

function mostrarFoto(indice) {
  const total = visualizador.fotos.length;
  if (total === 0) return;

  visualizador.indice = Math.min(total - 1, Math.max(0, indice));
  lightboxFoto.src = visualizador.fotos[visualizador.indice];
  lightboxFoto.alt = (visualizador.produto ? visualizador.produto.nome_produto : 'Peça') +
    ' — foto ' + (visualizador.indice + 1) + ' de ' + total;

  reiniciarZoom();

  Array.prototype.forEach.call(lightboxPontos.children, function (ponto, i) {
    const ativo = i === visualizador.indice;
    ponto.classList.toggle('carrossel-ponto--ativo', ativo);
    ponto.setAttribute('aria-current', ativo ? 'true' : 'false');
  });

  const nome = visualizador.produto ? visualizador.produto.nome_produto : '';
  lightboxLegenda.textContent = total > 1
    ? nome + ' — ' + (visualizador.indice + 1) + ' de ' + total
    : nome;

  // Com uma foto só não há para onde navegar
  const navegavel = total > 1;
  lightboxAnterior.hidden = !navegavel;
  lightboxProxima.hidden = !navegavel;
  lightboxPontos.hidden = !navegavel;
  lightboxAnterior.disabled = visualizador.indice === 0;
  lightboxProxima.disabled = visualizador.indice === total - 1;
}

function irParaFoto(passo) {
  mostrarFoto(visualizador.indice + passo);
}

function abrirVisualizador(produto, fotos, indiceInicial, elementoQueAbriu) {
  if (!fotos || fotos.length === 0) return;

  visualizador.fotos = fotos;
  visualizador.produto = produto;
  visualizador.elementoQueAbriu = elementoQueAbriu || null;

  // Um ponto para cada foto
  const fragmento = document.createDocumentFragment();
  fotos.forEach(function (url, i) {
    const ponto = document.createElement('button');
    ponto.type = 'button';
    ponto.className = 'carrossel-ponto';
    ponto.setAttribute('aria-label', 'Ver foto ' + (i + 1));
    ponto.addEventListener('click', function () { mostrarFoto(i); });
    fragmento.appendChild(ponto);
  });
  lightboxPontos.replaceChildren(fragmento);

  lightboxWhatsApp.href = montarLinkWhatsApp(produto);

  // A dica precisa falar do gesto que a pessoa realmente tem à mão
  lightboxDica.textContent = window.matchMedia('(hover: hover)').matches
    ? 'Clique duas vezes ou use a roda do mouse para ampliar'
    : 'Toque duas vezes ou use dois dedos para ampliar';

  mostrarFoto(indiceInicial || 0);

  lightbox.hidden = false;
  // Trava a rolagem do catálogo atrás do visualizador
  document.documentElement.classList.add('sem-rolagem');
  document.body.classList.add('sem-rolagem');
  lightboxFechar.focus();
}

function fecharVisualizador() {
  lightbox.hidden = true;
  document.documentElement.classList.remove('sem-rolagem');
  document.body.classList.remove('sem-rolagem');
  reiniciarZoom();
  // Devolve o foco para a foto que a cliente tocou
  if (visualizador.elementoQueAbriu) visualizador.elementoQueAbriu.focus();
}

/* ----- Gestos no palco ----- */

function distanciaEntre(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

lightboxPalco.addEventListener('touchstart', function (evento) {
  if (evento.touches.length === 2) {
    // Pinça: guarda a distância inicial entre os dois dedos
    gesto.arrastando = false;
    gesto.distanciaInicial = distanciaEntre(evento.touches[0], evento.touches[1]);
    gesto.escalaInicial = visualizador.escala;
    return;
  }

  if (evento.touches.length !== 1) return;

  if (Date.now() - gesto.ultimoToque < 300) {
    // Duplo toque: amplia no ponto tocado, ou volta ao tamanho normal
    definirZoom(
      visualizador.escala > 1 ? 1 : ZOOM_DUPLO_TOQUE,
      evento.touches[0].clientX,
      evento.touches[0].clientY
    );
    gesto.ultimoToque = 0;
    return;
  }

  gesto.arrastando = true;
  gesto.xInicial = evento.touches[0].clientX;
  gesto.yInicial = evento.touches[0].clientY;
  gesto.baseX = visualizador.x;
  gesto.baseY = visualizador.y;
}, { passive: true });

lightboxPalco.addEventListener('touchmove', function (evento) {
  if (evento.touches.length === 2 && gesto.distanciaInicial) {
    const proporcao = distanciaEntre(evento.touches[0], evento.touches[1]) / gesto.distanciaInicial;
    const meioX = (evento.touches[0].clientX + evento.touches[1].clientX) / 2;
    const meioY = (evento.touches[0].clientY + evento.touches[1].clientY) / 2;
    definirZoom(gesto.escalaInicial * proporcao, meioX, meioY);
    evento.preventDefault();
    return;
  }

  if (!gesto.arrastando || evento.touches.length !== 1) return;

  const deslocX = evento.touches[0].clientX - gesto.xInicial;
  const deslocY = evento.touches[0].clientY - gesto.yInicial;

  if (visualizador.escala > 1) {
    // Ampliada: o arraste passeia pela foto
    visualizador.x = gesto.baseX + deslocX;
    visualizador.y = gesto.baseY + deslocY;
    limitarDeslocamento();
    aplicarTransformacao();
    evento.preventDefault();
  }
}, { passive: false });

lightboxPalco.addEventListener('touchend', function (evento) {
  gesto.distanciaInicial = 0;

  if (!gesto.arrastando) return;
  gesto.arrastando = false;

  if (evento.changedTouches.length !== 1) return;

  const deslocX = evento.changedTouches[0].clientX - gesto.xInicial;
  const deslocY = evento.changedTouches[0].clientY - gesto.yInicial;
  const andou = Math.hypot(deslocX, deslocY);

  /* A janela do duplo toque só é armada por um toque PARADO. Sem isso, dois
     arrastes rápidos seguidos cairiam dentro dos 300ms e seriam lidos como
     duplo toque — ou seja, passar fotos depressa ampliaria a foto. */
  gesto.ultimoToque = andou < 10 ? Date.now() : 0;

  // Sem zoom, o arraste horizontal troca de foto
  if (visualizador.escala === 1 &&
      Math.abs(deslocX) > ARRASTE_PARA_TROCAR &&
      Math.abs(deslocX) > Math.abs(deslocY)) {
    irParaFoto(deslocX < 0 ? 1 : -1);
  }
}, { passive: true });

/* Duplo clique e roda do mouse, para quem estiver no computador */
lightboxPalco.addEventListener('dblclick', function (evento) {
  definirZoom(visualizador.escala > 1 ? 1 : ZOOM_DUPLO_TOQUE, evento.clientX, evento.clientY);
});

lightboxPalco.addEventListener('wheel', function (evento) {
  evento.preventDefault();
  definirZoom(visualizador.escala * (evento.deltaY < 0 ? 1.15 : 0.87), evento.clientX, evento.clientY);
}, { passive: false });

/* Arrastar com o mouse quando a foto está ampliada */
lightboxPalco.addEventListener('mousedown', function (evento) {
  if (visualizador.escala === 1) return;
  evento.preventDefault();
  gesto.arrastando = true;
  gesto.xInicial = evento.clientX;
  gesto.yInicial = evento.clientY;
  gesto.baseX = visualizador.x;
  gesto.baseY = visualizador.y;
});

window.addEventListener('mousemove', function (evento) {
  if (!gesto.arrastando || visualizador.escala === 1) return;
  visualizador.x = gesto.baseX + (evento.clientX - gesto.xInicial);
  visualizador.y = gesto.baseY + (evento.clientY - gesto.yInicial);
  limitarDeslocamento();
  aplicarTransformacao();
});

window.addEventListener('mouseup', function () {
  gesto.arrastando = false;
});

/* ----- Botões e teclado ----- */

lightboxFechar.addEventListener('click', fecharVisualizador);
lightboxAnterior.addEventListener('click', function () { irParaFoto(-1); });
lightboxProxima.addEventListener('click', function () { irParaFoto(1); });

/* Tocar no fundo escuro fecha; tocar na foto, não */
lightbox.addEventListener('click', function (evento) {
  if (evento.target === lightbox || evento.target === lightboxPalco) fecharVisualizador();
});

document.addEventListener('keydown', function (evento) {
  if (lightbox.hidden) return;

  if (evento.key === 'Escape') fecharVisualizador();
  if (evento.key === 'ArrowLeft') irParaFoto(-1);
  if (evento.key === 'ArrowRight') irParaFoto(1);
});

/* ---------------------------------------------------------
   7) MENU DE CATEGORIAS
   --------------------------------------------------------- */

/* Guarda o catálogo inteiro em memória: filtrar é só re-renderizar a partir
   daqui, sem baixar a planilha de novo a cada toque no menu. */
let todosOsProdutos = [];

/**
 * Transforma "Calças" em "calcas" para uso no endereço da página.
 * Assim dá para mandar o link de uma categoria direto para a cliente
 * (ex.: .../index.html#vestidos).
 */
function gerarApelido(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // tira os acentos separados pelo normalize
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Lista as categorias que têm ao menos uma peça, na ordem de ORDEM_CATEGORIAS.
 * As que não estiverem na constante vão para o fim, em ordem alfabética.
 */
function levantarCategorias(produtos) {
  const existentes = [];

  produtos.forEach(function (produto) {
    const categoria = (produto.categoria || '').trim();
    if (categoria && existentes.indexOf(categoria) === -1) {
      existentes.push(categoria);
    }
  });

  const naOrdem = ORDEM_CATEGORIAS.filter(function (categoria) {
    return existentes.indexOf(categoria) !== -1;
  });

  const extras = existentes
    .filter(function (categoria) { return ORDEM_CATEGORIAS.indexOf(categoria) === -1; })
    .sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });

  return naOrdem.concat(extras);
}

/**
 * Aplica o filtro: re-renderiza a vitrine e marca o botão ativo.
 * categoria vazia ('') significa "Todas".
 */
function aplicarFiltro(categoria) {
  const selecionados = categoria
    ? todosOsProdutos.filter(function (produto) { return produto.categoria === categoria; })
    : todosOsProdutos;

  renderizarVitrine(selecionados);
  mostrarStatus(selecionados.length === 0 ? statusSemResultado : null);

  // Estado visual e de acessibilidade dos botões
  Array.prototype.forEach.call(filtros.children, function (botao) {
    const ativo = botao.dataset.categoria === categoria;
    botao.classList.toggle('filtro--ativo', ativo);
    botao.setAttribute('aria-pressed', ativo ? 'true' : 'false');
  });
}

/**
 * Monta os botões do menu e liga a navegação por endereço (#categoria),
 * para que o link de uma categoria possa ser compartilhado no WhatsApp.
 */
function montarMenu(produtos) {
  const categorias = levantarCategorias(produtos);

  // Com uma categoria só (ou nenhuma) o menu não ajuda em nada
  if (categorias.length < 2) return;

  const apelidos = {};
  const fragmento = document.createDocumentFragment();

  [''].concat(categorias).forEach(function (categoria) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'filtro';
    botao.dataset.categoria = categoria;
    botao.textContent = categoria || ROTULO_TODAS;
    botao.setAttribute('aria-pressed', 'false');

    if (categoria) apelidos[gerarApelido(categoria)] = categoria;

    botao.addEventListener('click', function () {
      // Guarda a escolha no endereço, sem recarregar nem rolar a página,
      // para o link da categoria poder ser mandado para a cliente
      const destino = categoria
        ? '#' + gerarApelido(categoria)
        : window.location.pathname + window.location.search;

      history.replaceState(null, '', destino);
      aplicarFiltro(categoria);
    });

    fragmento.appendChild(botao);
  });

  filtros.replaceChildren(fragmento);
  filtros.hidden = false;

  // Abriu a página já com #vestidos? Começa filtrado.
  const apelidoInicial = window.location.hash.replace('#', '');
  return apelidos[apelidoInicial] || '';
}

/* ---------------------------------------------------------
   8) CONTROLE DE ESTADOS E INICIALIZAÇÃO
   --------------------------------------------------------- */

function mostrarStatus(elementoVisivel) {
  [statusCarregando, statusErro, statusVazio, statusConfig, statusSemResultado]
    .forEach(function (elemento) {
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

    /* Só as linhas com nome viram peça — assim o menu não conta rascunhos.
       O filtro de "publicado" entra aqui, antes do menu, para que uma
       categoria cujas peças estejam todas escondidas também suma do menu. */
    todosOsProdutos = produtos.filter(function (produto) {
      return produto.nome_produto && estaPublicado(produto);
    });

    // Todas as peças escondidas: é diferente de planilha vazia
    if (todosOsProdutos.length === 0) {
      mostrarStatus(statusVazio);
      return;
    }

    const categoriaInicial = montarMenu(todosOsProdutos) || '';
    aplicarFiltro(categoriaInicial);
  } catch (erro) {
    console.error(erro);
    mostrarStatus(statusErro);
  }
}

iniciar();
