# Catálogo Lumière Fashion

Página de catálogo estática, hospedada no GitHub Pages. As peças vêm de uma
planilha do Google Sheets — para atualizar o catálogo basta editar a planilha,
sem mexer no código.

---

## Estado atual

A página já está ligada à planilha do Google Sheets — é de lá que vêm as peças,
e é só editar a planilha para mudar o catálogo.

O arquivo de peças de exemplo foi removido do projeto: as peças agora vivem na
planilha. Para começar uma planilha do zero, use `modelo-planilha.csv`.

---

## Instalação (feito uma única vez)

### 1. Criar a planilha

Crie uma planilha no Google Sheets com estas colunas na primeira linha:

| id | nome_produto | categoria | link_imagem | link_imagem_2 | link_imagem_3 |
|----|--------------|-----------|-------------|---------------|---------------|
| 1  | Vestido Longo Seda | Vestidos | https://.../frente.jpg | https://.../costas.jpg | https://.../detalhe.jpg |
| 2  | Camisa de Linho | Camisas | https://.../foto.jpg | | |

O arquivo `modelo-planilha.csv` deste projeto pode ser importado direto no
Google Sheets como ponto de partida (Arquivo → Importar).

Observações:

- **Não existe coluna de preço**, porque o valor não aparece no site — a ideia é
  que a cliente chame no WhatsApp para saber quanto custa.
- **Colunas a mais são ignoradas.** O site procura as colunas pelo nome do
  cabeçalho, então a ordem não importa e você pode acrescentar preço, estoque,
  tamanho, fornecedor e o que mais precisar para seu controle: nada disso vai
  para o site nem quebra a página.
- **id** é o código da peça e aparece na mensagem do WhatsApp — é por ele que
  você identifica o produto ao responder a cliente.
- **categoria** aparece como o rótulo dourado acima do nome da peça. Se ficar
  em branco, o rótulo simplesmente não é exibido.
- **As fotos da peça** vão em `link_imagem`, `link_imagem_2`, `link_imagem_3`… —
  uma coluna por foto, quantas a loja quiser. Com duas ou mais, o card vira um
  carrossel; com uma só, fica a foto simples de sempre. Consulte a seção
  "Carrossel de fotos" mais abaixo.
- **link_imagem** precisa ser o link **direto do arquivo**, não o da página onde
  a foto está hospedada. Um jeito de conferir: colado no navegador, ele tem que
  abrir só a imagem, e normalmente termina em `.jpg` ou `.png`.
  - Certo: `https://i.postimg.cc/6ynGgqMW/foto.png`
  - Errado: `https://postimg.cc/6ynGgqMW` (essa é a página do site, não a foto)
  - Links do Google Drive são convertidos automaticamente; se usar o Drive,
    deixe o arquivo como "qualquer pessoa com o link pode ver".

### 2. Publicar a planilha em .csv

Na planilha: **Arquivo → Compartilhar → Publicar na web**

- Selecione a aba do catálogo
- Formato: **Valores separados por vírgula (.csv)**
- Clique em **Publicar** e copie o link gerado

O link tem esta cara:

```
https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv
```

> Publicar na web é diferente de compartilhar. Sem esse passo a página não
> consegue ler os dados.

### 3. Configurar o site

Abra `script.js` e preencha as duas constantes no topo do arquivo:

```js
const URL_PLANILHA_CSV = 'cole aqui o link do passo 2';
const NUMERO_WHATSAPP = '5534998371534';  // 55 + DDD + número, só dígitos
```

Se `URL_PLANILHA_CSV` ficar vazia, a página mostra o aviso "Catálogo ainda não
conectado à planilha" — ele some sozinho assim que o link for colado.

### 4. Publicar no GitHub Pages

Suba a pasta inteira para o repositório e ative o GitHub Pages nas
configurações. Como a página se chama `index.html`, ela abre no endereço raiz
do site.

---

## Uso no dia a dia

Para adicionar, remover ou trocar uma peça, **edite apenas a planilha**. O site
lê os dados a cada acesso — não é preciso republicar nada.

Uma linha sem `nome_produto` é ignorada, então dá para deixar rascunhos na
planilha sem que apareçam no site.

### Tirar uma peça do ar sem perder o cadastro

