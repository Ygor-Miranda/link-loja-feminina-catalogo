# Catálogo Lumière Fashion

Página de catálogo estática, hospedada no GitHub Pages. As peças vêm de uma
planilha do Google Sheets — para atualizar o catálogo basta editar a planilha,
sem mexer no código.

---

## ⚠️ A página está em modo demonstração

Neste momento o catálogo carrega o arquivo `produtos-exemplo.csv`, com **8 peças
fictícias e fotos de banco de imagens** (Pexels, uso livre). Serve só para ver e
apresentar a página funcionando.

Ao concluir o passo 3 da instalação abaixo, as peças reais da planilha entram no
lugar e o arquivo de exemplo pode ser apagado.

---

## Instalação (feito uma única vez)

### 1. Criar a planilha

Crie uma planilha no Google Sheets com estas colunas na primeira linha:

| id | nome_produto | categoria | link_imagem |
|----|--------------|-----------|-------------|
| 1  | Vestido Longo Seda | Vestidos | https://.../foto.jpg |

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
- **link_imagem** precisa ser um link direto para a foto. Links do Google Drive
  são convertidos automaticamente; se usar o Drive, deixe o arquivo como
  "qualquer pessoa com o link pode ver".

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

Abra `script.js` e preencha as duas constantes no topo do arquivo, substituindo
o arquivo de demonstração pelo link real:

```js
const URL_PLANILHA_CSV = 'cole aqui o link do passo 2';  // hoje: 'produtos-exemplo.csv'
const NUMERO_WHATSAPP = '5534998371534';  // 55 + DDD + número, só dígitos
```

Feito isso, o arquivo `produtos-exemplo.csv` pode ser apagado.

Se `URL_PLANILHA_CSV` ficar vazia, a página mostra o aviso "Catálogo ainda não
conectado à planilha" — ele some sozinho assim que o link for colado.

### 4. Publicar no GitHub Pages

Suba a pasta inteira para o repositório e ative o GitHub Pages nas
configurações. A página fica em `.../catalogo.html`.

---

## Uso no dia a dia

Para adicionar, remover ou trocar uma peça, **edite apenas a planilha**. O site
lê os dados a cada acesso — não é preciso republicar nada.

Uma linha sem `nome_produto` é ignorada, então dá para deixar rascunhos na
planilha sem que apareçam no site.

---

## Arquivos

| Arquivo | O que é |
|---|---|
| `catalogo.html` | Estrutura da página |
| `style.css` | Estilos (mesma paleta e fontes da landing page) |
| `script.js` | Lê a planilha e monta a vitrine — **as duas constantes ficam aqui** |
| `assets/` | Logo, arte de fundo e fontes (tudo local, sem CDN) |
| `modelo-planilha.csv` | Modelo vazio para importar no Google Sheets |
| `produtos-exemplo.csv` | Peças fictícias da demonstração — apagar após o passo 3 |

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
- **Foto quebrada:** o card mostra um bloco creme discreto no lugar, sem ícone
  de erro.
- **Planilha fora do ar:** a página oferece o link do WhatsApp para a cliente
  não ficar sem contato.
