# Aegis-AI — landing page estática

> Esta pasta é uma landing page autônoma, em HTML/CSS/JS puro, construída em paralelo ao app
> Next.js que vive na raiz do repositório. Ela não compartilha código com `app/` nem `components/`
> e pode ser servida sozinha ou usada como referência visual para portar o layout para a stack atual.


Site de apresentação do **Aegis-AI**, um companheiro de IA que roda ao lado do jogo:
voz em tempo real, missões geradas por sessão, DJ integrado ao Spotify, memória persistente
e um marketplace de agentes. O GTA VI é o ponto de entrada; o catálogo cresce para outros jogos.

**Seu mundo. Sua IA. Sua história.**

## Rodar localmente

Não há build nem dependências — é HTML, CSS e JavaScript sem framework.

```bash
python3 -m http.server 8080
# abra http://localhost:8080
```

## Estrutura

```
index.html              página completa (nav, hero, trilhas, recursos, planos, FAQ, lista de espera)
assets/css/aegis.css    tokens de design + todo o layout
assets/js/aegis.js      catálogo de jogos e agentes, trilhas, busca, planos, formulário
```

## Design

- **Direção:** Miami neon noir — índigo quase preto, rosa quente como acento, ciano em apoio, âmbar com parcimônia.
- **Tipografia:** Archivo (títulos, largura expandida), Inter Tight (texto), JetBrains Mono (rótulos e dados de HUD).
- **Layout:** prateleira de streaming — nav translúcida fixa, hero com HUD do agente ao vivo, trilhas horizontais de jogos e agentes, blocos de recurso assimétricos, planos, FAQ, lista de espera.
- Tema escuro único, por decisão de direção. Todas as cores saem dos tokens em `:root`.

## Catálogo

Jogos e agentes ficam em dois arrays no topo de `assets/js/aegis.js` (`JOGOS` e `AGENTES`).
Para adicionar um item, inclua um objeto no array — as trilhas, os cartões e a busca se atualizam juntos.
Cada item traz suas duas cores de capa (`c: ["#...", "#..."]`), usadas no gradiente do cartão.

## Acessibilidade e desempenho

- Sem imagens de bitmap: capas, skyline e granulado são SVG e gradientes CSS.
- Navegável por teclado (`/` abre a busca, `Esc` fecha, setas rolam as trilhas) com foco visível.
- `prefers-reduced-motion` desliga ticker, equalizador, rotação de falas e animações de entrada.
- Nenhuma fonte ou script de terceiros além do Google Fonts.

## Aviso legal

O Aegis-AI é um aplicativo companheiro independente, sem afiliação com a Rockstar Games,
a Take-Two Interactive, o Spotify ou qualquer outra empresa citada. As marcas aparecem apenas
para indicar compatibilidade. Nenhum arquivo de jogo é modificado ou redistribuído.

## Versão publicada

`tools/build-artifact.py` gera `.artifact/page.html` a partir do `index.html` (mesma página, sem o
invólucro `<html>/<head>/<body>`) para publicação como artefato. Rode depois de editar o `index.html`:

```bash
cd static-landing && python3 tools/build-artifact.py
```