A coluna **`publicado`** controla o que aparece. Escreva **NÃO** para a peça
sumir do catálogo e **SIM** (ou deixe em branco) para ela voltar. O cadastro e
as fotos continuam guardados — é o caminho para peça esgotada que pode retornar.

| Valor na célula | O que acontece |
|---|---|
| `SIM`, `sim`, ou **célula vazia** | A peça aparece |
| `NÃO`, `nao`, `N`, `0`, `Esgotado` | A peça some |
| Qualquer outro texto | A peça aparece |

Célula vazia mantém a peça no ar de propósito: assim uma planilha antiga, sem
essa coluna, nunca some do site por engano.

Se todas as peças de uma categoria estiverem com `NÃO`, a categoria também
desaparece do menu — a cliente não cai numa lista vazia.

### Excluir de vez

Basta apagar a linha da planilha. Dois lembretes:

- As fotos **continuam no Google Drive**, na pasta de respostas do formulário.
  Limpe de tempos em tempos para não acumular.
- A alteração pode levar **alguns minutos** para aparecer: o Google mantém uma
  cópia da planilha publicada por volta de 5 minutos.

---

## Carrossel de fotos

Cada peça pode ter várias fotos. Elas vão em **uma coluna por foto**, na ordem
em que devem aparecer:

```
link_imagem, link_imagem_2, link_imagem_3, link_imagem_4, ...
```

Não há limite de colunas: para uma quinta foto, crie `link_imagem_5` e assim
por diante. A primeira coluna é a **foto de capa**, a que aparece na vitrine.

O comportamento se ajusta sozinho:

| Fotos preenchidas | O que a cliente vê |
|---|---|
| 1 | A foto simples, sem pontinhos nem setas |
| 2 ou mais | Carrossel: arrasta com o dedo no celular, setas ao passar o mouse no computador, e pontinhos mostrando em qual foto está |
| Nenhuma | Um bloco creme discreto no lugar da foto |

Detalhes que evitam dor de cabeça no dia a dia:

- **Colunas vazias no meio não atrapalham.** Se a peça tem foto na 1 e na 3 mas
  não na 2, o carrossel mostra as duas fotos normalmente.
- **Foto com link quebrado some sozinha**, junto com o pontinho dela — o
  carrossel continua funcionando com as que sobraram. Se sobrar só uma, ele
  volta a ser foto simples.
- **Atalho:** dá para colar vários links numa mesma célula separados por `|`
  (barra vertical), em vez de usar uma coluna para cada.
- **Ordem das colunas na planilha não importa** — o site procura pelo nome do
  cabeçalho.

Uma dica de conteúdo: o carrossel rende mais com fotos da **mesma peça** em
ângulos diferentes (frente, costas, detalhe do tecido, peça no corpo) do que
com fotos de peças distintas.

---

## Visualizador em tela cheia

Tocar em **qualquer ponto do card** — foto, nome ou categoria — abre a foto
grande, ocupando a tela inteira. É o principal recurso para a cliente avaliar
caimento e tecido: no celular o card tem pouco mais de 160px de largura, o que
não basta para decidir uma compra.

As únicas partes do card que fazem outra coisa são o botão **Consultar peça**,
que vai para o WhatsApp, e os pontinhos e setas, que passam as fotos ali mesmo.

**No celular:**

| Gesto | O que faz |
|---|---|
| Tocar no card | Abre o visualizador, já na foto que estava à mostra |
| Arrastar para o lado | Passa para a próxima foto da peça |
| Dois dedos (pinça) | Amplia até 4× |
| Tocar duas vezes | Amplia direto no ponto tocado; tocar de novo volta |
| Arrastar com a foto ampliada | Passeia pela foto |
| Tocar no fundo escuro ou no × | Fecha |

**No computador:** setas nas laterais, clique duplo ou roda do mouse para
ampliar, arrastar para passear, e as teclas ← → e `Esc`.

O botão **Consultar peça** aparece também dentro do visualizador — é ali,
olhando a peça de perto, que costuma nascer a vontade de perguntar o preço.

---

## Menu de categorias

O menu é montado sozinho a partir da coluna `categoria` da planilha. **Só
aparecem categorias que têm ao menos uma peça** — nenhuma categoria vazia é
exibida, e escrever uma categoria nova na planilha já cria o botão.

