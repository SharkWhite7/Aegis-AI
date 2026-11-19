/* =============================================================
   AEGIS-AI — comportamento da landing page
   catálogo → trilhas → busca → nav → planos → lista de espera
   ============================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------
     1. Catálogo
     --------------------------------------------------------- */
  var JOGOS = [
    { n: "Grand Theft Auto VI", s: "Vice City · contexto profundo", g: "VI", c: ["#ff2d7e", "#4c1d7a"], tag: "soon",  tagTxt: "No lançamento" },
    { n: "Grand Theft Auto V",  s: "Online e história · contexto profundo", g: "V", c: ["#19b2e3", "#123a6b"], tag: "live", tagTxt: "No beta" },
    { n: "Red Dead Redemption 2", s: "Contexto profundo", g: "RD", c: ["#e0622c", "#5a1f18"], tag: "live", tagTxt: "No beta" },
    { n: "Cyberpunk 2077", s: "Night City · contexto profundo", g: "CP", c: ["#ffd43a", "#0f5d63"], tag: "live", tagTxt: "No beta" },
    { n: "Forza Horizon 5", s: "AI DJ e mecânico · contexto básico", g: "FH", c: ["#ff8a3c", "#4b2a8f"], tag: "live", tagTxt: "No beta" },
    { n: "EA Sports FC 26", s: "Estrategista · contexto básico", g: "FC", c: ["#36d98b", "#0d4a52"], tag: "soon", tagTxt: "Em fila" },
    { n: "Elden Ring", s: "Companhia e notas · contexto básico", g: "ER", c: ["#d9b24a", "#2a2113"], tag: "soon", tagTxt: "Em fila" },
    { n: "Minecraft", s: "Metas e projetos · contexto básico", g: "MC", c: ["#5fc36a", "#2f4a2a"], tag: "live", tagTxt: "No beta" },
    { n: "Fortnite", s: "Estrategista · contexto básico", g: "FN", c: ["#8b5cf6", "#1b2a7a"], tag: "soon", tagTxt: "Em fila" }
  ];

  var AGENTES = [
    { n: "Viper",  r: "Street Hustler",      g: "V", c: ["#ff2d7e", "#5b1030"], p: "Grátis",    pill: "free", pillTxt: "Grátis",  rate: "4.8", d: "Fala baixo, pensa alto. Conhece todo esquema da cidade e sempre tem um plano B." },
    { n: "Nova",   r: "AI DJ",               g: "N", c: ["#8b5cf6", "#132a6b"], p: "Pro",       pill: "on",   pillTxt: "Pro",     rate: "4.9", d: "Lê a cena e troca a trilha antes de você perceber que a cena mudou." },
    { n: "Rafa",   r: "Mecânico",            g: "R", c: ["#ffb24a", "#5c2410"], p: "R$ 14,90",  pill: "",     pillTxt: "Criador", rate: "4.7", d: "Setup, suspensão, câmbio. Reclama quando você bate, mas conserta junto." },
    { n: "Kai",    r: "Estrategista",        g: "K", c: ["#19e3d4", "#0d3b63"], p: "Pro",       pill: "on",   pillTxt: "Pro",     rate: "4.6", d: "Transforma a sua noite em objetivo, rota e prazo. Direto ao ponto." },
    { n: "Lua",    r: "Companhia",           g: "L", c: ["#ff6fae", "#3d1160"], p: "Grátis",    pill: "free", pillTxt: "Grátis",  rate: "4.9", d: "Conversa sobre o jogo e sobre o resto. Lembra do que você contou na sessão passada." },
    { n: "Dom",    r: "Sócio de negócios",   g: "D", c: ["#36d98b", "#0b3d3a"], p: "Pro",       pill: "on",   pillTxt: "Pro",     rate: "4.5", d: "Planilha na cabeça. Mede cada dólar que entra e cobra as suas metas." },
    { n: "Ghost",  r: "Infiltração",         g: "G", c: ["#7c8aa8", "#161a2e"], p: "R$ 19,90",  pill: "",     pillTxt: "Criador", rate: "4.4", d: "Só fala o necessário. Mapeia rota de fuga antes de você entrar." }
  ];

  /* ---------------------------------------------------------
     2. Render das trilhas
     --------------------------------------------------------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m];
    });
  }

  var railJogos = $("#railJogos");
  if (railJogos) {
    railJogos.innerHTML = JOGOS.map(function (j) {
      return '<article class="gcard" style="--c1:' + j.c[0] + ';--c2:' + j.c[1] + '" tabindex="0">' +
        '<span class="gcard__art" aria-hidden="true"></span>' +
        '<span class="gcard__mono" aria-hidden="true">' + esc(j.g) + "</span>" +
        '<span class="gcard__top">' +
          '<span class="pill ' + (j.tag === "live" ? "pill--live" : "pill--soon") + '">' +
            (j.tag === "live" ? '<i class="dot"></i>' : "") + esc(j.tagTxt) +
          "</span>" +
        "</span>" +
        '<span class="gcard__in">' +
          '<span class="gcard__ttl">' + esc(j.n) + "</span>" +
          '<span class="gcard__sub">' + esc(j.s) + "</span>" +
        "</span>" +
      "</article>";
    }).join("");
  }

  var railAgentes = $("#railAgentes");
  if (railAgentes) {
    railAgentes.innerHTML = AGENTES.map(function (a) {
      return '<article class="acard" style="--c1:' + a.c[0] + ';--c2:' + a.c[1] + '" tabindex="0" title="' + esc(a.d) + '">' +
        '<span class="acard__art">' +
          '<span class="acard__glyph" aria-hidden="true">' + esc(a.g) + "</span>" +
          '<span class="acard__badge"><span class="pill ' + (a.pill ? "pill--" + a.pill : "") + '">' + esc(a.pillTxt) + "</span></span>" +
          '<span class="acard__meta">' +
            '<span class="acard__name">' + esc(a.n) + "</span>" +
            '<span class="acard__role">' + esc(a.r) + "</span>" +
          "</span>" +
        "</span>" +
        '<span class="acard__foot">' +
          '<span class="acard__price">' + esc(a.p) + "</span>" +
          '<span class="acard__rate">' +
            '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3 6.6 7 .8-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.8L12 2Z"/></svg>' +
            esc(a.rate) +
          "</span>" +
        "</span>" +
      "</article>";
    }).join("");
  }

  /* ---------------------------------------------------------
     3. Setas + arrastar nas trilhas
     --------------------------------------------------------- */
  $$("[data-rail]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var rail = document.getElementById(btn.getAttribute("data-rail"));
      if (!rail) return;
      var step = Math.max(240, rail.clientWidth * 0.82) * Number(btn.getAttribute("data-dir"));
      rail.scrollBy({ left: step, behavior: reduce ? "auto" : "smooth" });
    });
  });

  $$(".rail__scroller").forEach(function (rail) {
    var down = false, startX = 0, startL = 0, moved = 0;
    rail.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;         // toque já rola nativo
      down = true; moved = 0;
      startX = e.clientX; startL = rail.scrollLeft;
      rail.style.cursor = "grabbing";
    });
    rail.addEventListener("pointermove", function (e) {
      if (!down) return;
      var d = e.clientX - startX;
      moved = Math.abs(d);
      if (moved > 4) { rail.scrollLeft = startL - d; e.preventDefault(); }
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) {
      rail.addEventListener(ev, function () { down = false; rail.style.cursor = ""; });
    });
    rail.addEventListener("click", function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    rail.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      rail.scrollBy({ left: (e.key === "ArrowRight" ? 1 : -1) * 280, behavior: reduce ? "auto" : "smooth" });
    });
  });

  /* ---------------------------------------------------------
     4. Nav: sombra ao rolar + menu móvel
     --------------------------------------------------------- */
  var nav = $("#nav");
  var onScroll = function () { if (nav) nav.classList.toggle("is-stuck", window.scrollY > 8); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var burger = $("#burger"), drawer = $("#drawer");
  if (burger && drawer) {
    burger.addEventListener("click", function () {
      var open = drawer.getAttribute("data-open") !== "true";
      drawer.setAttribute("data-open", String(open));
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });
    $$("a", drawer).forEach(function (a) {
      a.addEventListener("click", function () {
        drawer.setAttribute("data-open", "false");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------------------------------------------------------
     5. Busca no catálogo
     --------------------------------------------------------- */
  var INDEX = []
    .concat(JOGOS.map(function (j) { return { n: j.n, k: "Jogo", c: j.c, sub: j.s, href: "#jogos" }; }))
    .concat(AGENTES.map(function (a) { return { n: a.n, k: "Agente · " + a.r, c: a.c, sub: a.d, href: "#agentes" }; }))
    .concat([
      { n: "Co-piloto de voz", k: "Recurso", c: ["#ff2d7e", "#4c1d7a"], sub: "Conversa por voz em tempo real", href: "#recursos" },
      { n: "Missões dinâmicas", k: "Recurso", c: ["#ffb24a", "#5c2410"], sub: "Desafios gerados por sessão", href: "#recursos" },
      { n: "AI DJ + Spotify", k: "Recurso", c: ["#36d98b", "#0b3d3a"], sub: "Trilha sonora que segue a cena", href: "#recursos" },
      { n: "Memória persistente", k: "Recurso", c: ["#19e3d4", "#0d3b63"], sub: "Perfil que atravessa as sessões", href: "#recursos" },
      { n: "Marketplace", k: "Página", c: ["#8b5cf6", "#132a6b"], sub: "Publicar e vender agentes", href: "#marketplace" },
      { n: "Planos e preços", k: "Página", c: ["#ff6fae", "#3d1160"], sub: "Grátis, Pro e Elite", href: "#planos" }
    ]);

  var search = $("#search"), sInput = $("#searchInput"), sRes = $("#searchRes"), sOpen = $("#searchOpen");

  function norm(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function paint(q) {
    var list = norm(q).trim()
      ? INDEX.filter(function (i) { return norm(i.n + " " + i.k + " " + i.sub).indexOf(norm(q).trim()) > -1; })
      : INDEX.slice(0, 7);
    if (!list.length) {
      sRes.innerHTML = '<p class="search__empty">Nada com esse nome ainda. Tente “DJ”, “missão” ou “GTA”.</p>';
      return;
    }
    sRes.innerHTML = list.map(function (i) {
      return '<a class="sres" href="' + i.href + '">' +
        '<span class="sres__sw" style="--c1:' + i.c[0] + ';--c2:' + i.c[1] + '" aria-hidden="true"></span>' +
        '<span class="sres__tx"><span class="sres__n">' + esc(i.n) + '</span>' +
        '<span class="sres__k">' + esc(i.k) + "</span></span>" +
        '<svg class="sres__t" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c7293" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13m-5-6 6 6-6 6"/></svg>' +
      "</a>";
    }).join("");
  }
  function toggleSearch(open) {
    if (!search) return;
    search.setAttribute("data-open", String(open));
    if (open) { paint(""); setTimeout(function () { sInput && sInput.focus(); }, 20); }
    else if (sInput) { sInput.value = ""; }
  }
  if (sOpen) sOpen.addEventListener("click", function () { toggleSearch(true); });
  if (sInput) sInput.addEventListener("input", function () { paint(sInput.value); });
  if (search) {
    search.addEventListener("click", function (e) { if (e.target === search) toggleSearch(false); });
    search.addEventListener("click", function (e) { if (e.target.closest(".sres")) toggleSearch(false); });
  }
  document.addEventListener("keydown", function (e) {
    var open = search && search.getAttribute("data-open") === "true";
    if (e.key === "Escape" && open) toggleSearch(false);
    if (e.key === "/" && !open && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      e.preventDefault(); toggleSearch(true);
    }
  });

  /* ---------------------------------------------------------
     6. Planos: mensal / anual
     --------------------------------------------------------- */
  var bM = $("#billMonth"), bY = $("#billYear");
  function bill(year) {
    if (bM) bM.setAttribute("aria-pressed", String(!year));
    if (bY) bY.setAttribute("aria-pressed", String(year));
    $$("[data-m]").forEach(function (el) {
      el.innerHTML = el.getAttribute(year ? "data-y" : "data-m");
    });
  }
  if (bM) bM.addEventListener("click", function () { bill(false); });
  if (bY) bY.addEventListener("click", function () { bill(true); });

  /* ---------------------------------------------------------
     7. Lista de espera
     --------------------------------------------------------- */
  var form = $("#waitlist"), ok = $("#wlOk"), msg = $("#wlMsg");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $("#wl-email"), plat = $("#wl-plat");
      var val = (email.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
        email.focus();
        email.style.boxShadow = "0 0 0 2px rgba(255,75,75,.6)";
        setTimeout(function () { email.style.boxShadow = ""; }, 1400);
        if (msg && ok) { msg.textContent = "Confira o e-mail: faltou o @ ou o domínio."; ok.setAttribute("data-show", "false"); }
        return;
      }
      var nomes = { pc: "PC", ps5: "PlayStation 5", xbox: "Xbox Series", outro: "sua plataforma" };
      form.style.display = "none";
      if (ok && msg) {
        msg.textContent = "Pronto, " + val.split("@")[0] + ". Você está na lista para " + (nomes[plat.value] || "sua plataforma") + ".";
        ok.setAttribute("data-show", "true");
      }
    });
  }

  /* ---------------------------------------------------------
     8. HUD: onda + falas do agente
     --------------------------------------------------------- */
  var wave = $("#wave");
  if (wave) {
    var bars = "";
    for (var i = 0; i < 30; i++) {
      bars += '<i style="animation-delay:' + (-(i % 7) * 0.13).toFixed(2) + "s;animation-duration:" +
        (0.9 + (i % 5) * 0.11).toFixed(2) + 's"></i>';
    }
    wave.innerHTML = bars;
  }

  var say = $("#say");
  var FALAS = [
    "Você passou três noites atrás do mesmo contrato. <i>Hoje a gente faz diferente:</i> sem tiro, só negócio.",
    "Radar a 400 metros na ponte. <i>Vira à direita agora</i> e eu troco a música pra você não ouvir a sirene.",
    "Sua melhor volta aqui foi 1:42. <i>Você está 3 segundos atrás</i> — pegue a curva três mais larga.",
    "Lembra que você jurou não voltar ao cassino? <i>Estamos a dois quarteirões.</i> Eu só estou avisando."
  ];
  if (say && !reduce) {
    var k = 0;
    setInterval(function () {
      k = (k + 1) % FALAS.length;
      say.style.transition = "opacity .4s ease";
      say.style.opacity = "0";
      setTimeout(function () { say.innerHTML = FALAS[k]; say.style.opacity = "1"; }, 400);
    }, 7000);
  }

  /* ---------------------------------------------------------
     9. Ticker: duplica a faixa para o loop fechar
     --------------------------------------------------------- */
  var ticker = $("#ticker");
  if (ticker) ticker.innerHTML += ticker.innerHTML;

  /* ---------------------------------------------------------
     10. Reveal — só no que já está abaixo da dobra
     --------------------------------------------------------- */
  if (!reduce && "IntersectionObserver" in window) {
    var cands = $$(".rv").filter(function (el) {
      return el.getBoundingClientRect().top > window.innerHeight * 0.92;
    });
    cands.forEach(function (el) { el.setAttribute("data-reveal", ""); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.setAttribute("data-reveal", "in");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    cands.forEach(function (el) { io.observe(el); });
  }
})();
