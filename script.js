(() => {
  'use strict';

  const LS_KEY = 'ml_letras';
  const LS_SESSAO = 'ml_sessao';
  const LS_ORDEM = 'ml_ordem';
  const LS_TEMA = 'ml_tema';
  const LS_RECENTS = 'ml_recents';
  const LS_ORDEM_MANUAL = 'ml_ordem_manual';   // ordem arrastada pelo usuário (array de ids)
  const LS_ACESSOS_LOCAL = 'ml_acessos_local'; // fallback do histórico quando a nuvem falha
  const LS_ULTIMO_ACESSO = 'ml_ultimo_acesso'; // evita registrar acesso repetido no refresh
  const LS_SALAS = 'ml_salas';                 // salas de ensaio locais (cache)
  const LS_FONTE = 'ml_fonte';                 // escala de fonte no player (1 = normal)
  const LS_TAGS_FILTRO = 'ml_tags_filtro';     // tag ativa no filtro da lista
  const LS_FAVORITOS = 'ml_favoritos';         // ids de letras favoritas
  const CANAL_TV = 'minhas-letras-tv';         // BroadcastChannel da 2ª tela
  const CANAL_SALA = 'minhas-letras-sala';     // BroadcastChannel para sala de ensaio
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // Chave para assinar links de compartilhamento (HMAC-SHA256)
  // Em produção ideal viria de variável de ambiente; aqui é constante do app.
  const SHARE_SECRET = 'ml-share-secret-v1-2026';

  let letras = [];
  let editandoId = null;
  let pendenciaExclusao = null;
  let sessaoAtiva = false;

  let musicaAtual = null;
  let indiceAtual = 0;
  let modo = 'auto';
  let rolando = false;
  let timer = null;
  let scrollTop = 0;
  let atual = 0;
  let estrofes = [];
  let animOut = false;
  let palcoAtivo = false;
  let cifraAtivo = false;
  let transpose = 0;
  let wakeLock = null;

  // --- NOVAS VARIÁVEIS: Compartilhamento ---
  let shareTokenCache = new Map(); // id -> token (cache pra não recalcular)

  // --- NOVAS VARIÁVEIS: Sala de ensaio (banda) ---
  let salaAtiva = null;            // { codigo, host: bool, musicaId, participantes[], estado }
  let salaCanal = null;            // BroadcastChannel local
  let salaCanalNuvem = null;       // Supabase Realtime channel
  let salaMeuId = null;            // ID único deste participante na sala

  // --- NOVAS VARIÁVEIS: Referência YouTube/Spotify ---
  let refSidebarAberta = false;
  let refPlayer = null;            // iframe do YouTube/Spotify
  let refSyncMarkers = [];         // [{ tempo: segundos, estrofe: index }]
  let refTempoVideo = 0;           // último tempo recebido do vídeo (segundos)
  let refTempoRecebidoEm = 0;      // timestamp local da última infoDelivery
  let refVideoTocando = false;     // heurística: vídeo avançou desde a última leitura
  let refSyncAtivo = false;        // se a letra está seguindo o vídeo
  let refSyncTimer = null;         // timer único do poll (nunca dois rodando junto)
  let refSyncTickTimer = null;     // timer do sync no modo MANUAL (250ms)

  // Ordem: 'criado_em' | 'titulo_az' | 'titulo_za' | 'recente' | 'antiga' | 'estrofes_mais' | 'estrofes_menos'
  let ordemAtual = 'criado_em';

  // --- FEATURES NOVAS ---
  let fontScale = storageGet(LS_FONTE, 1);     // escala da fonte no player (0.7 a 2.0)
  let tagAtiva = storageGet(LS_TAGS_FILTRO, null); // tag filtrada na lista (null = todas)
  let favoritos = new Set(storageGet(LS_FAVORITOS, [])); // ids favoritados

const el = {
    viewLogin: $('#view-login'),
    viewRegistro: $('#view-registro'),
    viewList: $('#view-list'),
    viewPlayer: $('#view-player'),
    formLogin: $('#form-login'),
    formRegistro: $('#form-registro'),
    iLoginUsuario: $('#i-login-usuario'),
    iLoginSenha: $('#i-login-senha'),
    iRegUsuario: $('#i-reg-usuario'),
    iRegSenha: $('#i-reg-senha'),
    iRegConfirma: $('#i-reg-confirma'),
    loginError: $('#login-error'),
    registroError: $('#registro-error'),
    linkRegistro: $('#link-registro'),
    linkLogin: $('#link-login'),
    btnSair: $('#btn-sair'),
    btnInstalar: $('#btn-instalar'),
    btnNova: $('#btn-nova'),
    busca: $('#busca'),
    contador: $('#contador'),
    grid: $('#grid'),
    modalForm: $('#modal-form'),
    modalTitle: $('#modal-title'),
    modalSub: $('#modal-sub'),
    formLetra: $('#form-letra'),
    btnCancelar: $('#btn-cancelar'),
    btnSalvar: $('#btn-salvar'),
    iTitulo: $('#i-titulo'),
    iArtista: $('#i-artista'),
    iLetra: $('#i-letra'),
    iTags: $('#i-tags'),
    modalExcluir: $('#modal-excluir'),
    modalExcluirText: $('#modal-excluir-text'),
    btnCancelarExclusao: $('#btn-cancelar-exclusao'),
    btnConfirmarExclusao: $('#btn-confirmar-exclusao'),
    toastRegion: $('#toast-region'),
    btnVoltar: $('#btn-voltar'),
    infoTitulo: $('#info-titulo'),
    infoArtista: $('#info-artista'),
    modoAutoBtn: $('#modo-auto'),
    modoManualBtn: $('#modo-manual'),
    autoControls: $('#auto-controls'),
    btnPlay: $('#btn-play'),
    speed: $('#speed'),
    speedLabel: $('#speed-label'),
    btnFullscreen: $('#btn-fullscreen'),
    btnCifra: $('#btn-cifra'),
    btnTransposeDown: $('#btn-transpose-down'),
    btnTransposeUp: $('#btn-transpose-up'),
    transposeValue: $('#transpose-value'),
    stage: $('#stage'),
    viewNotFound: $('#view-notfound'),
    // views de recuperação de senha
    viewEsqueci: $('#view-esqueci'),
    viewRedefinir: $('#view-redefinir'),
    formEsqueci: $('#form-esqueci'),
    iEsqueciEmail: $('#i-esqueci-email'),
    esqueciError: $('#esqueci-error'),
    esqueciOk: $('#esqueci-ok'),
    formRedefinir: $('#form-redefinir'),
    iRedSenha: $('#i-red-senha'),
    iRedConfirma: $('#i-red-confirma'),
    redefinirError: $('#redefinir-error'),
    // novos
    btnTema: $('#btn-tema'),
    btnExportar: $('#btn-exportar'),
    btnImportar: $('#btn-importar'),
    inputImportar: $('#input-importar'),
    ordemSelect: $('#ordem-select'),
    btnPalco: $('#btn-palco'),
    // novos (2ª tela, acessos, PDF)
    btnTv: $('#btn-tv'),
    btnAcessos: $('#btn-acessos'),
    modalAcessos: $('#modal-acessos'),
    acessosLista: $('#acessos-lista'),
    acessosSub: $('#acessos-sub'),
    btnFecharAcessos: $('#btn-fechar-acessos'),
    // 2ª tela entre aparelhos (link + cópia)
    modalTv: $('#modal-tv'),
    tvLink: $('#tv-link'),
    tvCampoLink: $('#tv-campo-link'),
    tvAvisoHost: $('#tv-aviso-host'),
    btnTvAbrir: $('#tv-abrir'),
    btnTvCopiar: $('#tv-copiar'),
    btnTvFechar: $('#tv-fechar'),
    // --- NOVOS: Compartilhar, Sala, Referência ---
    btnCompartilhar: $('#btn-compartilhar'),
    // --- Features novas: fonte, tag filter, favorito ---
    btnFontUp: $('#btn-font-up'),
    btnFontDown: $('#btn-font-down'),
    tagFilter: $('#tag-filter'),
    btnSala: $('#btn-sala'),
    modalSala: $('#modal-sala'),
    salaCodigo: $('#sala-codigo'),
    salaCriar: $('#sala-criar'),
    salaEntrar: $('#sala-entrar'),
    salaCodigoInput: $('#sala-codigo-input'),
    salaStatus: $('#sala-status'),
    salaParticipantes: $('#sala-participantes'),
    salaFechar: $('#sala-fechar'),
    salaCancelar: $('#sala-cancelar'),
    btnReferencia: $('#btn-referencia'),
    refSidebar: $('#ref-sidebar'),
    refIframe: $('#ref-iframe'),
    refFechar: $('#ref-fechar'),
    refLink: $('#ref-link'),
    refSalvar: $('#ref-salvar'),
    refMarcar: $('#ref-marcar'),
    refSync: $('#ref-sync'),
    refLimpar: $('#ref-limpar'),
    refMarkers: $('#ref-markers'),
    iReferencia: $('#i-referencia')
  };

  function storageGet(chave, fallback) {
    try {
      const raw = localStorage.getItem(chave);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }
  function storageSet(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch {}
  }
  // C1: normaliza ids vindos da nuvem/local para número inteiro positivo.
  // Evita NaN/duplicado que quebram editar/excluir/cantar.
  function normalizarIds(lista) {
    if (!Array.isArray(lista)) return [];
    const vistos = new Set();
    let max = 0;
    return lista.filter(l => l && typeof l === 'object').map(l => {
      let id = Number(l.id);
      if (!Number.isFinite(id) || id <= 0 || vistos.has(id)) id = max + 1;
      vistos.add(id);
      if (id > max) max = id;
      return { ...l, id };
    });
  }
  function carregar() {
    letras = normalizarIds(storageGet(LS_KEY, []));
    sessaoAtiva = storageGet(LS_SESSAO, false);
    ordemAtual = storageGet(LS_ORDEM, 'criado_em');
    // Tema será aplicado em initTema()
  }
  function salvar() { storageSet(LS_KEY, letras); }

  const SUPABASE_URL = 'https://vhkedqpcnqwoyaqkdyfk.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_6IxkP-rxpQq4Ivr5ulTV6g_65a8RER4';
  let supabase = null;
  let usandoSupabase = false;
  let sdkSupabaseCarregando = false;
  let sdkSupabasePromise = null;

  function carregarSDKSupabase() {
    if (sdkSupabasePromise) return sdkSupabasePromise;
    sdkSupabasePromise = new Promise(resolve => {
      if (window.supabase) {
        try {
          supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          resolve(true);
        } catch { resolve(false); }
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => {
        try {
          supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          resolve(true);
        } catch { resolve(false); }
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
    return sdkSupabasePromise;
  }

  async function carregarLetrasNuvem() {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase
        .from('letras')
        .select('*')
        .order('criado_em');
      if (!error && Array.isArray(data)) {
        // B: a nuvem manda. Se ela respondeu com sucesso, a lista local é
        // SUBSTITUÍDA pela da nuvem — letras apagadas no painel do Supabase
        // somem aqui também (inclusive as que só existiam neste aparelho).
        // Se a nuvem falhar (erro/rede), o return false mantém as letras
        // locais intactas (fallback offline continua valendo).
        letras = normalizarIds(data);
        usandoSupabase = true;
        return true;
      }
    } catch {}
    usandoSupabase = false;
    return false;
  }

  function mostrarLogin() {
    el.viewLogin.classList.remove('hidden');
    el.viewRegistro.classList.add('hidden');
    el.viewEsqueci.classList.add('hidden');
    el.viewRedefinir.classList.add('hidden');
    el.viewList.classList.add('hidden');
    el.viewPlayer.classList.add('hidden');
    el.loginError.classList.remove('show');
    el.formLogin.reset();
  }

  function mostrarRegistro() {
    el.viewLogin.classList.add('hidden');
    el.viewRegistro.classList.remove('hidden');
    el.viewEsqueci.classList.add('hidden');
    el.viewRedefinir.classList.add('hidden');
    el.viewList.classList.add('hidden');
    el.viewPlayer.classList.add('hidden');
    el.registroError.classList.remove('show');
    el.formRegistro.reset();
  }

  function mostrarEsqueci() {
    el.viewLogin.classList.add('hidden');
    el.viewRegistro.classList.add('hidden');
    el.viewEsqueci.classList.remove('hidden');
    el.viewRedefinir.classList.add('hidden');
    el.viewList.classList.add('hidden');
    el.viewPlayer.classList.add('hidden');
    el.esqueciError.classList.remove('show');
    el.esqueciOk.classList.remove('show');
    el.formEsqueci.reset();
    el.iEsqueciEmail.focus();
  }

  function mostrarRedefinir() {
    el.viewLogin.classList.add('hidden');
    el.viewRegistro.classList.add('hidden');
    el.viewEsqueci.classList.add('hidden');
    el.viewRedefinir.classList.remove('hidden');
    el.viewList.classList.add('hidden');
    el.viewPlayer.classList.add('hidden');
    el.redefinirError.classList.remove('show');
    el.formRedefinir.reset();
    el.iRedSenha.focus();
  }

  async function entrar() {
    sessaoAtiva = true;
    storageSet(LS_SESSAO, true);
    el.viewLogin.classList.add('hidden');
    el.viewRegistro.classList.add('hidden');
    el.viewEsqueci.classList.add('hidden');
    el.viewRedefinir.classList.add('hidden');
    el.viewPlayer.classList.add('hidden');
    el.viewList.classList.remove('hidden');
    document.title = 'Minhas Letras';
   // oi
    if (supabase) {
      const okNuvem = await carregarLetrasNuvem();
      // C3: aviso honesto quando a listagem da nuvem falha (antes era silencioso)
      if (!okNuvem) {
        toast('Não consegui carregar da nuvem — mostrando as letras deste aparelho.', 'error');
      }
    }
    initTema();
    if (el.ordemSelect) el.ordemSelect.value = ordemAtual;
    salvar();
    render();
    registrarAcesso(); // histórico de acessos (28) — não trava a tela
    // 2ª tela entre aparelhos: abre o canal da nuvem já logado
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        if (data && data.user) { uidTV = data.user.id; tvNuvemCanal(); }
      } catch {}
    }
  }

  async function sair() {
    sessaoAtiva = false;
    storageSet(LS_SESSAO, false);
    pararAuto();
    musicaAtual = null;
    desligarTVNuvem();
    desligarTVLocal();
    uidTV = null;
    // Sai da sala se estiver em uma
    if (salaAtiva) sairSala();
    if (supabase) {
      try { await supabase.auth.signOut(); } catch {}
    }
    mostrarLogin();
  }

  function desligarTVLocal() {
    if (canalTV) {
      try { canalTV.close(); } catch {}
      canalTV = null;
    }
    tvAtivo = false;
  }

  async function tratarLogin(e) {
    e.preventDefault();
    const email = el.iLoginUsuario.value.trim();
    const senha = el.iLoginSenha.value;

    limparErros();
    el.loginError.classList.remove('show');

    let valido = true;
    if (!email) { marcarErro('f-login-usuario'); valido = false; }
    if (!senha) { marcarErro('f-login-senha'); valido = false; }
    if (!valido) return;

    const ok = await carregarSDKSupabase();
    if (!ok || !supabase) {
      el.loginError.textContent = 'Não deu pra conectar na nuvem. Verifique sua internet.';
      el.loginError.classList.add('show');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      el.loginError.textContent = erroSupabase(error);
      el.loginError.classList.add('show');
      return;
    }
    entrar();
  }

  async function tratarRegistro(e) {
    e.preventDefault();
    const email = el.iRegUsuario.value.trim();
    const senha = el.iRegSenha.value;
    const confirma = el.iRegConfirma.value;

    limparErros();
    el.registroError.classList.remove('show');

    let valido = true;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { marcarErro('f-reg-usuario'); valido = false; }
    if (senha.length < 6) { marcarErro('f-reg-senha'); valido = false; }
    if (senha !== confirma) { marcarErro('f-reg-confirma'); valido = false; }
    if (!valido) return;

    const ok = await carregarSDKSupabase();
    if (!ok || !supabase) {
      el.registroError.textContent = 'Não deu pra conectar na nuvem. Verifique sua internet.';
      el.registroError.classList.add('show');
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password: senha });
    if (error) {
      el.registroError.textContent = erroSupabase(error);
      el.registroError.classList.add('show');
      return;
    }

    if (data.session) {
      entrar();
    } else {
      // C5: mostrarLogin() esconde a view de registro — a mensagem tem que
      // ir para o loginError DEPOIS, senão fica invisível.
      mostrarLogin();
      el.loginError.textContent = 'Conta criada! Confira seu e-mail para confirmar, depois faça login.';
      el.loginError.classList.add('show');
    }
  }

  function erroSupabase(error) {
    const msg = (error && error.message) || 'Não foi possível completar.';
    const m = msg.toLowerCase();
    if (m.includes('rate limit') || m.includes('too many') || m.includes('over_'))
      return 'Calma lá! Muitos e-mails num curto período. Espera uns 30-60 min e tenta de novo.';
    if (m.includes('already')) return 'Este e-mail já tem uma conta. Faça login.';
    if (m.includes('password should')) return 'Senha precisa ter pelo menos 6 caracteres.';
    if (m.includes('invalid login')) return 'E-mail ou senha incorretos. Confira e tente de novo.';
    if (m.includes('not confirmed') || m.includes('unconfirmed')) return 'Falta confirmar o e-mail! Abra o link que enviamos pro seu e-mail, depois tente de novo.';
    if (m.includes('otp') || (m.includes('token') && (m.includes('expired') || m.includes('invalid'))) || m.includes('access token'))
      return 'Esse link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".';
    if (m.includes('session not found') || m.includes('session_missing') || m.includes('no jwt'))
      return 'Sua sessão expirou. Faça login de novo — se não lembra a senha, use "Esqueci minha senha".';
    return msg;
  }

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
  // C1: só considera ids numéricos finitos — Math.max com lixo dava NaN
  function gerarId() {
    return letras.reduce((max, l) => {
      const n = Number(l.id);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0) + 1;
  }
  function contarEstrofes(l) { return l.split(/\n\s*\n/).filter(s => s.trim() !== '').length; }
  function contarLinhas(l) { return l.split('\n').filter(x => x.trim() !== '').length; }

  // ============ UTILITÁRIOS NOVOS ============
  // Normaliza string para busca: minúsculas, sem acentos, trim
  function normalizarBusca(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  // Gera slug simples para tags
  function slugTag(s) {
    return normalizarBusca(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // ============ BUSCA FUZZY (22) ============
  // Pontua o quão bem "consulta" casa com "texto", permitindo letras no meio
  // (subsequência). "asa brancaa" acha "asa branca"; "asabranca" também.
  // Retorna 0 = não casou; quanto maior, melhor.
  function pontuarFuzzy(consulta, texto) {
    if (!consulta) return 1;                      // sem termo = tudo serve
    if (!texto) return 0;
    // casa direto (substring) ganha bônus — é o resultado "perfeito"
    const direto = texto.indexOf(consulta);
    if (direto !== -1) {
      return 1000 + (direto === 0 ? 200 : 0) + Math.max(0, 50 - direto);
    }
    let qi = 0, pontos = 0, sequencia = 0;
    for (let i = 0; i < texto.length && qi < consulta.length; i++) {
      if (texto[i] === consulta[qi]) {
        qi++;
        sequencia++;
        pontos += 5 + sequencia * 5;              // letras seguidas valem mais
        // início de palavra (depois de espaço/-) vale mais
        if (i === 0 || texto[i - 1] === ' ' || texto[i - 1] === '-') pontos += 15;
      } else {
        sequencia = 0;
      }
    }
    return qi === consulta.length ? pontos : 0;   // faltou letra = não casa
  }

  // Melhor pontuação da letra em relação ao termo (título, artista ou tags)
  function pontuarLetra(l, termoNorm) {
    if (!termoNorm) return 1;
    let melhor = pontuarFuzzy(termoNorm, normalizarBusca(l.titulo)) * 1.5; // título pesa mais
    if (l.artista) melhor = Math.max(melhor, pontuarFuzzy(termoNorm, normalizarBusca(l.artista)));
    for (const t of (l.tags || [])) {
      melhor = Math.max(melhor, pontuarFuzzy(termoNorm, normalizarBusca(t)) * 0.8);
    }
    return melhor;
  }

  // Parse de tags: string "tag1, tag2, tag3" -> array ['tag1','tag2','tag3']
  function parseTags(str) {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean).map(slugTag);
  }

  // Serializa tags array -> string "tag1, tag2"
  function serializeTags(arr) {
    if (!Array.isArray(arr)) return '';
    return arr.join(', ');
  }

  // ============ UTILITÁRIOS NOVOS (Share, Sala, Referência) ============
  // Gera token HMAC-SHA256 para link de compartilhamento
  async function gerarShareToken(id) {
    if (shareTokenCache.has(id)) return shareTokenCache.get(id);
    // crypto.subtle só funciona em contexto seguro (HTTPS ou localhost)
    if (!window.crypto || !window.crypto.subtle) {
      console.warn('crypto.subtle não disponível — contexto inseguro (precisa HTTPS)');
      return '';
    }
    const msg = String(id);
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SHARE_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
    const token = Array.from(new Uint8Array(sig))
      .slice(0, 12) // 12 bytes = 24 chars hex = 96 bits (suficiente)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    shareTokenCache.set(id, token);
    return token;
  }

  // Verifica token de compartilhamento
  async function verificarShareToken(id, token) {
    const esperado = await gerarShareToken(id);
    if (!esperado) return false;
    // Comparação em tempo constante simples
    if (token.length !== esperado.length) return false;
    let diff = 0;
    for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ esperado.charCodeAt(i);
    return diff === 0;
  }

  // Gera código de sala de 4 caracteres (A-Z, 0-9 sem ambíguos)
  function gerarCodigoSala() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 1, 0
    let codigo = '';
    for (let i = 0; i < 4; i++) codigo += chars[Math.floor(Math.random() * chars.length)];
    return codigo;
  }

  // Gera ID único para participante da sala
  function gerarParticipanteId() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  // Extrai ID do vídeo YouTube de várias URLs
  function extrairYouTubeId(url) {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
      /youtube\.com\/live\/([^&\n?#]+)/
    ];
    for (const re of patterns) {
      const m = url.match(re);
      if (m && m[1]) return m[1].split('&')[0];
    }
    return null;
  }

  // Extrai ID/URI do Spotify
  function extrairSpotifyId(url) {
    if (!url) return null;
    // open.spotify.com/track/ID, spotify:track:ID
    const m = url.match(/(?:open\.spotify\.com\/track\/|spotify:track:)([^&\n?#]+)/);
    return m ? m[1].split('?')[0] : null;
  }

  // Converte URL de referência em URL de embed
  function urlParaEmbed(url) {
    const yt = extrairYouTubeId(url);
    if (yt) return `https://www.youtube.com/embed/${yt}?enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
    const sp = extrairSpotifyId(url);
    if (sp) return `https://open.spotify.com/embed/track/${sp}`;
    return null;
  }

  // Formata segundos em MM:SS
  function formatarTempo(seg) {
    const m = Math.floor(seg / 60);
    const s = Math.floor(seg % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Parse MM:SS ou H:MM:SS para segundos
  function parseTempo(str) {
    if (!str) return 0;
    const partes = str.split(':').map(Number);
    if (partes.length === 2) return partes[0] * 60 + partes[1];
    if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
    return Number(str) || 0;
  }

  // ============ EXPORT / IMPORT ============
  function exportarJSON() {
    const data = {
      versao: 2,
      exportadoEm: new Date().toISOString(),
      letras: letras.map(l => ({
        id: l.id,
        titulo: l.titulo,
        artista: l.artista,
        letra: l.letra,
        tags: l.tags || [],
        link_referencia: l.link_referencia || null,
        ref_markers: l.ref_markers || [],
        criado_em: l.criado_em || new Date().toISOString()
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minhas-letras-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup exportado!');
  }

  async function importarJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.letras || !Array.isArray(data.letras)) {
            reject(new Error('Arquivo inválido: sem array "letras"'));
            return;
          }
          let importadas = 0;
          let puladas = 0;
          const novas = [];
          for (const l of data.letras) {
            if (!l.titulo || !l.letra) { puladas++; continue; }
            // Verifica duplicata por título+artista (case-insensitive)
            const existe = letras.find(x =>
              x.titulo.toLowerCase() === l.titulo.toLowerCase() &&
              (x.artista || '').toLowerCase() === (l.artista || '').toLowerCase()
            );
            if (existe) { puladas++; continue; }
            const nova = {
              id: gerarId(),
              titulo: l.titulo.trim(),
              artista: (l.artista || '').trim(),
              letra: l.letra.trim(),
              tags: Array.isArray(l.tags) ? l.tags.map(slugTag).filter(Boolean) : [],
              link_referencia: l.link_referencia || null,
              ref_markers: Array.isArray(l.ref_markers) ? l.ref_markers : [],
              criado_em: l.criado_em || new Date().toISOString()
            };
            letras.push(nova);
            novas.push(nova);
            importadas++;
          }
          salvar();
          render();

          // SOBE PRA NUVEM. Sem isso a letra importada fica só neste aparelho:
          // some quando a lista da nuvem substitui a local, e EDITAR depois
          // mandava update num id que não existe no banco (0 linhas = "ok"
          // mentiroso — a letra nunca era salva lá).
          let subidas = 0;
          let falhasNuvem = 0;
          const nuvemOn = !!(usandoSupabase && supabase);
          if (novas.length && nuvemOn) {
            let user = null;
            try {
              const r = await supabase.auth.getUser();
              user = r && r.data && r.data.user;
            } catch {}
            for (const nova of novas) {
              try {
                const linha = {
                  user_id: user ? user.id : null,
                  titulo: nova.titulo,
                  artista: nova.artista,
                  letra: nova.letra,
                  tags: nova.tags,
                  link_referencia: nova.link_referencia
                };
                // só manda a data se for válida (backup antigo pode trazer null)
                if (typeof nova.criado_em === 'string' && nova.criado_em.trim() &&
                    !isNaN(Date.parse(nova.criado_em))) {
                  linha.criado_em = nova.criado_em;
                }
                const { data: criada, error } = await supabase
                  .from('letras')
                  .insert(linha)
                  .select();
                if (!error && Array.isArray(criada) && criada[0]) {
                  nova.id = criada[0].id; // id real do banco (serial)
                  subidas++;
                } else {
                  falhasNuvem++;
                }
              } catch { falhasNuvem++; }
            }
            if (subidas) { salvar(); render(); }
          }
          resolve({
            importadas,
            puladas,
            subidas,
            falhasNuvem,
            semNuvem: novas.length > 0 && !nuvemOn
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
      reader.readAsText(file);
    });
  }

  // ============ COMPARTILHAR LETRA INDIVIDUAL (3) ============
  // Gera link público ?share=<id>&token=<hmac> que abre share.html (read-only)
  async function gerarLinkCompartilhar(id) {
    const token = await gerarShareToken(id);
    const base = location.href.replace(/[^/]*$/, '');
    return `${base}share.html?share=${id}&token=${token}`;
  }

  async function abrirModalCompartilhar(id) {
    const l = letras.find(x => x.id === id);
    if (!l) return;
    const token = await gerarShareToken(id);
    if (!token) {
      toast('Compartilhamento requer HTTPS (ou localhost).', 'error');
      return;
    }
    const base = location.href.replace(/[^/]*$/, '');
    const link = `${base}share.html?share=${id}&token=${token}`;
    
    // Cria modal simples de compartilhamento
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal small">
        <h3>Compartilhar "${escapeHtml(l.titulo)}"</h3>
        <p class="modal-sub">Link público — abre direto no player, sem login.</p>
        <div class="field">
          <label>Link de compartilhamento</label>
          <input type="text" id="share-link" value="${escapeHtml(link)}" readonly>
          <p class="hint">Quem abrir vê a letra no player (auto/manual, cifra, transpose). Não dá pra editar.</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="share-fechar">Fechar</button>
          <button class="btn btn-primary" id="share-copiar">Copiar link</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('#share-fechar').onclick = () => modal.remove();
    modal.querySelector('#share-copiar').onclick = async () => {
      try {
        await navigator.clipboard.writeText(link);
        toast('Link copiado!');
      } catch {
        toast('Não deu pra copiar — seleciona e Ctrl+C.', 'error');
      }
    };
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    
    setTimeout(() => modal.querySelector('#share-link')?.select(), 50);
  }

  // Botão de compartilhar no card (na lista)
  // Adicionado no render() - ver lá

  // ============ SALA DE ENSAIO / BANDA (7) ============
  // Host cria sala com código de 4 letras → convidados entram com código
  // Sync via Supabase Realtime broadcast (canal "sala-<codigo>")
  // Host controla: música atual, modo, play/pause, estrofe, transpose, cifra
  // Participantes veem a mesma coisa em tempo real

  function abrirModalSala() {
    if (el.modalSala.classList.contains('hidden')) {
      el.modalSala.classList.remove('hidden');
      if (!salaAtiva) {
        // Não está em sala — mostra opção de criar/entrar
        $('#sala-criar-entrar').classList.remove('hidden');
        $('#sala-ativa').classList.add('hidden');
      } else {
        // Já está em sala — mostra status
        atualizarModalSala();
      }
    } else {
      el.modalSala.classList.add('hidden');
    }
  }

  async function criarSala() {
    const codigo = gerarCodigoSala();
    salaMeuId = gerarParticipanteId();
    salaAtiva = {
      codigo,
      host: true,
      musicaId: musicaAtual?.id || null,
      participantes: [{ id: salaMeuId, nome: 'Você (host)', host: true }],
      estado: {
        musicaId: musicaAtual?.id || null,
        modo: modo,
        rolando: rolando,
        atual: atual,
        cifraAtivo: cifraAtivo,
        transpose: transpose
      }
    };
    await entrarCanalSala(codigo);
    salvarSalaLocal();
    atualizarModalSala();
    toast(`Sala criada! Código: <b>${codigo}</b> — manda pra banda.`);
  }

  async function entrarSala(codigo) {
    codigo = codigo.toUpperCase().trim();
    if (!/^[A-Z0-9]{4}$/.test(codigo)) {
      toast('Código inválido — use 4 letras/números.', 'error');
      return;
    }
    salaMeuId = gerarParticipanteId();
    salaAtiva = {
      codigo,
      host: false,
      musicaId: null,
      participantes: [],
      estado: {}
    };
    const ok = await entrarCanalSala(codigo);
    if (ok) {
      salvarSalaLocal();
      atualizarModalSala();
      toast(`Entrou na sala <b>${codigo}</b>!`);
    } else {
      salaAtiva = null;
      salaMeuId = null;
    }
  }

  function sairSala() {
    if (salaCanal) { try { salaCanal.close(); } catch {} salaCanal = null; }
    if (salaCanalNuvem && supabase) { try { supabase.removeChannel(salaCanalNuvem); } catch {} salaCanalNuvem = null; }
    salaAtiva = null;
    salaMeuId = null;
    localStorage.removeItem(LS_SALAS);
    if (el.modalSala) el.modalSala.classList.add('hidden');
    toast('Saiu da sala.');
  }

  async function entrarCanalSala(codigo) {
    // BroadcastChannel local (mesmo navegador, abas diferentes)
    try { salaCanal = new BroadcastChannel(CANAL_SALA + '-' + codigo); } catch { salaCanal = null; }
    if (salaCanal) {
      salaCanal.onmessage = ev => receberMensagemSala(ev.data);
    }

    // Supabase Realtime (entre aparelhos diferentes)
    if (supabase && usandoSupabase) {
      try {
        salaCanalNuvem = supabase.channel('sala-' + codigo, { config: { broadcast: { self: false } } });
        salaCanalNuvem
          .on('broadcast', { event: 'estado' }, ev => receberMensagemSala(ev.payload))
          .on('broadcast', { event: 'comando' }, ev => receberComandoSala(ev.payload))
          .subscribe();
        // Registra presença
        await salaCanalNuvem.send({ type: 'broadcast', event: 'entrar', payload: { id: salaMeuId, host: salaAtiva.host } });
        return true;
      } catch (e) {
        console.warn('Sala Realtime falhou:', e);
        salaCanalNuvem = null;
        return false;
      }
    }
    return true; // pelo menos local funciona
  }

  function receberMensagemSala(msg) {
    if (!msg || !msg.t) return;
    if (msg.t === 'estado') {
      // Host mandou estado completo
      if (salaAtiva && !salaAtiva.host) {
        aplicarEstadoSala(msg.estado);
      }
    } else if (msg.t === 'entrar') {
      // Alguém entrou
      if (salaAtiva && salaAtiva.host) {
        const existe = salaAtiva.participantes.find(p => p.id === msg.id);
        if (!existe) {
          salaAtiva.participantes.push({ id: msg.id, nome: msg.host ? 'Host' : 'Participante', host: !!msg.host });
          salvarSalaLocal();
          atualizarModalSala();
          // Host manda estado atual pro novo participante
          enviarEstadoSala();
        }
      }
    } else if (msg.t === 'sair') {
      if (salaAtiva) {
        salaAtiva.participantes = salaAtiva.participantes.filter(p => p.id !== msg.id);
        salvarSalaLocal();
        atualizarModalSala();
      }
    } else if (msg.t === 'comando') {
      receberComandoSala(msg);
    }
  }

  function receberComandoSala(cmd) {
    if (!salaAtiva || salaAtiva.host) return; // Só participantes recebem comandos
    const acao = cmd.acao;
    const valor = cmd.valor;
    switch (acao) {
      case 'musica':
        if (valor && valor !== salaAtiva.musicaId) {
          salaAtiva.musicaId = valor;
          const l = letras.find(x => x.id === valor);
          if (l) abrirPlayer(valor);
        }
        break;
      case 'modo':
        if (valor && valor !== modo) setModo(valor);
        break;
      case 'play':
        if (modo === 'auto' && !rolando) toggleAuto();
        break;
      case 'pause':
        if (modo === 'auto' && rolando) toggleAuto();
        break;
      case 'avancar':
        if (modo === 'manual') avancar();
        break;
      case 'voltar':
        if (modo === 'manual') voltarEstrofe();
        break;
      case 'cifra':
        if (valor !== cifraAtivo) alternarCifra();
        break;
      case 'transpose':
        if (typeof valor === 'number' && valor !== transpose) alterarTranspose(valor - transpose);
        break;
    }
  }

  function enviarEstadoSala() {
    if (!salaAtiva || !salaAtiva.host) return;
    const estado = {
      musicaId: musicaAtual?.id || null,
      modo: modo,
      rolando: rolando,
      atual: atual,
      cifraAtivo: cifraAtivo,
      transpose: transpose
    };
    salaAtiva.estado = estado;
    const msg = { t: 'estado', estado };
    if (salaCanal) { try { salaCanal.postMessage(msg); } catch {} }
    if (salaCanalNuvem) { try { salaCanalNuvem.send({ type: 'broadcast', event: 'estado', payload: msg }); } catch {} }
  }

  function enviarComandoSala(acao, valor) {
    if (!salaAtiva || !salaAtiva.host) return;
    const msg = { t: 'comando', acao, valor };
    if (salaCanal) { try { salaCanal.postMessage(msg); } catch {} }
    if (salaCanalNuvem) { try { salaCanalNuvem.send({ type: 'broadcast', event: 'comando', payload: msg }); } catch {} }
  }

  function aplicarEstadoSala(estado) {
    if (!estado) return;
    // Troca de música
    if (estado.musicaId && estado.musicaId !== musicaAtual?.id) {
      const l = letras.find(x => x.id === estado.musicaId);
      if (l) abrirPlayer(estado.musicaId);
    }
    // Modo
    if (estado.modo && estado.modo !== modo) setModo(estado.modo);
    // Play/pause
    if (modo === 'auto') {
      if (estado.rolando && !rolando) toggleAuto();
      else if (!estado.rolando && rolando) toggleAuto();
    }
    // Estrofe atual (manual)
    if (modo === 'manual' && typeof estado.atual === 'number' && estado.atual !== atual) {
      atual = estado.atual;
      mostrarEstrofe();
    }
    // Cifra
    if (estado.cifraAtivo !== cifraAtivo) alternarCifra();
    // Transpose
    if (typeof estado.transpose === 'number' && estado.transpose !== transpose) {
      alterarTranspose(estado.transpose - transpose);
    }
  }

  function salvarSalaLocal() {
    if (salaAtiva) {
      storageSet(LS_SALAS, { codigo: salaAtiva.codigo, host: salaAtiva.host, meuId: salaMeuId });
    }
  }

  function restaurarSalaLocal() {
    const data = storageGet(LS_SALAS, null);
    if (data && data.codigo && data.meuId) {
      salaMeuId = data.meuId;
      salaAtiva = { codigo: data.codigo, host: data.host, musicaId: null, participantes: [], estado: {} };
      entrarCanalSala(data.codigo).then(ok => {
        if (ok) {
          atualizarModalSala();
          if (data.host) toast(`Sala <b>${data.codigo}</b> restaurada (host).`);
          else toast(`Conectado à sala <b>${data.codigo}</b>.`);
        }
      });
    }
  }

  function atualizarModalSala() {
    if (!el.modalSala || !salaAtiva) return;
    const criarEntrar = $('#sala-criar-entrar');
    const ativa = $('#sala-ativa');
    if (criarEntrar) criarEntrar.classList.add('hidden');
    if (ativa) ativa.classList.remove('hidden');
    
    const codigoEl = $('#sala-codigo');
    if (codigoEl) codigoEl.textContent = salaAtiva.codigo;
    
    const statusEl = $('#sala-status');
    if (statusEl) {
      statusEl.innerHTML = salaAtiva.host
        ? '<span class="msi" style="font-size:16px;color:var(--success)">radio_button_checked</span> Você é o <b>host</b> — controla a sala'
        : '<span class="msi" style="font-size:16px;color:var(--text-secondary)">person</span> Participante — o host controla';
    }
    
    const partEl = $('#sala-participantes');
    if (partEl) {
      partEl.innerHTML = salaAtiva.participantes.map(p => `
        <div class="sala-participante">
          <span class="msi">${p.host ? 'radio_button_checked' : 'person'}</span>
          <span>${escapeHtml(p.nome)}${p.id === salaMeuId ? ' (você)' : ''}</span>
        </div>
      `).join('');
    }
  }

  // ============ REFERÊNCIA YOUTUBE / SPOTIFY (15) ============
  // Sidebar no player com embed do vídeo/faixa
  // Marcadores de sync: tempo do vídeo ↔ estrofe da letra

  function abrirSidebarReferencia() {
    if (!musicaAtual) return;
    refSidebarAberta = true;
    el.refSidebar.classList.remove('hidden');
    el.refSidebar.classList.remove('ref-fechada');
    el.refSidebar.inert = false;
    carregarReferencia();
  }

  // Fecha (minimiza) o painel SEM derrubar o vídeo: ele sai da tela com
  // transform e continua renderizado, então áudio, relógio e sync seguem
  // rodando — a letra continua acompanhando a música atrás do painel fechado.
  // Deixou de valer: desligar sync, parar o poll e recarregar o iframe.
  // Pra PARAR de verdade é pararReferencia() (trocar de letra / sair do player)
  // ou dar pause no próprio player reabrindo o painel.
  function fecharSidebarReferencia() {
    refSidebarAberta = false;
    if (el.refSidebar) {
      el.refSidebar.classList.remove('hidden');
      el.refSidebar.classList.add('ref-fechada');
      // fora de foco/leitores de tela enquanto minimizado
      el.refSidebar.inert = true;
    }
  }

  // Para TUDO da referência de vez — vídeo, sync e poll.
  // Usado ao trocar de letra e ao sair do player (aí sim o áudio tem que morrer).
  function pararReferencia() {
    refSidebarAberta = false;
    definirRefSync(false, true);
    pararRefPoll();
    refTempoVideo = 0;
    refTempoRecebidoEm = 0;
    refVideoTocando = false;
    refSyncMarkers = [];
    if (el.refSidebar) {
      el.refSidebar.classList.add('hidden');
      el.refSidebar.classList.remove('ref-fechada');
      el.refSidebar.inert = false;
    }
    if (el.refIframe) {
      el.refIframe.src = '';
      el.refIframe.classList.add('hidden');
    }
    renderizarMarcadores();
  }

  function carregarReferencia() {
    if (!musicaAtual) return;
    const link = musicaAtual.link_referencia || '';
    el.refLink.value = link;
    const embedUrl = urlParaEmbed(link);

    // Só (re)carrega o iframe se o embed mudou. Reabrir o painel com o MESMO
    // link tem que deixar o vídeo onde parou — recarregar mataria o áudio e
    // zeraria o relógio do sync.
    const srcAtual = el.refIframe.getAttribute('src') || '';
    const mudou = srcAtual !== (embedUrl || '');

    if (embedUrl) {
      // ⚠️ .hidden é `display:none !important` — só mexer no style.display NÃO
      // mostra o iframe. Tem que remover a CLASSE. (bug: o vídeo nunca aparecia)
      el.refIframe.classList.remove('hidden');
      if (mudou) {
        // Reseta o relógio do vídeo — senão o tempo da música anterior vaza
        refTempoVideo = 0;
        refTempoRecebidoEm = 0;
        refVideoTocando = false;
        // Sem mandar "listening" o YouTube não começa a emitir infoDelivery —
        // e sem infoDelivery não chega currentTime, ou seja, nada de sync.
        el.refIframe.onload = () => {
          try {
            el.refIframe.contentWindow.postMessage('{"event":"listening","id":"ml"}', '*');
          } catch {}
          pedirTempoVideo();
        };
        el.refIframe.src = embedUrl;
      } else {
        // Mesmo vídeo de antes (reabriu o painel) → só re-sincroniza o tempo
        pedirTempoVideo();
      }
      refSyncMarkers = Array.isArray(musicaAtual.ref_markers)
        ? musicaAtual.ref_markers.slice()
        : [];
      renderizarMarcadores();
      iniciarRefPoll();
    } else {
      el.refIframe.classList.add('hidden');
      el.refIframe.src = '';
      refSyncMarkers = [];
      renderizarMarcadores();
      pararRefPoll();
    }
    atualizarBotaoSync();
  }

  async function salvarReferencia() {
    if (!musicaAtual) return;
    const link = el.refLink.value.trim();
    const linkMudou = (musicaAtual.link_referencia || '') !== link;
    musicaAtual.link_referencia = link || null;
    musicaAtual.ref_markers = refSyncMarkers;
    
    // Salva local
    salvar();
    render();
    
    // Sobe pra nuvem se possível
    if (usandoSupabase && supabase) {
      // O supabase-js NÃO lança exceção em erro de query — ele devolve {error}.
      // Por isso o try/catch antigo nunca pegava nada e o toast de sucesso mentia.
      const { error } = await supabase.from('letras')
        .update({ link_referencia: link || null, ref_markers: refSyncMarkers })
        .eq('id', musicaAtual.id);
      if (error) toast('Salvo local — nuvem falhou.', 'error');
      else toast('Referência salva!');
    } else {
      toast('Referência salva (local)!');
    }
    // Só recarrega o iframe se o link mudou — senão o vídeo reinicia à toa
    if (linkMudou) carregarReferencia();
  }

  // Salva só os marcadores, sem tocar no iframe (senão o vídeo reinicia a cada marca)
  async function salvarMarcadores() {
    if (!musicaAtual) return;
    musicaAtual.ref_markers = refSyncMarkers;
    salvar();
    if (usandoSupabase && supabase && musicaAtual.id) {
      try {
        const { error } = await supabase.from('letras')
          .update({ ref_markers: refSyncMarkers })
          .eq('id', musicaAtual.id);
        // Sem toast aqui: um aviso por marcador encheria o saco. Detalhe vai pro console.
        if (error) console.warn('Marcadores: nuvem recusou —', error.message);
      } catch (e) {
        console.warn('Marcadores: nuvem falhou —', e);
      }
    }
  }

  // ============ MARCAÇÃO & SYNC (refazido em 2026-10-06) ============
  // Antes o botão "Marcar" tava ligado no toggleRefSync (por isso virava
  // "Sync ON" e depois "Sync OFF"), a função marcarTempoAtual era código morto
  // e o sync mandava seekTo NO VÍDEO (invertido). Agora:
  //   Marcar  = cria um marcador (tempo do vídeo ↔ estrofe visível)
  //   Sync    = a letra acompanha o vídeo, interpolando entre os marcadores

  // Tempo do vídeo "agora": o último tempo recebido + o que decorreu desde então.
  // Sem isso todo marcador sairia com até 1s de atraso (infoDelivery vem 1x/s).
  function tempoEstimadoVideo() {
    if (!refTempoRecebidoEm) return 0;
    const decorrido = (Date.now() - refTempoRecebidoEm) / 1000;
    // Parou de reportar há >2s → trava o tempo (senão ele fugia sozinho)
    if (decorrido > 2) return refTempoVideo;
    return refTempoVideo + (refVideoTocando ? decorrido : 0);
  }

  function pedirTempoVideo() {
    if (!el.refIframe || !el.refIframe.contentWindow || !el.refIframe.src) return;
    try {
      el.refIframe.contentWindow.postMessage('{"event":"command","func":"getCurrentTime","args":[]}', '*');
    } catch {}
  }

  // Poll do tempo do vídeo — UM timer só. O antigo agendava um setTimeout novo
  // a cada ligada do sync e deixava vários polls rodando em paralelo.
  function iniciarRefPoll() {
    pararRefPoll();
    // O poll anda enquanto HOUVER vídeo carregado — mesmo com o painel
    // minimizado (fechar não mata mais o sync, então o tempo tem que chegar)
    if (!el.refIframe || !el.refIframe.getAttribute('src')) return;
    refSyncTimer = setInterval(() => {
      if (!el.refIframe || !el.refIframe.getAttribute('src')) {
        pararRefPoll();
        return;
      }
      pedirTempoVideo();
    }, 1000);
    pedirTempoVideo();
  }

  function pararRefPoll() {
    if (refSyncTimer) {
      clearInterval(refSyncTimer);
      refSyncTimer = null;
    }
  }

  // Recebe o tempo do YouTube. infoDelivery vem ~1x/s com enablejsapi=1
  // (o "listening" no onload do iframe é o que faz ele começar a mandar).
  window.addEventListener('message', e => {
    if (!e.data) return;
    let data;
    try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    if (!data || typeof data !== 'object') return;

    let novoTempo = null;
    if (data.info && typeof data.info.currentTime === 'number') novoTempo = data.info.currentTime;
    else if (data.event === 'commandResult' && typeof data.info === 'number') novoTempo = data.info;
    if (novoTempo === null) return;

    // Tempo parou de andar = vídeo pausado → aí não extrapolamos o relógio
    refVideoTocando = novoTempo > refTempoVideo + 0.05;
    refTempoVideo = novoTempo;
    refTempoRecebidoEm = Date.now();
  });

  // Qual estrofe está na "área de leitura" AGORA (linha de leitura = 40% da altura)
  function estrofeVisivelAgora() {
    if (modo !== 'auto') return atual;
    const scroller = $('#auto-scroll');
    if (!scroller || !estrofes.length) return atual;
    const nos = scroller.querySelectorAll('.lyric-text .estrofe, .lyric-text .cifra-estrofe');
    if (!nos.length) return Math.max(0, Math.min(estrofes.length - 1, atual));
    const linhaLeitura = scroller.getBoundingClientRect().top + scroller.clientHeight * 0.4;
    let idx = 0;
    nos.forEach((n, i) => {
      if (n.getBoundingClientRect().top <= linhaLeitura) idx = i;
    });
    return Math.max(0, Math.min(estrofes.length - 1, idx));
  }

  // Só o YouTube fala a língua do infoDelivery. O embed do Spotify é uma
  // ilha fechada — não responde postMessage, então não tem como marcar/syncar.
  function refEhYouTube() {
    const link = (el.refLink && el.refLink.value) || (musicaAtual && musicaAtual.link_referencia) || '';
    return !!extrairYouTubeId(link);
  }

  // Aperta "Marcar": congela a estrofe visível no clique + o tempo do vídeo
  // naquele instante. Sem depender de resposta assíncrona que nunca chegava.
  function marcarTempoAtual() {
    if (!musicaAtual) return;
    if (!el.refIframe || !el.refIframe.src || el.refIframe.classList.contains('hidden')) {
      toast('Salve um link do vídeo primeiro.', 'error');
      return;
    }
    if (!refEhYouTube()) {
      toast('Marcação e sync só funcionam com link do YouTube.', 'error');
      return;
    }
    if (!refTempoRecebidoEm) {
      pedirTempoVideo();
      toast('O vídeo ainda não reportou o tempo — dê play nele e aperte Marcar de novo.', 'error');
      return;
    }
    adicionarMarcador(Math.round(tempoEstimadoVideo()), estrofeVisivelAgora());
  }

  function adicionarMarcador(tempo, estrofeIdx) {
    if (!musicaAtual) return;
    tempo = Math.max(0, Math.round(tempo));
    estrofeIdx = Math.max(0, Math.min(estrofes.length - 1, estrofeIdx));

    // Dedup o mais miúdo possível (ajuste do Vitor em 2026-10-07, depois de
    // testar em música RÁPIDA de verdade — qualquer janela de segundos perdia
    // marcador quando a mesma estrofe voltava logo em seguida):
    //   - MESMO segundo E mesma estrofe → correção (clique duplo no instante);
    //   - qualquer outra coisa → marcador NOVO. Vale mais duplicar do que
    //     perder: marcador duplicado é inofensivo (mesmo tempo = mesmo scroll)
    //     e dá pra apagar na lista; marcador perdido não volta.
    //     Isso cobre também a repetição da estrofe: a interpolação do scroll
    //     leva a letra DE VOLTA pro ponto da letra onde ela está escrita.
    const existente = refSyncMarkers.find(
      m => m.estrofe === estrofeIdx && m.tempo === tempo
    );
    if (existente) {
      existente.tempo = tempo;
      existente.estrofe = estrofeIdx;
      refSyncMarkers.sort((a, b) => a.tempo - b.tempo);
      renderizarMarcadores();
      salvarMarcadores();
      toast(`Marcador corrigido → ${formatarTempo(tempo)} (estrofe ${estrofeIdx + 1})`);
      return;
    }
    refSyncMarkers.push({ tempo, estrofe: estrofeIdx });
    refSyncMarkers.sort((a, b) => a.tempo - b.tempo);
    renderizarMarcadores();
    salvarMarcadores();
    toast(`Marcado: ${formatarTempo(tempo)} → estrofe ${estrofeIdx + 1}`);
  }

  function removerMarcador(index) {
    refSyncMarkers.splice(index, 1);
    renderizarMarcadores();
    salvarMarcadores();
  }

  function renderizarMarcadores() {
    if (!el.refMarkers) return;
    if (refSyncMarkers.length === 0) {
      el.refMarkers.innerHTML = '<p class="hint" style="text-align:center;padding:1rem">Nenhum marcador ainda. Toque a música e aperte "Marcar" nos momentos certos.</p>';
      return;
    }
    el.refMarkers.innerHTML = refSyncMarkers.map((m, i) => `
      <div class="ref-marker">
        <span class="ref-tempo">${formatarTempo(m.tempo)}</span>
        <span class="ref-estrofe">→ estrofe ${m.estrofe + 1}</span>
        <button class="btn btn-ghost btn-sm" data-remover="${i}" aria-label="Remover"><span class="msi">delete</span></button>
      </div>
    `).join('');
    el.refMarkers.querySelectorAll('[data-remover]').forEach(btn => {
      btn.onclick = () => removerMarcador(Number(btn.dataset.remover));
    });
  }

  function toggleRefSync() {
    definirRefSync(!refSyncAtivo);
  }

  // ativo=false, silencioso=true → só reseta o estado (usado ao fechar a sidebar)
  function definirRefSync(ativo, silencioso = false) {
    if (ativo && !refSyncMarkers.length) {
      if (!silencioso) toast('Marca pelo menos um tempo antes de ligar o sync.', 'error');
      return;
    }
    if (ativo && !refEhYouTube()) {
      if (!silencioso) toast('Sync só funciona com link do YouTube.', 'error');
      return;
    }
    if (ativo && !refTempoRecebidoEm) {
      // Sem tempo do vídeo o scroll iria pra posição do tempo 0 e travaria a
      // letra na primeira estrofe — melhor recusar e pedir play no vídeo.
      if (!silencioso) toast('Dê play no vídeo antes de ligar o sync.', 'error');
      pedirTempoVideo();
      return;
    }
    refSyncAtivo = ativo;
    atualizarBotaoSync();
    if (ativo) {
      toast('Sync ligado — a letra segue o vídeo.');
      // No manual quem anda é o tick de 250ms; no automático é o timer do scroll
      iniciarSyncTick();
      tickSyncManual(); // aplica na hora, sem esperar o primeiro tique
      // Com sync, o scroll é dito pelo vídeo — começa a letra se ela tiver parada
      if (modo === 'auto' && !rolando) iniciarAuto();
    } else {
      pararSyncTick();
      if (!silencioso) toast('Sync desligado.');
    }
  }

  function atualizarBotaoSync() {
    if (!el.refSync) return;
    el.refSync.classList.toggle('active', refSyncAtivo);
    el.refSync.textContent = refSyncAtivo ? 'Sync ON' : 'Sync OFF';
    el.refSync.setAttribute('aria-pressed', String(refSyncAtivo));
  }

  // Scroll exato onde a letra deveria estar para um certo tempo do vídeo.
  // Interpola entre os dois marcadores que cercam o tempo → rolagem contínua,
  // sem aquele salto seco de estrofe em estrofe.
  function scrollAlvoPorTempo(tempo) {
    if (!refSyncMarkers.length) return null;
    // Nunca chegou tempo do vídeo → não dá pra saber onde a letra deve estar.
    // Devolve null e deixa o auto-scroll andar normal (em vez de travar no 0:00).
    if (!refTempoRecebidoEm) return null;
    const scroller = $('#auto-scroll');
    if (!scroller) return null;
    const nos = scroller.querySelectorAll('.lyric-text .estrofe, .lyric-text .cifra-estrofe');
    if (!nos.length) return null;

    // Posição (dentro do conteúdo rolável) do topo de uma estrofe
    const posEstrofe = idx => {
      const no = nos[Math.max(0, Math.min(nos.length - 1, idx))];
      if (!no) return null;
      const yConteudo = scroller.scrollTop + (no.getBoundingClientRect().top - scroller.getBoundingClientRect().top);
      // Linha de leitura fica em 40% da altura — é onde a estrofe deve pousar
      return Math.max(0, yConteudo - scroller.clientHeight * 0.4);
    };

    const ms = refSyncMarkers;
    // Antes do primeiro marcador: letra fica onde o primeiro marcador aponta
    if (tempo <= ms[0].tempo) return posEstrofe(ms[0].estrofe);
    // Depois do último: devolve null → deixa o auto-scroll rolar no ritmo dele
    if (tempo >= ms[ms.length - 1].tempo) return null;

    for (let i = 0; i < ms.length - 1; i++) {
      const a = ms[i], b = ms[i + 1];
      if (tempo >= a.tempo && tempo <= b.tempo) {
        const pa = posEstrofe(a.estrofe), pb = posEstrofe(b.estrofe);
        if (pa === null || pb === null) return null;
        const p = b.tempo === a.tempo ? 0 : (tempo - a.tempo) / (b.tempo - a.tempo);
        return pa + (pb - pa) * p;
      }
    }
    return null;
  }

  // ============ SYNC NO MODO MANUAL ============
  // O modo manual não tem timer nem scroll — a estrofe troca por `atual` +
  // mostrarEstrofe(). Sem este tick o botão ligava e não fazia nada
  // (reportado pelo Vitor em 2026-10-06: "testei só no modo manual").
  function tickSyncManual() {
    if (!refSyncAtivo || modo !== 'manual' || !musicaAtual || !refSyncMarkers.length) return;
    if (animOut) return; // deixa a animação de troca de estrofe terminar

    const tempo = tempoEstimadoVideo();
    // Marcador mais recente que já passou = estrofe que deve estar na tela
    let alvo = refSyncMarkers[0].estrofe;
    for (const m of refSyncMarkers) {
      if (m.tempo <= tempo) alvo = m.estrofe;
    }
    alvo = Math.max(0, Math.min(estrofes.length - 1, alvo));
    if (alvo === atual) return;

    atual = alvo;
    // No modo cifra a letra inteira fica na tela (renderManual), então ali só
    // o contador anda — mostrarEstrofe() ali apagaria a cifra.
    if (cifraAtivo) atualizarProgressoManual();
    else mostrarEstrofe();
  }

  // Roda enquanto o sync está ligado (250ms — troca de estrofe não precisa de
  // mais que isso, e é barata: os returns cedo cobrem a maior parte dos ticks)
  function iniciarSyncTick() {
    pararSyncTick();
    refSyncTickTimer = setInterval(tickSyncManual, 250);
  }

  function pararSyncTick() {
    if (refSyncTickTimer) {
      clearInterval(refSyncTickTimer);
      refSyncTickTimer = null;
    }
  }

  // ============ EXPORTAR PDF (32) ============
  // jsPDF (aprovado pelo Vitor em 2026-10-05) — carregado só quando pede o PDF,
  // pra não pesar na abertura do site.
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

  function carregarJSPDF() {
    return new Promise(resolve => {
      if (window.jspdf && window.jspdf.jsPDF) { resolve(window.jspdf.jsPDF); return; }
      const s = document.createElement('script');
      s.src = JSPDF_URL;
      s.onload = () => resolve(window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }

  // Remove caracteres que não podem ir no nome de um arquivo
  function nomeArquivoSeguro(s) {
    return String(s || '')
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'letra';
  }

  async function exportarPDF(id) {
    const l = letras.find(x => x.id === id);
    if (!l) return;
    toast('Gerando PDF…');
    const JS = await carregarJSPDF();
    if (!JS) { toast('Não deu pra carregar o gerador de PDF. Confira a internet.', 'error'); return; }

    try {
      const doc = new JS();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const m = 18;                       // margem em mm
      const larguraUtil = pageW - m * 2;
      let y = m;

      // --- Título ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(15);
      const titulo = doc.splitTextToSize(l.titulo, larguraUtil);
      doc.text(titulo, m, y);
      y += titulo.length * 8.5;

      // --- Artista ---
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(95);
      const artista = doc.splitTextToSize(l.artista || '', larguraUtil);
      doc.text(artista, m, y);
      y += artista.length * 6 + 5;

      // --- Linha separadora ---
      doc.setDrawColor(205);
      doc.setLineWidth(0.4);
      doc.line(m, y, pageW - m, y);
      y += 10;

      // --- Letra inteira (quebra linha longa e quebra página no fim) ---
      doc.setTextColor(25);
      doc.setFontSize(11);
      const linhas = [];
      String(l.letra || '').split('\n').forEach(linha => {
        if (linha.trim() === '') { linhas.push(''); return; }
        doc.splitTextToSize(linha, larguraUtil).forEach(t => linhas.push(t));
      });
      const altLinha = 5.7;
      for (const linha of linhas) {
        if (y + altLinha > pageH - m) { doc.addPage(); y = m; }
        doc.text(linha, m, y);
        y += altLinha;
      }

      // --- Rodapé com página ---
      const total = doc.internal.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFontSize(9);
        doc.setTextColor(145);
        doc.text('Minhas Letras', m, pageH - 10);
        doc.text(`${p} / ${total}`, pageW - m, pageH - 10, { align: 'right' });
      }

      const nome = `${nomeArquivoSeguro(l.titulo)}${l.artista ? ' - ' + nomeArquivoSeguro(l.artista) : ''}.pdf`;
      doc.save(nome);
      toast('PDF baixado!');
    } catch (err) {
      toast('Erro ao gerar o PDF: ' + (err && err.message ? err.message : err), 'error');
    }
  }

  // ============ HISTÓRICO DE ACESSOS (28) — nuvem ============
  function descreverAparelho() {
    const ua = navigator.userAgent;
    let os = 'Sistema desconhecido';
    if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
    else if (/Windows/.test(ua)) os = 'Windows';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
    else if (/Mac OS X/.test(ua)) os = 'macOS';
    else if (/Linux/.test(ua)) os = 'Linux';

    let nav = 'Navegador desconhecido';
    if (/Edg\//.test(ua)) nav = 'Edge';
    else if (/OPR\/|Opera/.test(ua)) nav = 'Opera';
    else if (/Firefox\//.test(ua)) nav = 'Firefox';
    else if (/Chrome\//.test(ua)) nav = 'Chrome';
    else if (/Safari\//.test(ua)) nav = 'Safari';

    return os + ' · ' + nav;
  }

  // Guarda sempre no aparelho (rede de segurança) e tenta subir pra nuvem.
  function guardarAcessoLocal(aparelho) {
    const lista = storageGet(LS_ACESSOS_LOCAL, []);
    lista.unshift({ em: Date.now(), aparelho });
    storageSet(LS_ACESSOS_LOCAL, lista.slice(0, 30));
  }

  async function registrarAcesso() {
    const aparelho = descreverAparelho();
    // Mesmo aparelho há menos de 30 min = o mesmo acesso (F5 não vira novo registro)
    const anterior = storageGet(LS_ULTIMO_ACESSO, null);
    const agora = Date.now();
    if (anterior && anterior.aparelho === aparelho && (agora - anterior.em) < 30 * 60 * 1000) return;
    storageSet(LS_ULTIMO_ACESSO, { aparelho, em: agora });

    guardarAcessoLocal(aparelho);

    if (usandoSupabase && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Pode dar erro se a tabela "acessos" ainda não existir — aí fica só o local
          await supabase.from('acessos').insert({ user_id: user.id, aparelho });
        }
      } catch {}
    }
  }

  function formatarData(iso) {
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return String(iso); }
  }

  async function abrirHistoricoAcessos() {
    el.acessosLista.innerHTML = '<p class="acessos-vazio">Carregando…</p>';
    el.acessosSub.textContent = 'Últimos logins com data e aparelho.';
    el.modalAcessos.classList.remove('hidden');

    let itens = [];
    let nuvemOk = false;
    if (usandoSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from('acessos')
          .select('criado_em, aparelho')
          .order('criado_em', { ascending: false })
          .limit(20);
        if (!error && Array.isArray(data)) { itens = data; nuvemOk = true; }
      } catch {}
    }

    if (!nuvemOk) {
      itens = storageGet(LS_ACESSOS_LOCAL, [])
        .map(a => ({ criado_em: new Date(a.em).toISOString(), aparelho: a.aparelho }));
      el.acessosSub.textContent = 'Nuvem indisponível — mostrando os acessos guardados neste aparelho.';
    }

    if (itens.length === 0) {
      el.acessosLista.innerHTML = '<p class="acessos-vazio">Nenhum acesso registrado ainda.</p>';
      return;
    }

    el.acessosLista.innerHTML = itens.map(a => `
      <div class="acessos-item">
        <span class="msi acessos-ico">history</span>
        <span class="acessos-info">
          <b>${escapeHtml(formatarData(a.criado_em))}</b>
          <small>${escapeHtml(a.aparelho || 'Aparelho desconhecido')}</small>
        </span>
      </div>`).join('');
  }

  // ============ 2ª TELA / TV (7) ============
  // O player (aba de controle) manda o estado por BroadcastChannel e a
  // tv.html desenha a letra grande em outra janela — sem servidor nenhum.
  let canalTV = null;
  let tvAtivo = false; // 2ª tela aberta NESTA máquina (BroadcastChannel)
  let tvRemotaAtiva = false; // 2ª tela aberta NOUTRO aparelho (ping recente)
  let tvRemotaTimer = null;
  let canalNuvemTV = null;
  let uidTV = null; // dono da conta — nomeia o canal da nuvem

  function tvCanal() {
    if (canalTV) return canalTV;
    if (typeof BroadcastChannel === 'undefined') return null;
    try { canalTV = new BroadcastChannel(CANAL_TV); } catch { canalTV = null; }
    return canalTV;
  }

  // ---- TV pela NUVEM (entre aparelhos) ----
  // Mesma ideia do BroadcastChannel, mas via Supabase Realtime broadcast:
  // nada é gravado no banco — só passa a mensagem de um aparelho pro outro.
  // O canal se chama "tv-<seu user id>", então só a SUA conta encontra ele.
  function tvNuvemCanal() {
    if (canalNuvemTV !== null) return canalNuvemTV;
    if (!supabase || !uidTV) return null;
    try {
      const c = supabase.channel('tv-' + uidTV, { config: { broadcast: { self: false } } });
      c.on('broadcast', { event: 'ping' }, () => {
        // Uma TV de longe pediu sinal → fica "ativo" por 9s (ping a cada 3s)
        tvRemotaAtiva = true;
        clearTimeout(tvRemotaTimer);
        tvRemotaTimer = setTimeout(() => { tvRemotaAtiva = false; }, 9000);
        tvEstado('estado'); // responde na hora, sem esperar o tique dos 200ms
      });
      c.on('broadcast', { event: 'comando' }, ev => executarComandoTV(ev.payload || {}));
      c.subscribe();
      canalNuvemTV = c;
    } catch { canalNuvemTV = null; }
    return canalNuvemTV;
  }

  function desligarTVNuvem() {
    tvRemotaAtiva = false;
    clearTimeout(tvRemotaTimer);
    if (canalNuvemTV) { try { if (supabase) supabase.removeChannel(canalNuvemTV); } catch {} }
    canalNuvemTV = null;
  }

  // Comando que veio da 2ª tela (controle remoto): ela manda, ESTE aparelho executa.
  function executarComandoTV(d) {
    if (!musicaAtual || el.viewPlayer.classList.contains('hidden')) return;
    if (d.acao === 'avancar') { if (modo === 'manual') avancar(); }
    else if (d.acao === 'voltar') { if (modo === 'manual') voltarEstrofe(); }
    else if (d.acao === 'pausar') { if (modo === 'auto') toggleAuto(); }
    else if (d.acao === 'modo' && (d.valor === 'auto' || d.valor === 'manual')) setModo(d.valor);
  }

  // Envia um payload pra TODA 2ª tela ligada (local e/ou de longe).
  // O ts éEssencial: o mesmo payload sai pelos DOIS canais (local ~0ms,
  // nuvem 100-500ms). Sem ordem, a cópia atrasada chegava por cima da nova e a
  // letra PISCABA (rolagem ia pra trás e voltava). A 2ª tela descarta ts velho.
  // Date.now() (relógio de parede) não zera se o player recarregar — por isso
  // não usei contador sequencial: ele voltaria a 0 e travaria a TV.
  function enviarTV(payload) {
    payload.ts = Date.now();
    if (tvAtivo) { const c = tvCanal(); if (c) { try { c.postMessage(payload); } catch {} } }
    if (tvRemotaAtiva) {
      const n = tvNuvemCanal();
      if (n) { try { n.send({ type: 'broadcast', event: 'estado', payload }); } catch {} }
    }
  }

  function tvEstado(tipo) {
    if (!musicaAtual) return;
    if (!tvAtivo && !tvRemotaAtiva) return;
    const sc = $('#auto-scroll');
    // Manda a PROGRESSÃO (0..1), não os pixels: o texto na 2ª tela tem tamanho
    // e margens diferentes — pixels cruzados fariam as duas telas divergirem.
    let progresso = 0;
    if (sc) {
      const max = sc.scrollHeight - sc.clientHeight;
      progresso = max > 0 ? sc.scrollTop / max : 0;
    }
    enviarTV({
      t: tipo || 'estado',
      musica: {
        id: musicaAtual.id,
        titulo: musicaAtual.titulo,
        artista: musicaAtual.artista || '',
        letra: musicaAtual.letra
      },
      modo, cifraAtivo, transpose, atual,
      rolando,
      progresso: Math.max(0, Math.min(1, progresso)),
      scrollTop: sc ? sc.scrollTop : 0
    });
  }

  function abrirTelaTV() {
    const w = window.open('tv.html', 'minhas-letras-tv', 'width=1280,height=720');
    if (!w) {
      toast('O navegador bloqueou a janela nova. Libera pop-up e tenta de novo.', 'error');
      return;
    }
    // A tela nova manda "ola" ao abrir; aí a gente responde com o estado atual
    toast('2ª tela aberta — a letra vai aparecer na outra janela.');
  }

  // ---- Link pra abrir a 2ª tela NOUTRO aparelho ----
  // Em vez de senha, o link leva os tokens da sessão atual (mesma ideia do
  // "esqueci minha senha" do Supabase). Quem abrir o link entra na SUA conta
  // naquela tv.html — por isso o aviso de que é igual senha.
  const QR_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';

  function carregarQRLib() {
    return new Promise(resolve => {
      if (window.qrcode) { resolve(window.qrcode); return; }
      const s = document.createElement('script');
      s.src = QR_LIB_URL;
      s.onload = () => resolve(window.qrcode || null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }

  async function gerarQRCode(texto) {
    const area = $('#tv-qr-area');
    const canvas = $('#tv-qr-canvas');
    if (!area || !canvas) return;
    const QR = await carregarQRLib();
    if (!QR) { area.classList.add('hidden'); return; }
    try {
      // 'L' = correção de erro mínima (7%) → menos módulos → QR menor.
      // O link da TV é longo (token de ~940 chars), então isso encolhe bem.
      const qr = QR(0, 'L');
      qr.addData(texto);
      qr.make();
      // Desenha no canvas
      const n = qr.getModuleCount();
      const tam = canvas.width || 130;
      const celula = Math.floor(tam / n);
      const offset = Math.floor((tam - celula * n) / 2);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tam, tam);
      ctx.fillStyle = '#000000';
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (qr.isDark(r, c)) {
            ctx.fillRect(offset + c * celula, offset + r * celula, celula, celula);
          }
        }
      }
      area.classList.remove('hidden');
    } catch {
      area.classList.add('hidden');
    }
  }

  function abrirModalTV() {
    if (!el.modalTv) { abrirTelaTV(); return; }
    el.modalTv.classList.remove('hidden');
    gerarLinkTV();
  }

  async function gerarLinkTV() {
    if (!el.tvLink) return;
    el.tvLink.value = 'gerando link…';
    try {
      if (!supabase) { el.tvLink.value = 'sem conexão — tenta de novo'; return; }
      const { data } = await supabase.auth.getSession();
      const s = data && data.session;
      if (!s) { el.tvLink.value = 'faça login de novo'; return; }
      const base = location.href.replace(/[^/]*$/, '');
      const link = base + 'tv.html#access_token=' + encodeURIComponent(s.access_token)
                 + '&refresh_token=' + encodeURIComponent(s.refresh_token);
      el.tvLink.value = link;
      const host = location.hostname;
      const local = location.protocol === 'file:' || host === 'localhost'
                  || host === '127.0.0.1' || /^192\.168\./.test(host) || /^10\./.test(host);
      if (el.tvAvisoHost) el.tvAvisoHost.style.display = local ? '' : 'none';
      if (el.tvCampoLink) el.tvCampoLink.style.display = '';
      if (el.btnTvCopiar) el.btnTvCopiar.style.display = '';
      // Gera QR code do link
      gerarQRCode(link);
      // deixa já selecionado: dá pra Ctrl+C direto
      setTimeout(() => { try { el.tvLink.select(); } catch {} }, 50);
    } catch { el.tvLink.value = 'não consegui gerar o link'; }
  }

  async function copiarLinkTV() {
    const v = el.tvLink ? el.tvLink.value : '';
    if (!v || /^gerando|^faça|^sem |^não/.test(v)) return;
    try {
      await navigator.clipboard.writeText(v);
      toast('Link copiado! Abre ele no outro aparelho.', 'success');
    } catch {
      try { el.tvLink.focus(); el.tvLink.select(); } catch {}
      toast('Não deu pra copiar — o link tá selecionado, dá Ctrl+C.', 'error');
    }
  }

  (function setupCanalTV() {
    const c = tvCanal();
    if (c) {
      c.onmessage = ev => {
        const d = ev.data || {};
        if (d.t === 'ola') { tvAtivo = true; tvEstado('musica'); }
        if (d.t === 'tchau') { tvAtivo = false; }
        if (d.t === 'comando') executarComandoTV(d); // controle remoto da 2ª tela
      };
    }
    // Espelho do player pra 2ª tela: estado novo a cada 200ms (rolagem inclusa).
    // Liga tanto pra TV local quanto pra TV de outro aparelho.
    //
    // O "fechar" sai UMA vez, só na transição aberto→fechado. Antes ele era
    // disparado a cada tique (5x/s) enquanto não havia letra — aí, se qualquer
    // outra aba do Minhas Letras estivesse aberta sem player (BroadcastChannel
    // é compartilhado entre abas), ela brigava com a aba que TINHA letra:
    // "estado" e "fechar" se alternando = a 2ª tela entrava e saía da tela de
    // espera em loop. Era o piscar. Começa já como "fechado" pra não mandar
    // um fechar solto quando a 2ª tela conectar sem player nenhum.
    let tvFechadoEnviado = true;
    setInterval(() => {
      if (!tvAtivo && !tvRemotaAtiva) return;
      const aberto = !!musicaAtual && !el.viewPlayer.classList.contains('hidden');
      if (!aberto) {
        if (!tvFechadoEnviado) {
          tvFechadoEnviado = true;
          enviarTV({ t: 'fechar' });
        }
        return;
      }
      tvFechadoEnviado = false;
      tvEstado('estado');
    }, 200);
  })();

  // ============ ARRASTAR PRA REORDENAR (18) ============
  let idArrastando = null;

  function reordenar(idOrigem, idAlvo, antes) {
    // Base = a ordem já salva (mantém as letras que não estão visíveis agora),
    // + quem apareceu na tela e ainda não foi arranjado.
    const visiveis = [...el.grid.querySelectorAll('.card')]
      .map(c => Number(c.dataset.cardId))
      .filter(Number.isFinite);
    let ordem = getOrdemManual();
    const faltando = visiveis.filter(id => !ordem.includes(id));
    ordem = ordem.concat(faltando);
    ordem = ordem.filter(id => id !== idOrigem);

    let pos = ordem.indexOf(idAlvo);
    if (pos === -1) pos = ordem.length;
    if (!antes) pos += 1;
    ordem.splice(pos, 0, idOrigem);
    salvarOrdemManual(ordem);
  }

  function setupArrasto() {
    el.grid.addEventListener('dragstart', e => {
      const card = e.target.closest && e.target.closest('.card[draggable="true"]');
      if (!card) return;
      idArrastando = Number(card.dataset.cardId);
      card.classList.add('arrastando');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(idArrastando));
      }
    });

    el.grid.addEventListener('dragend', () => {
      document.querySelectorAll('.card.arrastando').forEach(c => c.classList.remove('arrastando'));
      document.querySelectorAll('.card.antes').forEach(c => c.classList.remove('antes'));
      idArrastando = null;
    });

    el.grid.addEventListener('dragover', e => {
      if (idArrastando === null) return;
      e.preventDefault(); // sem isso o drop não acontece
      const card = e.target.closest && e.target.closest('.card');
      document.querySelectorAll('.card.antes').forEach(c => c.classList.remove('antes'));
      if (card && Number(card.dataset.cardId) !== idArrastando) card.classList.add('antes');
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    });

    el.grid.addEventListener('drop', e => {
      if (idArrastando === null) return;
      e.preventDefault();
      const card = e.target.closest && e.target.closest('.card');
      if (!card) return;
      const idAlvo = Number(card.dataset.cardId);
      const origem = idArrastando;
      idArrastando = null;
      if (!Number.isFinite(idAlvo) || idAlvo === origem) { render(); return; }
      reordenar(origem, idAlvo, card.classList.contains('antes'));
      render();
      toast('Ordem salva.');
    });
  }

  // ============ ORDENAÇÃO ============
  function getOrdemLabel(ordem) {
    const map = {
      'criado_em': 'Ordem de criação',
      'titulo_az': 'Título A–Z',
      'titulo_za': 'Título Z–A',
      'recente': 'Mais recentes',
      'antiga': 'Mais antigas',
      'estrofes_mais': 'Mais estrofes',
      'estrofes_menos': 'Menos estrofes'
    };
    return map[ordem] || ordem;
  }

  function ordenarLetras(lista, ordem) {
    const arr = [...lista];
    switch (ordem) {
      case 'titulo_az':
        arr.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt', { sensitivity: 'base' }));
        break;
      case 'titulo_za':
        arr.sort((a, b) => b.titulo.localeCompare(a.titulo, 'pt', { sensitivity: 'base' }));
        break;
      case 'recente':
        arr.sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0));
        break;
      case 'antiga':
        arr.sort((a, b) => new Date(a.criado_em || 0) - new Date(b.criado_em || 0));
        break;
      case 'estrofes_mais':
        arr.sort((a, b) => contarEstrofes(b.letra) - contarEstrofes(a.letra));
        break;
      case 'estrofes_menos':
        arr.sort((a, b) => contarEstrofes(a.letra) - contarEstrofes(b.letra));
        break;
      case 'criado_em':
      default:
        // mantém ordem original (já vem ordenada do Supabase ou localStorage)
        break;
    }
    return arr;
  }

  // ============ MINHA ORDEM (arrastável — 18) ============
  // Guarda a ordem que o usuário montou arrastando os cards (só os ids).
  function getOrdemManual() {
    const ids = storageGet(LS_ORDEM_MANUAL, []);
    return Array.isArray(ids) ? ids.filter(x => Number.isFinite(x)) : [];
  }

  function salvarOrdemManual(ids) { storageSet(LS_ORDEM_MANUAL, ids); }

  // Quem já foi arrastado fica na posição marcada; o resto mantém a ordem atual.
  function ordenarManual(lista) {
    const ordem = getOrdemManual();
    const pos = new Map(ordem.map((id, i) => [id, i]));
    return [...lista].sort((a, b) => {
      const pa = pos.has(a.id) ? pos.get(a.id) : Number.MAX_SAFE_INTEGER;
      const pb = pos.has(b.id) ? pos.get(b.id) : Number.MAX_SAFE_INTEGER;
      return pa - pb;
    });
  }

  // ============ RECENTS (histórico de cantadas) ============
  function addRecente(id) {
    if (!Number.isFinite(id)) return;
    let recents = storageGet(LS_RECENTS, []);
    recents = recents.filter(x => x !== id);
    recents.unshift(id);
    if (recents.length > 10) recents = recents.slice(0, 10);
    storageSet(LS_RECENTS, recents);
  }

  function getRecentes() {
    const recents = storageGet(LS_RECENTS, []);
    return recents.map(id => letras.find(l => l.id === id)).filter(Boolean);
  }

  // ============ TEMA CLARO/ESCURO ============
  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    storageSet(LS_TEMA, tema);
    const ico = el.btnTema?.querySelector('.msi');
    if (ico) ico.textContent = tema === 'light' ? 'dark_mode' : 'light_mode';
  }

  function initTema() {
    const salvo = storageGet(LS_TEMA, null);
    if (salvo) {
      aplicarTema(salvo);
    } else {
      // Respeita prefers-color-scheme
      const prefereClaro = window.matchMedia('(prefers-color-scheme: light)').matches;
      aplicarTema(prefereClaro ? 'light' : 'dark');
    }
    // Listener para mudança do sistema
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
      if (!storageGet(LS_TEMA, null)) {
        aplicarTema(e.matches ? 'light' : 'dark');
      }
    });
  }

  function alternarTema() {
    const atual = document.documentElement.getAttribute('data-theme') || 'dark';
    aplicarTema(atual === 'dark' ? 'light' : 'dark');
  }

  // ============ CIFRAS (parser + transposição) ============
  // Notas em ordem cromática
  const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NOTAS_BEMOL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  // Detecta se a linha é de acordes (contém padrões como [A], | G |, Cmaj7, etc.)
  function ehLinhaAcordes(linha) {
    const limpa = linha.trim();
    if (!limpa) return false;
    // Padrões: [A], [C#m], | G |, Am, Cmaj7, F#m7, etc.
    return /^[\|\s]*([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9])?(?:\/[A-G][#b]?)?\s*)+[\|\s]*$/.test(limpa) ||
           /^\[.*\]$/.test(limpa);
  }

  // Transpõe uma nota individual
  function transporNota(nota, semitons) {
    const idx = NOTAS.indexOf(nota);
    if (idx === -1) {
      const idxB = NOTAS_BEMOL.indexOf(nota);
      if (idxB === -1) return nota;
      return NOTAS_BEMOL[(idxB + semitons + 12) % 12];
    }
    return NOTAS[(idx + semitons + 12) % 12];
  }

  // Transpõe uma linha de acordes
  function transporLinhaAcordes(linha, semitons) {
    if (semitons === 0) return linha;
    // Substitui cada acorde encontrado
    return linha.replace(/\b([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9])?(?:\/[A-G][#b]?)?)\b/g, (match) => {
      // Separa base do acorde da extensão
      const m = match.match(/^([A-G][#b]?)(.*)$/);
      if (!m) return match;
      const base = m[1];
      const ext = m[2];
      const novaBase = transporNota(base, semitons);
      return novaBase + ext;
    });
  }

  // Parser principal: transforma letra bruta em HTML com acordes acima
  function parseCifra(letra, semitons = 0) {
    const linhas = letra.split('\n');
    const estrofesParsed = [];
    let estrofeAtual = [];

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      const proxLinha = linhas[i + 1];

      if (ehLinhaAcordes(linha)) {
        // Linha de acordes - guarda pra combinar com a próxima linha de letra
        estrofeAtual.push({ tipo: 'acordes', texto: transporLinhaAcordes(linha, semitons) });
      } else if (linha.trim() === '') {
        // Linha vazia = fim de estrofe
        if (estrofeAtual.length > 0) {
          estrofesParsed.push(estrofeAtual);
          estrofeAtual = [];
        }
      } else {
        // Linha de letra normal
        const acordesLinha = estrofeAtual.length > 0 && estrofeAtual[estrofeAtual.length - 1].tipo === 'acordes'
          ? estrofeAtual.pop().texto
          : null;
        estrofeAtual.push({ tipo: 'letra', texto: linha, acordes: acordesLinha });
      }
    }
    if (estrofeAtual.length > 0) estrofesParsed.push(estrofeAtual);

    // Gera HTML
    return estrofesParsed.map(estrofe => {
      const linhasHtml = estrofe.map(linha => {
        if (linha.tipo === 'letra') {
          if (linha.acordes && cifraAtivo) {
            return `<div class="cifra-linha">
              <div class="cifra-acordes">${escapeHtml(linha.acordes)}</div>
              <div class="cifra-letra">${escapeHtml(linha.texto)}</div>
            </div>`;
          }
          return `<div class="cifra-linha"><div class="cifra-letra">${escapeHtml(linha.texto)}</div></div>`;
        }
        // Acordes sem letra correspondente (raro)
        return `<div class="cifra-linha"><div class="cifra-acordes">${escapeHtml(linha.texto)}</div></div>`;
      }).join('');
      return `<div class="cifra-estrofe">${linhasHtml}</div>`;
    }).join('');
  }

  // ============ WAKE LOCK ============
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch (err) {
      console.warn('Wake Lock falhou:', err);
    }
  }

  function releaseWakeLock() {
    if (wakeLock) {
      wakeLock.release();
      wakeLock = null;
    }
  }

  function toast(msg, tipo = 'success') {
    const t = document.createElement('div');
    t.className = `toast ${tipo}`;
    t.innerHTML = `<span class="toast-ico msi">${tipo === 'success' ? 'check_circle' : 'cancel'}</span><span>${escapeHtml(msg)}</span>`;
    el.toastRegion.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.2s'; }, 3000);
    setTimeout(() => t.remove(), 3300);
  }

  function render() {
    const termoNorm = normalizarBusca(el.busca.value.trim());
    let lista = [...letras];
    let pontuados = null;

    // FILTRO POR TAG (feature nova) — antes da busca
    lista = filtrarPorTag(lista);

    // BUSCA FUZZY (22): pontua em vez de exigir "contém" — errar uma letra
    // ou pular espaço não esconde mais o resultado.
    if (termoNorm) {
      pontuados = [];
      for (const l of letras) {
        const p = pontuarLetra(l, termoNorm);
        if (p > 0) pontuados.push({ l, p });
      }
      lista = pontuados.map(x => x.l);
    }

    // Ordenação (18: "manual" = a ordem que o usuário arrastou)
    lista = ordemAtual === 'manual'
      ? ordenarManual(lista)
      : ordenarLetras(lista, ordemAtual);

    // Com termo na busca, o mais relevante vem primeiro.
    // Sort é estável: empates mantêm a ordem escolhida no seletor.
    if (pontuados) {
      const score = new Map(pontuados.map(x => [x.l.id, x.p]));
      lista.sort((a, b) => (score.get(b.id) || 0) - (score.get(a.id) || 0));
    }

    const arrastavel = ordemAtual === 'manual';

    // Atualiza barra de filtro de tags
    renderTagFilter();

    el.contador.textContent = letras.length === 0
      ? 'Nenhuma letra salva'
      : `${lista.length} de ${letras.length} música(s)`;

    // Badge do dock = total de letras (esconde se 0)
    const dockBadge = $('#dock-badge');
    if (dockBadge) {
      if (letras.length > 0) {
        dockBadge.textContent = letras.length > 99 ? '99+' : String(letras.length);
        dockBadge.classList.remove('hidden');
      } else {
        dockBadge.classList.add('hidden');
      }
    }

    if (letras.length === 0) {
      el.grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-ico msi">music_note</div>
          <h3>Caderno vazio</h3>
          <p>Toda história começa pela primeira letra. Cola aquela música que você vive cantando.</p>
          <button class="btn btn-primary" data-acao="nova"><span class="msi" style="font-size:17px">add</span> Adicionar primeira letra</button>
        </div>`;
      return;
    }

    if (lista.length === 0) {
      el.grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-ico msi">search</div>
          <h3>Nada encontrado</h3>
          <p>Nenhuma música corresponde à sua busca.</p>
          <button class="btn btn-ghost" data-acao="limpar-busca">Limpar busca</button>
        </div>`;
      return;
    }

    el.grid.innerHTML = lista.map(l => {
      const est = contarEstrofes(l.letra);
      const lin = contarLinhas(l.letra);
      const tagsHtml = (l.tags || []).length > 0
        ? `<div class="card-tags">${l.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
        : '';
      return `
        <div class="card"${arrastavel ? ' draggable="true"' : ''} data-card-id="${escapeHtml(l.id)}">
          <div class="card-title">${escapeHtml(l.titulo)}</div>
          <div class="card-artist">${escapeHtml(l.artista || '—')}</div>
          ${tagsHtml}
          <div class="card-meta">
            <span>${est} estrofe(s)</span>
            <span>·</span>
            <span>${lin} linha(s)</span>
          </div>
          <div class="card-actions">
            <button class="btn btn-success btn-cantar" data-acao="cantar" data-id="${escapeHtml(l.id)}"><span class="msi" style="font-size:17px">play_arrow</span> Cantar</button>
            <button class="btn btn-ghost btn-sm btn-fav${favoritos.has(String(l.id)) ? ' is-fav' : ''}" data-acao="favoritar" data-id="${escapeHtml(l.id)}" aria-label="Favoritar" title="${favoritos.has(String(l.id)) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">${favoritos.has(String(l.id)) ? '★' : '☆'}</button>
            <button class="btn btn-ghost btn-sm" data-acao="compartilhar" data-id="${escapeHtml(l.id)}" aria-label="Compartilhar" title="Compartilhar link público"><span class="msi" style="font-size:17px">share</span></button>
            <button class="btn btn-ghost btn-sm" data-acao="pdf" data-id="${escapeHtml(l.id)}" aria-label="Exportar PDF" title="Exportar PDF"><span class="msi" style="font-size:17px">picture_as_pdf</span></button>
            <button class="btn btn-ghost btn-sm" data-acao="editar" data-id="${escapeHtml(l.id)}" aria-label="Editar"><span class="msi" style="font-size:17px">edit</span></button>
            <button class="btn btn-ghost btn-sm" data-acao="excluir" data-id="${escapeHtml(l.id)}" aria-label="Excluir"><span class="msi" style="font-size:17px">delete</span></button>
          </div>
        </div>`;
    }).join('');
  }

  function abrirFormNovo() {
    editandoId = null;
    el.modalTitle.textContent = 'Nova letra';
    el.modalSub.textContent = 'Cola a letra aqui — o resto é com a gente.';
    el.btnSalvar.textContent = 'Salvar letra';
    el.formLetra.reset();
    if (el.iTags) el.iTags.value = '';
    if (el.iReferencia) el.iReferencia.value = '';
    limparErros();
    el.modalForm.classList.remove('hidden');
    el.iTitulo.focus();
  }

  function abrirFormEdicao(id) {
    const l = letras.find(x => x.id === id);
    if (!l) return;
    editandoId = id;
    el.modalTitle.textContent = 'Editar letra';
    el.modalSub.textContent = 'Altere o que quiser e salva.';
    el.btnSalvar.textContent = 'Salvar alterações';
    el.iTitulo.value = l.titulo;
    el.iArtista.value = l.artista || '';
    el.iLetra.value = l.letra;
    if (el.iTags) el.iTags.value = serializeTags(l.tags);
    if (el.iReferencia) el.iReferencia.value = l.link_referencia || '';
    limparErros();
    el.modalForm.classList.remove('hidden');
    el.iTitulo.focus();
  }

  function fecharForm() {
    el.modalForm.classList.add('hidden');
    editandoId = null;
  }

  function marcarErro(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) field.classList.add('invalid');
  }
  function limparErros() { $$('.field.invalid').forEach(x => x.classList.remove('invalid')); }

  async function salvarLetra(e) {
    e.preventDefault();
    const titulo = el.iTitulo.value.trim();
    const artista = el.iArtista.value.trim();
    const letra = el.iLetra.value.trim();
    const tags = parseTags(el.iTags?.value || '');
    const link_referencia = (el.iReferencia?.value || '').trim() || null;

    limparErros();
    let valido = true;
    if (!titulo) { marcarErro('f-titulo'); valido = false; }
    if (!letra) { marcarErro('f-letra'); valido = false; }
    if (!valido) return;

    // C2+C3+C4: fluxo único — toast de sucesso SÓ quando a nuvem aceitou;
    // fallback local SEMPRE com aviso honesto; sem "usandoSupabase=false" escondido.
    const podeNuvem = !!(usandoSupabase && supabase);

    if (editandoId === null) {
      // ---------- CRIAÇÃO ----------
      let salvoNuvem = false;
      let erroNuvem = null;
      if (podeNuvem) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const { data, error } = await supabase
            .from('letras')
            .insert({ user_id: user ? user.id : null, titulo, artista, letra, tags, link_referencia })
            .select();
          if (!error && Array.isArray(data) && data[0]) {
            letras.push(data[0]);
            salvoNuvem = true;
          } else {
            erroNuvem = (error && error.message) ? error.message : 'resposta vazia';
          }
        } catch {
          erroNuvem = 'falha de rede';
        }
      }
      if (salvoNuvem) {
        toast('Letra salva!');
      } else {
        letras.push({ id: gerarId(), titulo, artista, letra, tags, link_referencia, criado_em: new Date().toISOString() });
        if (erroNuvem !== null) {
          toast(`Nuvem falhou (${erroNuvem}) — letra salva SÓ neste aparelho.`, 'error');
        } else {
          toast('Letra salva só neste aparelho (nuvem indisponível).');
        }
      }
    } else {
      // ---------- EDIÇÃO ----------
      const idx = letras.findIndex(x => x.id === editandoId);
      if (idx !== -1) letras[idx] = { ...letras[idx], titulo, artista, letra, tags, link_referencia };
      if (podeNuvem) {
        try {
          const { data: atualizada, error } = await supabase
            .from('letras')
            .update({ titulo, artista, letra, tags, link_referencia })
            .eq('id', editandoId)
            .select();
          if (error) {
            toast(`Nuvem falhou (${error.message}) — alteração vale SÓ neste aparelho.`, 'error');
          } else if (Array.isArray(atualizada) && atualizada[0]) {
            toast('Letra atualizada!');
          } else {
            const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
            const { data: criada, error: erroInsert } = await supabase
              .from('letras')
              .insert({ user_id: user ? user.id : null, titulo, artista, letra, tags, link_referencia })
              .select();
            if (!erroInsert && Array.isArray(criada) && criada[0]) {
              letras[idx] = { ...letras[idx], id: criada[0].id };
              toast('Letra salva na nuvem!');
            } else {
              const msg = (erroInsert && erroInsert.message) || 'resposta vazia';
              toast(`Nuvem falhou (${msg}) — alteração vale SÓ neste aparelho.`, 'error');
            }
          }
        } catch {
          toast('Nuvem falhou (rede) — alteração vale SÓ neste aparelho.', 'error');
        }
      } else {
        toast('Alteração salva só neste aparelho (nuvem indisponível).');
      }
    }

    salvar();
    fecharForm();
    render();
  }

  function pedirExclusao(id) {
    const l = letras.find(x => x.id === id);
    if (!l) return;
    pendenciaExclusao = id;
    el.modalExcluirText.textContent = `Tem certeza que deseja excluir "${l.titulo}"?`;
    el.modalExcluir.classList.remove('hidden');
  }

  async function confirmarExclusao() {
    if (pendenciaExclusao === null) return;
    const idx = letras.findIndex(x => x.id === pendenciaExclusao);
    if (idx !== -1) {
      const podeNuvem = !!(usandoSupabase && supabase);
      let erroNuvem = null;
      if (podeNuvem) {
        try {
          const { error } = await supabase.from('letras').delete().eq('id', pendenciaExclusao);
          if (error) erroNuvem = error.message;
        } catch {
          erroNuvem = 'falha de rede';
        }
      }
      letras.splice(idx, 1);
      salvar();
      // C2: sucesso mentiroso se a nuvem recusou o delete
      if (erroNuvem !== null) {
        toast(`Nuvem falhou (${erroNuvem}) — excluída SÓ deste aparelho.`, 'error');
      } else if (podeNuvem) {
        toast('Letra excluída.');
      } else {
        toast('Letra excluída deste aparelho (nuvem indisponível).');
      }
    }
    pendenciaExclusao = null;
    el.modalExcluir.classList.add('hidden');
    render();
  }

  function abrirPlayer(id) {
    pararAuto();
    musicaAtual = letras.find(l => l.id === id) || null;
    indiceAtual = letras.findIndex(l => l.id === id);
    if (indiceAtual < 0) indiceAtual = 0;

    el.viewList.classList.add('hidden');
    el.viewPlayer.classList.remove('hidden');

    if (!musicaAtual) {
      el.viewNotFound.classList.remove('hidden');
      el.infoTitulo.textContent = '—';
      el.infoArtista.textContent = '—';
      el.stage.innerHTML = '';
      delete el.stage.dataset.modo;
      el.stage.appendChild(el.viewNotFound);
      return;
    }

    el.infoTitulo.textContent = musicaAtual.titulo;
    el.infoArtista.textContent = musicaAtual.artista || '';
    document.title = `${musicaAtual.titulo} — Minhas Letras`;

    // Adiciona ao histórico de recentes
    addRecente(musicaAtual.id);

    // Reset cifra/transpose
    cifraAtivo = false;
    transpose = 0;
    if (el.btnCifra) el.btnCifra.classList.remove('active');
    if (el.transposeValue) el.transposeValue.textContent = '0';
    if (el.btnTransposeDown) el.btnTransposeDown.disabled = false;
    if (el.btnTransposeUp) el.btnTransposeUp.disabled = false;
    // Esconde grupo de transposição
    const tg = $('#transpose-group');
    if (tg) tg.style.display = 'none';

    estrofes = musicaAtual.letra.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    atual = 0;
    scrollTop = 0;

    // A barra de controles (play/velocidade) nasce "hidden" no HTML e antes
    // só o setModo() mostrava — abria a letra no Auto e ela não aparecia
    el.autoControls.classList.toggle('hidden', modo !== 'auto');

    if (modo === 'auto') {
      renderAuto();
      iniciarAuto();
    } else {
      renderManual();
    }
    aplicarFontScale(); // aplica tamanho de fonte salvo
    atualizarIntensidade();

    // Wake Lock
    requestWakeLock();

    // Trocou de música → a referência anterior tem que MORRIR (senão o vídeo
    // antigo continuaria tocando por baixo da letra nova)
    pararReferencia();

    // Se é host de sala, avisa a mudança de música
    if (salaAtiva && salaAtiva.host) {
      enviarComandoSala('musica', musicaAtual.id);
      enviarEstadoSala();
    }
  }

  function proximaMusica() {
    if (letras.length === 0 || !musicaAtual) return;
    const prox = (indiceAtual + 1) % letras.length;
    const nome = letras[prox].titulo;
    toast(`Próxima música: ${nome}`);
    abrirPlayer(letras[prox].id);
  }

  function fecharPlayer() {
    pararAuto();
    releaseWakeLock();
    musicaAtual = null;
    // Sai do modo palco se estiver ligado (não pode "vazar" pra lista)
    if (palcoAtivo) {
      palcoAtivo = false;
      document.body.classList.remove('palco-on');
      const bSairPalco = $('#btn-sair-palco');
      if (bSairPalco) bSairPalco.classList.add('hidden');
    }
    // Reset cifra
    cifraAtivo = false;
    transpose = 0;
    // Saiu do player → para a referência de vez (aqui o áudio precisa morrer)
    pararReferencia();
    // Fecha canal local da 2ª tela se aberto
    desligarTVLocal();
    // Se era host da sala, avisa que saiu do player
    if (salaAtiva && salaAtiva.host) {
      enviarComandoSala('musica', null);
    }
    el.viewPlayer.classList.add('hidden');
    el.viewList.classList.remove('hidden');
    document.title = 'Minhas Letras';
    atualizarIntensidade(); // volta a onda normal (fora do player = 1)
    render();
  }

  // ============ MODO PALCO (letra sem distração) ============
  // Some barra/controles, partículas pros 20%, letra ~30% maior.
  function alternarPalco() {
    if (el.viewPlayer.classList.contains('hidden')) return;
    palcoAtivo = !palcoAtivo;
    document.body.classList.toggle('palco-on', palcoAtivo);
    const bSair = document.getElementById('btn-sair-palco');
    if (bSair) bSair.classList.toggle('hidden', !palcoAtivo);
    const bPalco = document.getElementById('btn-palco');
    if (bPalco) bPalco.setAttribute('aria-pressed', String(palcoAtivo));
    // Mudou o tamanho da letra → reencaixa a estrofe na tela
    // (manual — Palco mexe no font-size)
    requestAnimationFrame(() => {
      if (modo === 'manual') {
        const ln = document.getElementById('lyric-line');
        if (ln) ajustarEstrofe(ln);
      }
    });
    if (palcoAtivo) {
      toast(modo === 'auto'
        ? 'Palco ligado — toque na tela pra pausar · ✕ pra sair'
        : 'Palco ligado — toque pra avançar · ✕ pra sair');
    }
  }

  // ===== ASSINATURA: partículas do fundo reagem ao player =====
  // Exporta window.ML_INTENSIDADE, lido pelo particle wave (inline no HTML):
  // 1 = normal · 0.6 = player parado · até 3 = rolagem no máximo
  function atualizarIntensidade() {
    let inten = 1;
    if (!el.viewPlayer.classList.contains('hidden')) {
      inten = rolando ? 0.6 + (Number(el.speed.value) / 120) * 2.4 : 0.6;
    }
    window.ML_INTENSIDADE = inten;
  }

  function renderAuto() {
    // Quebra cada estrofe em LINHAS (spans .ln)
    let html;
    if (cifraAtivo) {
      html = parseCifra(musicaAtual.letra, transpose);
      el.stage.innerHTML = `
        <div class="auto-scroll" id="auto-scroll">
          <div class="lyric-text cifra-mode">${html}</div>
        </div>`;
    } else {
      html = estrofes.map(e => {
        const linhas = e.split('\n')
          .map(l => `<span class="ln">${l.trim() === '' ? '&nbsp;' : escapeHtml(l)}</span>`)
          .join('');
        return `<span class="estrofe">${linhas}</span>`;
      }).join('');
      el.stage.innerHTML = `
        <div class="auto-scroll" id="auto-scroll">
          <div class="lyric-text">${html}</div>
        </div>`;
    }
    el.stage.dataset.modo = 'auto';
    const scroller = $('#auto-scroll');
    scroller.scrollTop = scrollTop;
  }

  function iniciarAuto() {
    const scroller = $('#auto-scroll');
    if (!scroller) return;
    rolando = true;
    el.btnPlay.textContent = 'pause';
    atualizarIntensidade(); // assinatura: onda acelera junto
    clearInterval(timer);
    timer = setInterval(() => {
      if (!rolando || !scroller) return;
      const vel = Number(el.speed.value);
      if (refSyncAtivo && refSyncMarkers.length) {
        // Sync ligado: quem manda é o VÍDEO. A letra vai pro ponto que o tempo
        // dele manda (interpolado entre os marcadores) — o scroll não anda
        // mais pela velocidade do slider.
        const alvo = scrollAlvoPorTempo(tempoEstimadoVideo());
        if (alvo !== null) scroller.scrollTop = alvo;
        else scroller.scrollTop += vel * 0.05; // fora dos marcadores: ritmo normal
      } else {
        scroller.scrollTop += vel * 0.05;
      }
      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
      if (scroller.scrollTop >= maxScroll - 2) {
        pararAuto();
        setTimeout(proximaMusica, 350);
      }
      // Envia estado para sala se host
      if (salaAtiva && salaAtiva.host) enviarEstadoSala();
    }, 30);
  }

  function pararAuto() {
    rolando = false;
    clearInterval(timer);
    timer = null;
    el.btnPlay.textContent = 'play_arrow';
    atualizarIntensidade(); // assinatura: onda acalma
  }

  function toggleAuto() {
    const scroller = $('#auto-scroll');
    if (!scroller) return;
    if (rolando) {
      pararAuto();
      if (salaAtiva && salaAtiva.host) enviarComandoSala('pause');
    } else {
      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
      if (scroller.scrollTop >= maxScroll - 2) scroller.scrollTop = 0;
      iniciarAuto();
      if (salaAtiva && salaAtiva.host) enviarComandoSala('play');
    }
  }

  function renderManual() {
    let html;
    if (cifraAtivo) {
      html = parseCifra(musicaAtual.letra, transpose);
      el.stage.innerHTML = `
        <div class="manual-view cifra-mode" id="manual-view">
          <div class="manual-hint">Toque ou aperte <b>Espaço</b> para avançar · <b>seta ↑</b> para voltar</div>
          <div class="lyric-line fade-in" id="lyric-line">${html}</div>
          <div class="manual-progress" id="manual-progress"></div>
        </div>`;
    } else {
      el.stage.innerHTML = `
        <div class="manual-view" id="manual-view">
          <div class="manual-hint">Toque ou aperte <b>Espaço</b> para avançar · <b>seta ↑</b> para voltar</div>
          <div class="lyric-line fade-in" id="lyric-line"></div>
          <div class="manual-progress" id="manual-progress"></div>
        </div>`;
    }
    el.stage.dataset.modo = 'manual';
    atual = Math.min(atual, estrofes.length - 1);
    atual = Math.max(atual, 0);
    if (!cifraAtivo) mostrarEstrofe();
    else atualizarProgressoManual();
  }

  function mostrarEstrofe() {
    const line = $('#lyric-line');
    const progress = $('#manual-progress');
    if (!line || !progress) return;
    line.textContent = estrofes[atual] || '';
    progress.textContent = `${atual + 1} / ${estrofes.length}`;
    ajustarEstrofe(line);
  }

  function atualizarProgressoManual() {
    const progress = $('#manual-progress');
    if (!progress) return;
    // Em modo cifra, conta estrofes do parse
    const estrofesCifra = musicaAtual.letra.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    progress.textContent = `${atual + 1} / ${estrofesCifra.length}`;
  }

  // Estrofe grande demais (ou Palco com fonte +30%)? Encolhe a fonte
  // até a letra inteira caber na tela. Mede → reduz → mede de novo.
  //
  // IMPORTANTE: o ajuste é medido NA BASE (escala do usuário desligada) e
  // guardado em --fonte-fit; a escala do usuário é aplicada POR CIMA.
  // Se o auto-ajuste absorvesse a escala, apertar A+ quebraria mais linhas e
  // o encolhimento compensaria — a letra DIMINUÍVA ao apertar A+ (bug antigo).
  function ajustarEstrofe(line) {
    const view = line.closest('.manual-view');
    if (!view) return;
    const stage = el.stage;
    const escalaSalva = stage ? stage.style.getPropertyValue('--fonte-escala') : '';
    // Mede o ajuste NA BASE (sem a escala do usuário)
    if (stage) stage.style.setProperty('--fonte-escala', '1');
    line.style.removeProperty('font-size'); // limpa inline antigo (fixava o tamanho)
    line.style.setProperty('--fonte-fit', '1');
    const estilos = window.getComputedStyle(view);
    const padding = parseFloat(estilos.paddingTop) + parseFloat(estilos.paddingBottom);
    // Reserva: dica de cima (~34px) + contador "2/8" embaixo (~54px) + folga
    const disponivel = view.clientHeight - padding - 120;
    if (disponivel > 0) {
      // Até 4 passos: mede a altura real e reduz 1 passo (com piso de 12px)
      for (let i = 0; i < 4; i++) {
        const necessario = line.getBoundingClientRect().height;
        if (necessario <= disponivel) break; // cabeu!
        const atualPx = parseFloat(window.getComputedStyle(line).fontSize);
        const novaPx = Math.max(12, Math.floor(atualPx * (disponivel / necessario)));
        if (novaPx >= atualPx) break; // já tá no mínimo
        const fit = Math.max(0.2, novaPx / atualPx);
        line.style.setProperty('--fonte-fit', String(fit));
      }
    }
    // Devolve a escala do usuário — ela é aplicada POR CIMA do ajuste,
    // então A+/A- sempre aumentam/diminuem de verdade.
    if (stage) stage.style.setProperty('--fonte-escala', escalaSalva || '1');
  }

  function avancar() {
    if (animOut) return;
    const totalEstrofes = cifraAtivo
      ? musicaAtual.letra.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean).length
      : estrofes.length;
    if (atual >= totalEstrofes - 1) {
      proximaMusica();
      return;
    }
    // C6: só arma animOut DEPOIS de garantir que o elemento existe —
    // antes, um return cedo deixava animOut=true e travava o player.
    const line = $('#lyric-line');
    if (!line) return;
    animOut = true;
    line.classList.add('fade-out');
    setTimeout(() => {
      try {
        atual++;
        if (cifraAtivo) {
          atualizarProgressoManual();
        } else {
          mostrarEstrofe();
        }
        line.classList.remove('fade-out');
        line.classList.add('fade-in');
        setTimeout(() => line.classList.remove('fade-in'), 350);
      } finally {
        animOut = false; // sempre destrava, mesmo se algo falhar
      }
    }, 150);
    if (salaAtiva && salaAtiva.host) enviarComandoSala('avancar');
  }

  function voltarEstrofe() {
    if (animOut) return;
    if (atual <= 0) { vibrar(); return; }
    atual--;
    if (cifraAtivo) {
      atualizarProgressoManual();
    } else {
      mostrarEstrofe();
    }
    if (salaAtiva && salaAtiva.host) enviarComandoSala('voltar');
  }

  function vibrar() { if (navigator.vibrate) navigator.vibrate(40); }

  function setModo(m) {
    if (!musicaAtual) return;
    if (modo === m) return;
    if (modo === 'auto') {
      scrollTop = $('#auto-scroll') ? $('#auto-scroll').scrollTop : 0;
      pararAuto();
    }
    modo = m;
    el.modoAutoBtn.classList.toggle('active', modo === 'auto');
    el.modoManualBtn.classList.toggle('active', modo === 'manual');
    el.autoControls.classList.toggle('hidden', modo !== 'auto');
    if (modo === 'auto') {
      renderAuto();
      iniciarAuto();
    } else {
      renderManual();
    }
    if (salaAtiva && salaAtiva.host) enviarComandoSala('modo', modo);
  }

  // ============ CIFRA / TRANSPOSE ============
  function alternarCifra() {
    if (!musicaAtual) return;
    cifraAtivo = !cifraAtivo;
    if (el.btnCifra) el.btnCifra.classList.toggle('active', cifraAtivo);
    // Mostra/esconde grupo de transposição
    const tg = $('#transpose-group');
    if (tg) tg.style.display = cifraAtivo ? 'inline-flex' : 'none';
    if (modo === 'auto') {
      renderAuto();
      if (cifraAtivo) iniciarAuto();
    } else {
      renderManual();
    }
    toast(cifraAtivo ? 'Modo cifra ligado' : 'Modo cifra desligado');
    if (salaAtiva && salaAtiva.host) enviarComandoSala('cifra', cifraAtivo);
  }

  function alterarTranspose(delta) {
    if (!musicaAtual || !cifraAtivo) return;
    const novo = Math.max(-12, Math.min(12, transpose + delta));
    if (novo === transpose) return;
    transpose = novo;
    if (el.transposeValue) el.transposeValue.textContent = transpose > 0 ? `+${transpose}` : String(transpose);
    if (el.btnTransposeDown) el.btnTransposeDown.disabled = transpose <= -12;
    if (el.btnTransposeUp) el.btnTransposeUp.disabled = transpose >= 12;
    if (modo === 'auto') {
      renderAuto();
      if (rolando) iniciarAuto();
    } else {
      renderManual();
    }
    if (salaAtiva && salaAtiva.host) enviarComandoSala('transpose', transpose);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  (function setupPWA() {
    const manifest = {
      name: 'Minhas Letras',
      short_name: 'Minhas Letras',
      description: 'Salve letras de músicas e cante com rolagem automática ou manual.',
      start_url: location.href.split('?')[0],
      display: 'standalone',
      background_color: '#000000',
      theme_color: '#000000',
      lang: 'pt-BR',
      icons: [{
        src: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 512 512\'%3E%3Crect width=\'512\' height=\'512\' rx=\'96\' fill=\'%23000000\'/%3E%3Ccircle cx=\'256\' cy=\'256\' r=\'152\' fill=\'%23fafafa\'/%3E%3Ctext x=\'256\' y=\'320\' font-family=\'Verdana\' font-size=\'200\' font-weight=\'800\' text-anchor=\'middle\' fill=\'%23000000\'%3E%E2%99%AA%3C/text%3E%3C/svg%3E',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      }]
    };
    try {
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = URL.createObjectURL(blob);
      document.head.appendChild(link);
    } catch {}
  })();

  // ============ FEATURE: TAMANHO DA FONTE NO PLAYER ============
  // A escala vira uma VARIÁVEL CSS (--fonte-escala) multiplicada pelo tamanho
  // base do clamp no styles.css.
  // Antes era font-size: <escala>rem inline — como o clamp base é bem maior
  // que 1rem, o A+ DIMINUIA a letra (41.6px -> 17.6px) e o A- aumentava.
  function aplicarFontScale() {
    if (!el.stage) return;
    el.stage.style.setProperty('--fonte-escala', String(fontScale));
    // Aplica também nos elementos de letra dentro do stage (modo manual usa
    // .lyric-line, modo auto usa .lyric-text — o CSS cuida dos dois via var)
    el.stage.querySelectorAll('.lyric-line, .lyric-text, .auto-estrofe, #lyric-line').forEach(x => {
      x.style.removeProperty('font-size'); // tira o inline antigo (fixava o tamanho)
    });
    // Ajusta a estrofe no modo manual depois da mudança
    if (modo === 'manual') {
      const ln = document.getElementById('lyric-line');
      if (ln && typeof ajustarEstrofe === 'function') ajustarEstrofe(ln);
    }
  }

  function mudarFonte(delta) {
    fontScale = Math.round(Math.min(2.0, Math.max(0.6, fontScale + delta)) * 100) / 100;
    storageSet(LS_FONTE, fontScale);
    aplicarFontScale();
    toast(`Texto: ${Math.round(fontScale * 100)}%`);
  }

  // ============ FEATURE: FILTRO POR TAG ============
  function coletarTodasTags() {
    const mapa = new Map();
    for (const l of letras) {
      for (const t of (l.tags || [])) {
        const tag = String(t).trim().toLowerCase();
        if (!tag) continue;
        mapa.set(tag, (mapa.get(tag) || 0) + 1);
      }
    }
    // Ordena por quantidade (mais usada primeiro)
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }

  function renderTagFilter() {
    if (!el.tagFilter) return;
    const tags = coletarTodasTags();
    const temFavoritos = favoritos.size > 0;
    // Esconde a barra se não tem tags nem favoritos
    if (tags.length === 0 && !temFavoritos) {
      el.tagFilter.classList.add('hidden');
      el.tagFilter.innerHTML = '';
      return;
    }
    el.tagFilter.classList.remove('hidden');
    let html = '';
    // Botão "Favoritas" sempre primeiro (se tiver alguma)
    if (temFavoritos) {
      html += `<button class="tag-filter-btn tag-fav${tagAtiva === '__fav__' ? ' active' : ''}" data-tag="__fav__">⭐ Favoritas</button>`;
    }
    for (const [tag, count] of tags) {
      html += `<button class="tag-filter-btn${tagAtiva === tag ? ' active' : ''}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)} (${count})</button>`;
    }
    // Botão "limpar" se tem filtro ativo
    if (tagAtiva) {
      html += `<button class="tag-filter-btn" data-tag="__limpar__" style="border-style:dashed;">✕ Limpar</button>`;
    }
    el.tagFilter.innerHTML = html;
  }

  function filtrarPorTag(lista) {
    if (!tagAtiva) return lista;
    if (tagAtiva === '__fav__') {
      return lista.filter(l => favoritos.has(String(l.id)));
    }
    return lista.filter(l =>
      (l.tags || []).some(t => String(t).trim().toLowerCase() === tagAtiva)
    );
  }

  function selecionarTag(tag) {
    if (tag === '__limpar__') {
      tagAtiva = null;
    } else {
      tagAtiva = tagAtiva === tag ? null : tag; // clica de novo = limpa
    }
    storageSet(LS_TAGS_FILTRO, tagAtiva);
    renderTagFilter();
    render();
  }

  // ============ FEATURE: FAVORITAR ============
  function alternarFavorito(id) {
    const chave = String(id);
    if (favoritos.has(chave)) {
      favoritos.delete(chave);
      toast('Removido dos favoritos');
    } else {
      favoritos.add(chave);
      toast('⭐ Adicionado aos favoritos!');
    }
    storageSet(LS_FAVORITOS, [...favoritos]);
    renderTagFilter();
    render();
  }

  document.body.addEventListener('click', e => {
    // Botão de favoritar na lista
    const btnFav = e.target.closest('[data-acao="favoritar"]');
    if (btnFav) {
      e.stopPropagation();
      alternarFavorito(Number(btnFav.dataset.id));
      return;
    }
    // Botão de filtro por tag
    const btnTag = e.target.closest('.tag-filter-btn');
    if (btnTag) {
      selecionarTag(btnTag.dataset.tag);
      return;
    }
  });

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    el.btnInstalar.classList.remove('hidden');
  });

  el.btnInstalar.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    el.btnInstalar.classList.add('hidden');
  });

  window.addEventListener('appinstalled', () => {
    el.btnInstalar.classList.add('hidden');
  });

  document.body.addEventListener('click', e => {
    const btn = e.target.closest('[data-acao]');
    if (btn) {
      const acao = btn.dataset.acao;
      const id = Number(btn.dataset.id);
      const usaId = (acao === 'editar' || acao === 'excluir' || acao === 'cantar' || acao === 'pdf' || acao === 'compartilhar');
      if (usaId && !Number.isFinite(id)) return;
      switch (acao) {
        case 'nova': abrirFormNovo(); break;
        case 'editar': abrirFormEdicao(id); break;
        case 'excluir': pedirExclusao(id); break;
        case 'cantar': abrirPlayer(id); break;
        case 'pdf': exportarPDF(id); break;
        case 'compartilhar': abrirModalCompartilhar(id); break;
        case 'limpar-busca':
          el.busca.value = '';
          render();
          break;
      }
      return;
    }

    // Modo palco + Auto: toque em qualquer lugar da letra pausa/continua
    // (o botão de saída fica FORA do #stage, então não entra aqui)
    if (musicaAtual && palcoAtivo && modo === 'auto' && e.target.closest('#stage')) {
      toggleAuto();
      return;
    }

    if (musicaAtual && modo === 'manual' && e.target.closest('#manual-view')) {
      avancar();
    }
  });

  document.body.addEventListener('input', e => {
    if (e.target === el.busca) { render(); return; }
    if (e.target.closest('.field')) e.target.closest('.field').classList.remove('invalid');
  });

  el.btnNova.addEventListener('click', abrirFormNovo);
  el.formLetra.addEventListener('submit', salvarLetra);
  el.btnCancelar.addEventListener('click', fecharForm);
  el.btnCancelarExclusao.addEventListener('click', () => {
    pendenciaExclusao = null;
    el.modalExcluir.classList.add('hidden');
  });
  el.btnConfirmarExclusao.addEventListener('click', confirmarExclusao);

  el.btnVoltar.addEventListener('click', fecharPlayer);
  el.btnPlay.addEventListener('click', toggleAuto);
  el.speed.addEventListener('input', () => {
    el.speedLabel.textContent = el.speed.value;
    atualizarIntensidade(); // assinatura: mudou a velocidade → muda a onda
  });
  el.modoAutoBtn.addEventListener('click', () => setModo('auto'));
  el.modoManualBtn.addEventListener('click', () => setModo('manual'));
  el.btnFullscreen.addEventListener('click', toggleFullscreen);

  // ===== Novos botões do player =====
  if (el.btnCifra) el.btnCifra.addEventListener('click', alternarCifra);
  if (el.btnTransposeDown) el.btnTransposeDown.addEventListener('click', () => alterarTranspose(-1));
  if (el.btnTransposeUp) el.btnTransposeUp.addEventListener('click', () => alterarTranspose(1));

  // ===== Features novas: botões de fonte =====
  if (el.btnFontUp) el.btnFontUp.addEventListener('click', () => mudarFonte(0.1));
  if (el.btnFontDown) el.btnFontDown.addEventListener('click', () => mudarFonte(-0.1));

  // ===== Tema, Export/Import, Ordem =====
  if (el.btnTema) el.btnTema.addEventListener('click', alternarTema);
  if (el.btnExportar) el.btnExportar.addEventListener('click', exportarJSON);
  if (el.btnImportar) el.btnImportar.addEventListener('click', () => el.inputImportar?.click());
  if (el.inputImportar) el.inputImportar.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { importadas, puladas, subidas, falhasNuvem, semNuvem } = await importarJSON(file);
      const base = `${importadas} letra(s) importada(s)${puladas ? `, ${puladas} pulada(s)` : ''}`;
      if (semNuvem) {
        toast(`${base} — salvas SÓ neste aparelho (nuvem indisponível).`, 'error');
      } else if (falhasNuvem > 0) {
        toast(`${base}: ${subidas} salva(s) na nuvem, ${falhasNuvem} só neste aparelho.`, 'error');
      } else if (subidas > 0) {
        toast(`${base} e salva(s) na nuvem!`);
      } else {
        toast(`${base}!`);
      }
    } catch (err) {
      toast(`Erro ao importar: ${err.message}`, 'error');
    }
    e.target.value = ''; // permite reimportar o mesmo arquivo
  });
  if (el.ordemSelect) el.ordemSelect.addEventListener('change', (e) => {
    ordemAtual = e.target.value;
    storageSet(LS_ORDEM, ordemAtual);
    render();
  });

  // ===== Modo palco (botão da barra + botãozinho flutuante de saída) =====
  const btnPalco = $('#btn-palco');
  if (btnPalco) btnPalco.addEventListener('click', alternarPalco);
  const btnSairPalco = $('#btn-sair-palco');
  if (btnSairPalco) btnSairPalco.addEventListener('click', alternarPalco);

  // ===== 2ª tela (7) + Histórico de acessos (28) + Sala + Referência + Share =====
  if (el.btnTv) el.btnTv.addEventListener('click', abrirModalTV);
  if (el.btnTvAbrir) el.btnTvAbrir.addEventListener('click', () => {
    if (el.modalTv) el.modalTv.classList.add('hidden');
    abrirTelaTV();
  });
  if (el.btnTvCopiar) el.btnTvCopiar.addEventListener('click', copiarLinkTV);
  if (el.btnTvFechar) el.btnTvFechar.addEventListener('click', () => {
    if (el.modalTv) el.modalTv.classList.add('hidden');
  });
  if (el.modalTv) el.modalTv.addEventListener('click', e => {
    if (e.target === el.modalTv) el.modalTv.classList.add('hidden');
  });
  if (el.btnAcessos) el.btnAcessos.addEventListener('click', abrirHistoricoAcessos);
  if (el.btnFecharAcessos) el.btnFecharAcessos.addEventListener('click', () => {
    el.modalAcessos.classList.add('hidden');
  });
  if (el.modalAcessos) el.modalAcessos.addEventListener('click', e => {
    if (e.target === el.modalAcessos) el.modalAcessos.classList.add('hidden');
  });
  // Sala de ensaio
  if (el.btnSala) el.btnSala.addEventListener('click', abrirModalSala);
  if (el.salaCriar) el.salaCriar.addEventListener('click', criarSala);
  if (el.salaEntrar) el.salaEntrar.addEventListener('click', () => {
    const codigo = el.salaCodigoInput?.value?.trim();
    if (codigo) entrarSala(codigo);
  });
  if (el.salaFechar) el.salaFechar.addEventListener('click', sairSala);
  if (el.salaCancelar) el.salaCancelar.addEventListener('click', () => {
    if (el.modalSala) el.modalSala.classList.add('hidden');
  });
  if (el.salaCodigoInput) el.salaCodigoInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const codigo = e.target.value.trim();
      if (codigo) entrarSala(codigo);
    }
  });
  if (el.modalSala) el.modalSala.addEventListener('click', e => {
    if (e.target === el.modalSala) el.modalSala.classList.add('hidden');
  });
  // Referência YouTube/Spotify
  if (el.btnReferencia) el.btnReferencia.addEventListener('click', () => {
    if (refSidebarAberta) fecharSidebarReferencia();
    else abrirSidebarReferencia();
  });
  if (el.refFechar) el.refFechar.addEventListener('click', fecharSidebarReferencia);
  if (el.refSalvar) el.refSalvar.addEventListener('click', salvarReferencia);
  if (el.refMarcar) el.refMarcar.addEventListener('click', marcarTempoAtual);
  if (el.refSync) el.refSync.addEventListener('click', toggleRefSync);
  if (el.refLimpar) el.refLimpar.addEventListener('click', () => {
    refSyncMarkers = [];
    // Sem marcador o sync não tem mapa — desliga junto, senão o botão fica
    // "Sync ON" mentindo (e o tick roda à toa procurando marcador)
    definirRefSync(false, true);
    renderizarMarcadores();
    salvarMarcadores();
    toast('Marcadores limpos.');
  });
  // Compartilhar no player
  if (el.btnCompartilhar) el.btnCompartilhar.addEventListener('click', () => {
    if (musicaAtual) abrirModalCompartilhar(musicaAtual.id);
  });

  // ===== Arrastar cards (18) =====
  setupArrasto();

  el.formLogin.addEventListener('submit', tratarLogin);
  el.formRegistro.addEventListener('submit', tratarRegistro);
  el.linkRegistro.addEventListener('click', mostrarRegistro);
  el.linkLogin.addEventListener('click', mostrarLogin);
  el.btnSair.addEventListener('click', sair);

  // Cleanup ao fechar a aba/navegar para fora
  window.addEventListener('beforeunload', () => {
    releaseWakeLock();
    desligarTVLocal();
    if (canalNuvemTV) { try { if (supabase) supabase.removeChannel(canalNuvemTV); } catch {} }
    if (salaCanal) { try { salaCanal.close(); } catch {} }
    if (salaCanalNuvem && supabase) { try { supabase.removeChannel(salaCanalNuvem); } catch {} }
  });

  // ===== Hero Dock (atalhos flutuantes) =====
  const heroDock = $('#hero-dock');
  if (heroDock) {
    // Delegação no dock — cada botão [data-dock] dispara sua ação
    heroDock.addEventListener('click', e => {
      const btn = e.target.closest && e.target.closest('[data-dock]');
      if (!btn) return;
      const acao = btn.dataset.dock;
      switch (acao) {
        case 'letras':
          el.busca.value = '';
          render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          toast(letras.length ? `Mostrando todas as ${letras.length} letra(s).` : 'Caderno vazio.');
          break;
        case 'buscar':
          el.busca.focus();
          el.busca.scrollIntoView({ behavior: 'smooth', block: 'center' });
          toast('Digita o nome da música ou artista.');
          break;
        case 'nova':
          abrirFormNovo();
          break;
        case 'cantar':
          if (letras.length > 0) abrirPlayer(letras[0].id);
          else toast('Caderno vazio — adiciona uma letra primeiro.', 'error');
          break;
        case 'senha':
          redefinirOrigem = 'lista';
          mostrarRedefinir();
          break;
        case 'sair':
          sair();
          break;
      }
    });
  }

  document.addEventListener('fullscreenchange', () => {
    const fs = document.getElementById('fs-label');
    const ico = el.btnFullscreen.querySelector('.msi');
    if (fs) fs.textContent = document.fullscreenElement ? 'Sair da tela' : 'Tela cheia';
    if (ico) ico.textContent = document.fullscreenElement ? 'close' : 'fullscreen';
  });

  document.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (!musicaAtual) return;
      if (modo === 'auto') toggleAuto();
      else avancar();
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!musicaAtual || modo === 'manual') avancar();
    }

    if (e.key === 'ArrowUp' || e.key === 'Backspace') {
      e.preventDefault();
      if (!musicaAtual || modo === 'manual') voltarEstrofe();
    }

    // Atalhos do player: C = cifra, [ / ] = transpose
    if (musicaAtual && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === 'c' || e.key === 'C') { alternarCifra(); return; }
      if (e.key === '[') { alterarTranspose(-1); return; }
      if (e.key === ']') { alterarTranspose(1); return; }
    }

    if (e.key === 'Escape') {
      // No palco, Esc primeiro SAI do palco; sem palco, fecha o player
      if (palcoAtivo) { alternarPalco(); return; }
      if (el.viewPlayer.classList.contains('hidden') === false) fecharPlayer();
    }
  });

  // Celular girou ou janela mudou de tamanho → reencaixa a estrofe na tela
  window.addEventListener('resize', () => {
    if (musicaAtual && modo === 'manual') {
      const ln = document.getElementById('lyric-line');
      if (ln) ajustarEstrofe(ln);
    }
  });

  // ===== Recuperação / troca de senha (telas novas — antes eram prompt()) =====
  // Origem da tela de redefinir: 'login' (chegou pelo link do e-mail)
  // ou 'lista' (botão "Senha" com a sessão já ativa).
  let redefinirOrigem = 'login';

  async function tratarEsqueci(e) {
    e.preventDefault();
    const email = el.iEsqueciEmail.value.trim();
    el.esqueciError.classList.remove('show');
    el.esqueciOk.classList.remove('show');
    limparErros();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { marcarErro('f-esqueci-email'); return; }

    const ok = await carregarSDKSupabase();
    if (!ok || !supabase) {
      el.esqueciError.textContent = 'Não deu pra conectar na nuvem. Verifique sua internet.';
      el.esqueciError.classList.add('show');
      return;
    }

    // redirectTo: o link do e-mail volta pra ESTA página (origin atual).
    // Se a URL não estiver na allowlist do Supabase, ele recusa → refaz sem
    // redirectTo (aí cai na Site URL configurada no painel do Supabase).
    const redirectTo = window.location.origin + window.location.pathname;
    let { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error && /redirect/i.test(String(error.message || ''))) {
      ({ error } = await supabase.auth.resetPasswordForEmail(email));
    }
    if (error) {
      el.esqueciError.textContent = erroSupabase(error);
      el.esqueciError.classList.add('show');
      return;
    }

    // Enviado. Mensagem genérica de propósito: não revela se o e-mail tem conta.
    el.esqueciOk.textContent = 'Se esse e-mail tiver conta, chega um link de recuperação em instantes. Confira o spam também!';
    el.esqueciOk.classList.add('show');
    el.formEsqueci.reset();
  }

  async function tratarRedefinir(e) {
    e.preventDefault();
    const nova = el.iRedSenha.value;
    const confirma = el.iRedConfirma.value;
    limparErros();
    el.redefinirError.classList.remove('show');

    let valido = true;
    if (nova.length < 6) { marcarErro('f-red-senha'); valido = false; }
    if (nova !== confirma) { marcarErro('f-red-confirma'); valido = false; }
    if (!valido) return;

    const ok = await carregarSDKSupabase();
    if (!ok || !supabase) {
      el.redefinirError.textContent = 'Não deu pra conectar na nuvem. Verifique sua internet.';
      el.redefinirError.classList.add('show');
      return;
    }

    // updateUser usa a sessão ativa — a de recuperação (link do e-mail)
    // ou a normal (botão "Senha" do cabeçalho).
    const { error } = await supabase.auth.updateUser({ password: nova });
    if (error) {
      el.redefinirError.textContent = erroSupabase(error);
      el.redefinirError.classList.add('show');
      return;
    }

    // Limpa o token de recuperação da URL (refresh não volta pra esta tela)
    history.replaceState(null, '', window.location.pathname + window.location.search);
    toast('Senha alterada com sucesso!');
    entrar();
  }

  // Voltar a partir da tela de redefinir: logado volta pro caderno,
  // veio do link do e-mail volta pra entrada.
  function voltarRedefinir() {
    if (redefinirOrigem === 'lista') {
      el.viewRedefinir.classList.add('hidden');
      el.viewList.classList.remove('hidden');
    } else {
      mostrarLogin();
    }
  }

  // "Esqueci minha senha?" (no login) → tela de recuperação
  const linkEsqueci = $('#link-esqueci');
  if (linkEsqueci) linkEsqueci.addEventListener('click', (e) => { e.preventDefault(); mostrarEsqueci(); });
  const linkEsqueciVoltar = $('#link-esqueci-voltar');
  if (linkEsqueciVoltar) linkEsqueciVoltar.addEventListener('click', mostrarLogin);
  el.formEsqueci.addEventListener('submit', tratarEsqueci);

  // Botão "Senha" (cabeçalho logado) → mesma tela de redefinir, mas voltando pro caderno
  const btnTrocarSenha = $('#btn-trocar-senha');
  if (btnTrocarSenha) btnTrocarSenha.addEventListener('click', () => {
    redefinirOrigem = 'lista';
    mostrarRedefinir();
  });
  const linkRedefinirVoltar = $('#link-redefinir-voltar');
  if (linkRedefinirVoltar) linkRedefinirVoltar.addEventListener('click', voltarRedefinir);
  el.formRedefinir.addEventListener('submit', tratarRedefinir);

  carregar();
  // Restaura sala de ensaio se havia uma ativa
  restaurarSalaLocal();
  (async () => {
    const ok = await carregarSDKSupabase();
    if (ok) {
      // Chegou pelo link do e-mail? O Supabase marca na URL (#...type=recovery)
      // e emite PASSWORD_RECOVERY — nos dois casos, mostra a tela de nova senha
      // em vez de entrar direto no caderno.
      const hashRecuperacao = /type=recovery/.test(window.location.hash);
      supabase.auth.onAuthStateChange((evento) => {
        if (evento === 'PASSWORD_RECOVERY') {
          redefinirOrigem = 'login';
          mostrarRedefinir();
        }
      });
      const { data } = await supabase.auth.getSession();
      if (hashRecuperacao) {
        redefinirOrigem = 'login';
        mostrarRedefinir();
        return;
      }
      if (data && data.session) {
        entrar();
        return;
      }
    }
    mostrarLogin();
  })();
})();