A ordem dos botões é definida em `script.js`:

```js
const ORDEM_CATEGORIAS = [
  'Conjuntos',
  'Calças',
  'Vestidos',
  'Blusas',
  'Camisas',
  'Shorts'
];
```

Uma categoria escrita na planilha que não esteja nessa lista **não some**: ela
entra no fim do menu, em ordem alfabética. Assim nenhuma peça fica inacessível
por causa de um nome novo ou de um erro de digitação — mas vale conferir a
grafia, porque "Vestido" e "Vestidos" viram dois botões diferentes.

### Link direto para uma categoria

Ao tocar num botão, o endereço da página passa a terminar com o nome da
categoria — por exemplo `.../#vestidos`. Esse link pode ser mandado para a
cliente pelo WhatsApp: a página abre **já filtrada** naquela categoria.

Acentos e espaços viram texto simples: `Calças` → `#calcas`.

---

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Estrutura da página |
| `style.css` | Estilos (mesma paleta e fontes da landing page) |
| `script.js` | Lê a planilha e monta a vitrine — **as constantes ficam aqui** |
| `assets/` | Logo, arte de fundo e fontes (tudo local, sem CDN) |
| `modelo-planilha.csv` | Modelo vazio para importar no Google Sheets |

---

## A mensagem do WhatsApp

Ao tocar em **Consultar valor**, o WhatsApp abre com esta mensagem já escrita —
a cliente só precisa apertar enviar:

```
Olá! Vim pelo catálogo da Lumière Fashion e tenho interesse nesta peça:

*Vestido Longo Marfim*
Categoria: Vestidos
Código: 1

Poderia me informar o valor e as formas de pagamento?
```

O **código** é o que identifica a peça: basta procurá-lo na coluna `id` da
planilha para saber exatamente de qual produto a cliente está falando.

> **Sobre enviar a foto:** não é possível anexar a imagem. Links `wa.me`
> transportam apenas texto — limitação do WhatsApp, não do site. Dá para incluir
> o *endereço* da foto no texto (o WhatsApp então mostra uma prévia com a
> miniatura), mas isso deixa um link longo no meio da mensagem, então está
> desativado. Para ligar, veja `{foto}` logo abaixo.

### Como mudar o texto

O texto fica na constante `MENSAGEM_WHATSAPP`, no topo do `script.js`. Cada item
da lista é uma linha da mensagem, e `''` é uma linha em branco:

```js
const MENSAGEM_WHATSAPP = [
  'Olá! Vim pelo catálogo da Lumière Fashion e tenho interesse nesta peça:',
  '',
  '*{nome}*',
  'Categoria: {categoria}',
  'Código: {codigo}',
  '',
  'Poderia me informar o valor e as formas de pagamento?'
].join('\n');
```

Campos disponíveis: `{nome}`, `{categoria}`, `{codigo}` e `{foto}`. Para
formatar, o WhatsApp aceita `*negrito*` e `_itálico_`.

O `{foto}` não está sendo usado. Para incluir o endereço da imagem na mensagem
e ganhar a prévia com a miniatura, acrescente `'{foto}',` como uma linha da
lista. Vale saber que fotos hospedadas no Google Drive costumam não gerar
prévia — links diretos para o arquivo `.jpg` funcionam melhor.

Se uma peça estiver sem categoria ou sem código na planilha, a linha
correspondente é removida automaticamente — a mensagem nunca chega com
"Categoria:" vazio.

---

## Comportamento

- **Layout:** 2 colunas no celular, 3 no tablet, 4 no desktop.
- **Botão "Consultar valor":** abre o WhatsApp da loja com a mensagem já
  escrita, incluindo nome, categoria e código da peça (ver acima).
- **Fotos:** uma foto por peça vira imagem simples; duas ou mais viram carrossel
  (arraste no celular, setas no computador).
- **Foto quebrada:** sai do carrossel sem deixar buraco; se a peça ficar sem
  nenhuma foto válida, o card mostra um bloco creme discreto, sem ícone de erro.
- **Planilha fora do ar:** a página oferece o link do WhatsApp para a cliente
  não ficar sem contato.
