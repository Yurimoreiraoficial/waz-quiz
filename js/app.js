/* Waz Quiz — motor do funil (port do Framer, sem dependências) */
(function () {
  'use strict';

  var script = document.currentScript;
  var ENDPOINT = (script && script.dataset.endpoint) || '';

  /* ---------- configuração ---------- */
  var SEQ = [
    'hero', 'prova', 'nome', 'setor', 'imagine', 'volume', 'atendimento', 'dor',
    'd-demora', 'd-esfriam', 'd-equipe', 'd-horario',
    'origem', 'trafego', 'numeros', 'crm', 'urgencia',
    'analise', 'dados', 'resultado', 'setedias', 'autoridade', 'garantia',
    'investimento', 'obrigado'
  ];
  var AGENDAR = SEQ.length;        // tela virtual pós "sim"
  var POS = SEQ.length + 1;        // tela virtual pós-agendamento
  var IDX_INVESTIMENTO = SEQ.indexOf('investimento');

  var DOR_TELA = { 'd-demora': 'demora', 'd-esfriam': 'esfriam', 'd-equipe': 'equipe', 'd-horario': 'horario' };
  var ATRASO_BOTAO = 3;            // segundos até liberar o Continuar nas telas de leitura
  var RITMO_MAX = 4;               // teto por bloco na revelação progressiva

  var ROTULO_BOTAO = { hero: 'Começar agora', crm: 'Sim, com certeza!' };

  var MAPA_SETOR = {
    saude: 'Agenda cheia sem secretária no limite: o Waz confirma consultas, corta faltas com lembretes e preenche horários vagos sozinho.',
    imobiliario: 'Chega de lead que some: o Waz qualifica o interessado na hora, agenda a visita e insiste no follow-up até ele aparecer.',
    ecommerce: 'Carrinho abandonado vira venda: o Waz recupera pedidos, tira dúvidas de produto e fecha no Pix dentro da própria conversa.',
    b2b: 'Seu comercial só fala com quem decide: o Waz qualifica, filtra os curiosos e coloca reunião direto na agenda do closer.',
    delivery: 'Pedido anotado em segundos, sem fila: o Waz monta o pedido, confirma o pagamento e ainda sugere adicionais para aumentar o ticket.',
    outro: 'O Waz aprende com as conversas reais do seu negócio e atende do jeito que o seu melhor vendedor atenderia, no seu tom.'
  };
  var MAPA_VOLUME = {
    v10: 'Com menos de 10 conversas por dia, cada lead vale ouro: resposta em segundos e follow-up até a decisão, sem deixar nenhum esfriar.',
    v20: 'De 10 a 20 conversas por dia é onde a demora começa a custar caro: o Waz zera a fila e ainda reativa quem ficou pelo caminho.',
    v50: 'De 20 a 50 conversas por dia, nenhuma pessoa dá conta sozinha: o Waz responde todas ao mesmo tempo, sem pausa e sem fila.',
    v50plus: 'Acima de 50 conversas por dia, você deixa dinheiro na mesa todos os dias: o Waz atende 100% do volume, 24h, sem contratar ninguém.'
  };
  var MAPA_DOR = {
    demora: 'Sua dor nº 1, a demora, morre no primeiro dia: resposta em segundos, na frente de 99% dos seus concorrentes.',
    esfriam: 'Sua dor nº 1, leads esfriando, acaba: régua de follow-up que insiste até o sim ou o não, sem depender de ninguém lembrar.',
    equipe: 'Sua dor nº 1, equipe sobrecarregada, some: o Waz assume a triagem e o operacional, e seu time só fala com quem está pronto para comprar.',
    horario: 'Sua dor nº 1, mensagens fora do horário, vira vantagem: o Waz vende às 23h de sábado como se fosse terça às 10h.'
  };
  var NOTA_URGENCIA = {
    urgente: 'Pelo seu nível de urgência, agende ainda hoje: as vagas de implementação da semana são limitadas.',
    media: 'Nos próximos 30 dias dá para implantar com calma. Agendando agora, você chega lá com tudo rodando.',
    baixa: 'Mesmo em fase de pesquisa, vale conhecer o plano: assim você compara com clareza.'
  };
  var ROTULOS = {
    saude: 'Clínicas e saúde', imobiliario: 'Imobiliário', ecommerce: 'E-commerce e varejo', b2b: 'Serviços B2B', delivery: 'Delivery e food', outro: 'Outro',
    v10: 'Menos de 10/dia', v20: '10-20/dia', v50: '20-50/dia', v50plus: '50+/dia',
    demora: 'Demora para responder', esfriam: 'Leads esfriam', equipe: 'Equipe não dá conta', horario: 'Fora do horário',
    eu: 'O próprio dono', vendedor: 'Um vendedor',
    pago: 'Tráfego pago', insta: 'Instagram orgânico', google: 'Google orgânico', indicacao: 'Indicação', parceiros: 'Parceiros/influenciadores',
    detalhes: 'Sabe os números em detalhes', nocao: 'Noção por alto', semnumeros: 'Não sabe os números',
    urgente: 'Urgência alta', media: 'Urgência média (30 dias)', baixa: 'Só pesquisando',
    sim: 'Sim', entender: 'Quer entender como funciona', nao: 'Não é o momento'
  };
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var CAL_LINK = 'squad-vendas/60-min';
  var CAL_NS = '60-min-quiz';

  /* ---------- estado ---------- */
  function lerJson(store, chave, padrao) {
    try { var v = store.getItem(chave); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; }
  }
  var respostas = lerJson(sessionStorage, 'wq_respostas', {});
  var step = parseInt(sessionStorage.getItem('wq_step') || '0', 10) || 0;
  var agendado = lerJson(sessionStorage, 'wq_agendado', null);
  var sessaoId = sessionStorage.getItem('wq_sessao') || null;
  var direcao = 1;
  var timers = [];
  var calIniciado = false;

  var leadId = localStorage.getItem('wq_lead_id');
  if (!leadId) {
    leadId = 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('wq_lead_id', leadId);
  }

  function salvarRespostas() { try { sessionStorage.setItem('wq_respostas', JSON.stringify(respostas)); } catch (e) {} }
  function nomeLead() { return (respostas.nome || '').trim(); }

  function utm() {
    try {
      var p = new URLSearchParams(location.search);
      var u = lerJson(localStorage, 'wq_utm', {});
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
        var v = p.get(k); if (v) u[k] = v;
      });
      localStorage.setItem('wq_utm', JSON.stringify(u));
      return u;
    } catch (e) { return {}; }
  }

  /* ---------- telemetria ---------- */
  function post(rota, corpo) {
    if (!ENDPOINT) return Promise.resolve(null);
    return fetch(ENDPOINT + '/' + rota, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      keepalive: true
    }).then(function (r) { return r.json(); }).catch(function () { return null; });
  }
  function evento(tipo, extra) {
    var corpo = { sessao_id: sessaoId, lead_id: leadId, tipo: tipo, tela: SEQ[step] || (step === AGENDAR ? 'agendar' : 'pos'), etapa: step };
    if (extra) for (var k in extra) corpo[k] = extra[k];
    post('event', corpo);
  }
  function lead(extra) {
    var corpo = { lead_id: leadId, sessao_id: sessaoId, respostas: respostas, utm: utm() };
    if (extra) for (var k in extra) corpo[k] = extra[k];
    post('lead', corpo);
  }
  function pixel() {
    try { if (window.fbq) window.fbq.apply(null, arguments); } catch (e) {}
  }

  function iniciarSessao() {
    if (sessaoId) return;
    post('sessao', {
      lead_id: leadId,
      utm: utm(),
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
      pagina: location.pathname,
      largura: window.innerWidth
    }).then(function (r) {
      if (r && r.sessao_id) {
        sessaoId = r.sessao_id;
        try { sessionStorage.setItem('wq_sessao', sessaoId); } catch (e) {}
        evento('inicio', {});
      }
    });
  }

  /* ---------- DOM ---------- */
  var $ = function (s, raiz) { return (raiz || document).querySelector(s); };
  var $$ = function (s, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(s)); };

  var telas = {};
  $$('.tela').forEach(function (t) { telas[t.dataset.tela] = t; });

  // marca templates de {{nome}}
  $$('.tela *').forEach(function (el) {
    if (el.children.length === 0 && el.textContent.indexOf('{{nome}}') !== -1) {
      el.dataset.tpl = el.textContent;
    } else if (el.childNodes.length > 1) {
      Array.prototype.forEach.call(el.childNodes, function (n) {
        if (n.nodeType === 3 && n.nodeValue.indexOf('{{nome}}') !== -1 && !el.dataset.tpl) {
          el.dataset.tpl = el.innerHTML;
          el.dataset.tplHtml = '1';
        }
      });
    }
  });
  // casos com <br/> dentro do template
  $$('.tela h2').forEach(function (el) {
    if (!el.dataset.tpl && el.innerHTML.indexOf('{{nome}}') !== -1) {
      el.dataset.tpl = el.innerHTML;
      el.dataset.tplHtml = '1';
    }
  });

  function interpolar() {
    var nm = nomeLead();
    $$('[data-tpl]').forEach(function (el) {
      var t = el.dataset.tpl;
      var out;
      if (nm) out = t.split('{{nome}}').join(nm);
      else out = t.replace(/,\s*\{\{nome\}\}/g, '').replace(/\{\{nome\}\},\s*/g, '').replace(/\{\{nome\}\}/g, 'você');
      if (el.dataset.tplHtml) el.innerHTML = out; else el.textContent = out;
    });
  }

  /* ---------- barra de progresso ---------- */
  var progresso = $('#progresso');
  for (var i = 1; i < SEQ.length; i++) progresso.appendChild(document.createElement('span'));
  function pintarProgresso() {
    $$('#progresso span').forEach(function (s, i) {
      s.className = (i + 1 <= Math.min(step, SEQ.length - 1)) ? 'feito' : '';
    });
  }

  /* ---------- rodapé ---------- */
  var rodBotao = $('#rodape-botao'), rodInput = $('#rodape-input'), rodDados = $('#rodape-dados');
  var btnContinuar = $('#btn-continuar');
  var glowWrap = $('#rodape-botao .glow-wrap');
  var inputTexto = $('#input-texto');
  var btnEnviar = $('#btn-enviar');
  var trava = 0, travaTimer = null;

  function esconderRodape() {
    rodBotao.hidden = true; rodInput.hidden = true; rodDados.hidden = true;
    $('#rodape-input').classList.remove('invalido');
  }

  function armarTrava(segundos, rotulo) {
    clearInterval(travaTimer);
    trava = segundos;
    function pinta() {
      if (trava > 0) {
        glowWrap.classList.add('travado');
        btnContinuar.textContent = rotulo.replace(/\s*→\s*$/, '') + ' · ' + trava + 's';
      } else {
        glowWrap.classList.remove('travado');
        btnContinuar.textContent = rotulo;
        clearInterval(travaTimer);
      }
    }
    pinta();
    if (segundos > 0) travaTimer = setInterval(function () { trava--; pinta(); }, 1000);
  }

  /* ---------- revelação progressiva ---------- */
  function palavras(el) { return ((el.textContent || '').trim().split(/\s+/) || []).length; }
  function leitura(el) { return Math.min(RITMO_MAX, Math.max(3, palavras(el) / 3.3)); }

  function montarRevelacao(tela) {
    var filhos = $$(':scope > *', tela).filter(function (el) { return el.offsetHeight > 0 || el.tagName !== 'STYLE'; });
    filhos.forEach(function (el) { el.classList.remove('rev-oculto', 'rev-entra'); });
    if (!tela.classList.contains('revelacao') || direcao < 0) return 0;
    var imediatos = filhos[0] && filhos[0].classList && filhos[0].classList.contains('insert-icone') ? 3 : 2;
    var alvos = filhos.slice(imediatos);
    if (!alvos.length) return 0;
    // calcula a cadência pela leitura e normaliza para no máx. 6s no total
    var TOTAL_MAX = 6;
    var tempos = [];
    var t = 0;
    alvos.forEach(function (el, i) {
      t = i === 0 ? 0.9 : t + leitura(alvos[i - 1]);
      tempos.push(t);
    });
    var escala = (t + 0.8) > TOTAL_MAX ? (TOTAL_MAX - 0.8) / t : 1;
    alvos.forEach(function (el, i) {
      el.classList.add('rev-oculto');
      (function (alvo, quando) {
        timers.push(setTimeout(function () { alvo.classList.add('rev-entra'); }, quando * 1000));
      })(el, tempos[i] * escala);
    });
    return Math.min(t + 0.8, TOTAL_MAX); // último bloco visível + fade
  }

  /* ---------- navegação ---------- */
  function pulada(nome) {
    if (DOR_TELA[nome]) return DOR_TELA[nome] !== respostas.dor;
    if (nome === 'analise' && direcao < 0) return true;
    return false;
  }

  function ir(n) {
    direcao = n > step ? 1 : -1;
    var alvo = Math.max(0, Math.min(POS, n));
    var guarda = 0;
    while (alvo > 0 && alvo < SEQ.length && pulada(SEQ[alvo]) && guarda < 40) { alvo += direcao; guarda++; }
    alvo = Math.max(0, Math.min(POS, alvo));
    if (alvo === step && guarda === 0 && n !== step) return;
    step = alvo;
    try { sessionStorage.setItem('wq_step', String(step)); } catch (e) {}
    render();
    evento('tela', {});
  }

  function render() {
    timers.forEach(clearTimeout); timers = [];
    interpolar();
    pintarProgresso();
    esconderRodape();
    try { var ae = document.activeElement; if (ae && ae.blur) ae.blur(); } catch (e) {}
    window.scrollTo(0, 0);

    var nome = step === AGENDAR ? 'agendar' : step === POS ? 'pos' : SEQ[step];
    $$('.tela').forEach(function (t) { t.classList.remove('ativa', 'com-rodape'); });
    var tela = telas[nome];
    if (!tela) return;
    tela.classList.add('ativa');

    $('#btn-voltar').style.visibility = step > 0 && nome !== 'pos' ? 'visible' : 'hidden';

    var ehPergunta = tela.classList.contains('pergunta');
    var semBotao = ehPergunta || ['nome', 'analise', 'dados', 'obrigado', 'agendar', 'pos'].indexOf(nome) !== -1;

    if (!semBotao) {
      tela.classList.add('com-rodape');
      rodBotao.hidden = false;
    }
    if (nome === 'nome') {
      tela.classList.add('com-rodape');
      rodInput.hidden = false;
      inputTexto.placeholder = 'Digite seu nome aqui';
      inputTexto.value = '';
      inputTexto.dataset.modo = 'nome';
    }
    if (nome === 'dados') {
      tela.classList.add('com-rodape');
      rodDados.hidden = false;
      $('#mes-atual').textContent = MESES[new Date().getMonth()];
      if (!$('#f-nome').value) $('#f-nome').value = respostas.contato_nome || nomeLead();
      if (!$('#f-email').value && respostas.contato_email) $('#f-email').value = respostas.contato_email;
    }

    var totalRev = montarRevelacao(tela);
    if (!semBotao) {
      var rotulo = ROTULO_BOTAO[nome] || 'Continuar →';
      var comAtraso = tela.classList.contains('revelacao') && direcao > 0;
      armarTrava(comAtraso ? Math.max(1, Math.ceil(totalRev || ATRASO_BOTAO)) : 0, rotulo);
    }

    if (nome === 'analise') rodarAnalise();
    if (nome === 'resultado') montarResultado();
    if (nome === 'agendar') montarCal();
    if (nome === 'pos') montarPos();

    encaixar(tela);
    timers.push(setTimeout(function () { encaixar(tela); }, 350));
  }

  /* ---------- encaixe: comprime a tela quando o conteúdo estoura a altura ---------- */
  function encaixar(tela) {
    if (!tela || !tela.classList.contains('ativa')) return;
    tela.style.transform = ''; tela.style.transformOrigin = ''; tela.style.width = '';
    tela.style.height = ''; tela.style.bottom = '';
    tela.classList.remove('apertada');
    tela.style.justifyContent = 'flex-start';
    var disp = tela.clientHeight;
    if (!disp || tela.scrollHeight <= disp + 1) { tela.style.justifyContent = ''; return; }
    tela.classList.add('apertada');
    if (tela.scrollHeight <= disp + 1) { tela.style.justifyContent = ''; return; }
    // solta a altura (o clip fica do tamanho do conteúdo) e escala para caber;
    // alargar muda a quebra de linhas, então re-mede até convergir no MAIOR fator que cabe
    tela.style.bottom = 'auto';
    tela.style.height = 'auto';
    tela.style.transformOrigin = '0 0';
    var fator = 1;
    for (var i = 0; i < 5; i++) {
      var alvo = Math.max(0.7, Math.min(1, disp / tela.scrollHeight));
      if (Math.abs(alvo - fator) < 0.01 && i > 0) break;
      fator = alvo;
      tela.style.width = (100 / fator) + '%';
      tela.style.transform = 'scale(' + fator + ')';
    }
    // distribui a folga: centraliza verticalmente o conteúdo escalado
    var sobra = disp - tela.scrollHeight * fator;
    if (sobra > 4) tela.style.transform = 'translateY(' + Math.round(sobra / 2) + 'px) scale(' + fator + ')';
  }

  /* ---------- análise ---------- */
  function rodarAnalise() {
    var itens = $$('.analise-item');
    itens.forEach(function (el) { el.classList.remove('rodando', 'feita'); });
    itens.forEach(function (el, i) {
      timers.push(setTimeout(function () {
        el.classList.add('rodando');
        if (i > 0) itens[i - 1].classList.replace('rodando', 'feita');
      }, i * 750));
    });
    timers.push(setTimeout(function () {
      itens[itens.length - 1].classList.replace('rodando', 'feita');
    }, itens.length * 750));
    timers.push(setTimeout(function () { ir(step + 1); }, itens.length * 750 + 800));
  }

  /* ---------- resultado ---------- */
  function montarResultado() {
    var nm = nomeLead();
    $('#resultado-titulo').innerHTML = (nm ? 'Boa notícia, ' + nm.replace(/[<>&]/g, '') + '. ' : 'Boa notícia. ') + 'Seu perfil foi <em>aprovado!</em>';
    var setorOutro = (respostas.setor_outro || '').trim();
    $('#resultado-1').textContent = respostas.setor === 'outro' && setorOutro
      ? 'Feito para ' + setorOutro + ': o Waz aprende com as suas conversas reais e vende do jeito que o seu cliente compra.'
      : (MAPA_SETOR[respostas.setor] || MAPA_SETOR.outro);
    $('#resultado-2').textContent = MAPA_VOLUME[respostas.volume] || 'O Waz atende seu volume de conversas, 24h por dia.';
    $('#resultado-3').textContent = MAPA_DOR[respostas.dor] || 'O Waz atende, qualifica e fecha vendas sozinho no seu WhatsApp.';
    $('#resultado-nota').textContent = NOTA_URGENCIA[respostas.urgencia] || 'Veja como funciona e agende uma conversa com nosso time.';
    pixel('trackCustom', 'QuizResultado', {});
    evento('resultado', {});

  }

  /* ---------- formulário ---------- */
  function mascaraWhats(v) {
    var d = v.replace(/\D/g, '').replace(/^55/, '').slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  $('#f-whats').addEventListener('input', function () { this.value = mascaraWhats(this.value); });

  /* validação de verdade: DDD real, celular com 9, e-mail com domínio sadio e typos comuns */
  var DDDS_BR = ('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 ' +
    '51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99').split(' ');
  var TYPO_DOMINIO = {
    'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmai.com': 'gmail.com',
    'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.com.br': 'gmail.com',
    'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
    'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com',
    'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com', 'outlook.co': 'outlook.com', 'outlook.con': 'outlook.com',
    'yaho.com': 'yahoo.com', 'yahho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
    'iclound.com': 'icloud.com', 'icloud.co': 'icloud.com'
  };
  function erroEmail(email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Digite um e-mail válido';
    var dominio = email.split('@').pop().toLowerCase();
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(dominio)) return 'Digite um e-mail válido';
    if (TYPO_DOMINIO[dominio]) return 'Confere o e-mail: você quis dizer @' + TYPO_DOMINIO[dominio] + '?';
    return '';
  }
  function erroWhats(dig) {
    if (dig.length < 10 || dig.length > 11) return 'Digite o WhatsApp com DDD';
    if (DDDS_BR.indexOf(dig.slice(0, 2)) === -1) return 'Esse DDD não existe no Brasil';
    if (dig.length === 11 && dig.charAt(2) !== '9') return 'Celular começa com 9 depois do DDD';
    if (/^(\d)\1+$/.test(dig.slice(2))) return 'Esse número não parece real';
    return '';
  }
  function confirmarDados() {
    var ok = true;
    var nome = $('#f-nome').value.trim();
    var email = $('#f-email').value.trim();
    var dig = $('#f-whats').value.replace(/\D/g, '');
    $$('.campo').forEach(function (c) { c.classList.remove('invalido'); });
    if (nome.length < 2) { $('#f-nome').closest('.campo').classList.add('invalido'); ok = false; }
    var eEmail = erroEmail(email);
    if (eEmail) { $('#erro-email').textContent = eEmail; $('#f-email').closest('.campo').classList.add('invalido'); ok = false; }
    var eWhats = erroWhats(dig);
    if (eWhats) { $('#erro-whats').textContent = eWhats; $('#f-whats').closest('.campo').classList.add('invalido'); ok = false; }
    if (!ok) return;
    respostas.contato_nome = nome;
    respostas.contato_email = email;
    respostas.contato_whats = '+55' + dig;
    if (!respostas.nome) {
      var primeiro = nome.split(' ')[0];
      respostas.nome = primeiro.charAt(0).toUpperCase() + primeiro.slice(1);
    }
    salvarRespostas();
    pixel('trackCustom', 'QuizDados', {});
    evento('dados', {});
    lead({ nome: nome, email: email, whatsapp: '+55' + dig });
    ir(step + 1);
  }
  $('#btn-liberar').addEventListener('click', confirmarDados);

  /* ---------- nome / outro setor ---------- */
  function confirmarInput() {
    var modo = inputTexto.dataset.modo;
    var v = inputTexto.value.trim().replace(/\s+/g, ' ');
    if (v.length < 2) { rodInput.classList.add('invalido'); return; }
    rodInput.classList.remove('invalido');
    if (modo === 'nome') {
      var primeiro = v.split(' ')[0];
      respostas.nome = primeiro.charAt(0).toUpperCase() + primeiro.slice(1);
      salvarRespostas();
      pixel('trackCustom', 'QuizResposta', { pergunta: 'nome' });
      evento('resposta', { pergunta: 'nome', resposta: respostas.nome });
      lead({ nome: respostas.nome });
    } else {
      respostas.setor = 'outro';
      respostas.setor_outro = v;
      salvarRespostas();
      pixel('trackCustom', 'QuizResposta', { pergunta: 'setor', resposta: 'outro: ' + v });
      evento('resposta', { pergunta: 'setor', resposta: 'outro: ' + v });
    }
    ir(step + 1);
  }
  btnEnviar.addEventListener('click', confirmarInput);
  inputTexto.addEventListener('keydown', function (e) { if (e.key === 'Enter') confirmarInput(); });
  inputTexto.addEventListener('input', function () { rodInput.classList.remove('invalido'); });

  /* ---------- cliques em opções ---------- */
  document.addEventListener('click', function (e) {
    var op = e.target.closest('.opcao');
    if (!op) return;
    var tela = op.closest('.tela');
    var pergunta = tela.dataset.tela;
    var valor = op.dataset.valor;

    if (pergunta === 'setor' && valor === 'outro') {
      op.classList.add('marcada');
      tela.classList.add('com-rodape');
      esconderRodape();
      rodInput.hidden = false;
      inputTexto.placeholder = 'Digite aqui o seu setor';
      inputTexto.value = '';
      inputTexto.dataset.modo = 'setor';
      inputTexto.focus();
      return;
    }

    respostas[pergunta] = valor;
    salvarRespostas();
    if (pergunta !== 'investimento' && pergunta !== 'prova') op.classList.add('marcada');
    pixel('trackCustom', 'QuizResposta', { pergunta: pergunta, resposta: valor });
    evento('resposta', { pergunta: pergunta, resposta: valor });

    if (pergunta === 'investimento') {
      lead({ investimento: valor });
      setTimeout(function () { ir(valor === 'sim' ? AGENDAR : step + 1); }, 200);
      return;
    }
    setTimeout(function () { ir(step + 1); }, 220);
  });

  /* ---------- botões fixos ---------- */
  btnContinuar.addEventListener('click', function () { if (trava <= 0) ir(step + 1); });
  $('#btn-voltar').addEventListener('click', function () { ir(step - 1); });
  $('#agendar-voltar').addEventListener('click', function () { ir(IDX_INVESTIMENTO); });

  /* ---------- Cal.com ---------- */
  function montarCal() {
    if (calIniciado) return;
    calIniciado = true;
    var w = window;
    (function (C, A, L) {
      var p = function (a, ar) { a.q.push(ar); };
      var d = C.document;
      C.Cal = C.Cal || function () {
        var cal = C.Cal; var ar = arguments;
        if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; }
        if (ar[0] === L) {
          var api = function () { p(api, arguments); };
          var namespace = ar[1]; api.q = api.q || [];
          if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(w, 'https://app.cal.com/embed/embed.js', 'init');

    var resumo = [
      'Nome: ' + (respostas.contato_nome || nomeLead() || '-'),
      'E-mail: ' + (respostas.contato_email || '-'),
      'Whats: ' + (respostas.contato_whats || '-'),
      'Setor: ' + (ROTULOS[respostas.setor] || '-') + (respostas.setor_outro ? ' (' + respostas.setor_outro + ')' : ''),
      'Conversas/dia: ' + (ROTULOS[respostas.volume] || '-'),
      'Atende hoje: ' + (ROTULOS[respostas.atendimento] || '-'),
      'Dor: ' + (ROTULOS[respostas.dor] || '-'),
      'Origem: ' + (ROTULOS[respostas.origem] || '-'),
      'Números: ' + (ROTULOS[respostas.numeros] || '-'),
      'Urgência: ' + (ROTULOS[respostas.urgencia] || '-')
    ].join(' | ');

    w.Cal('init', CAL_NS, { origin: 'https://cal.com' });
    w.Cal.ns[CAL_NS]('inline', {
      elementOrSelector: '#cal-container',
      calLink: CAL_LINK,
      layout: 'month_view',
      config: {
        notes: resumo,
        name: respostas.contato_nome || nomeLead() || '',
        email: respostas.contato_email || '',
        attendeePhoneNumber: respostas.contato_whats || '',
        smsReminderNumber: respostas.contato_whats || ''
      }
    });
    w.Cal.ns[CAL_NS]('ui', { hideEventTypeDetails: true, styles: { branding: { brandColor: '#16A34A' } } });
    // some com a headline quando o lead escolhe o horário (form de confirmação do Cal)
    function cabecalhoAgendar(mostrar) {
      var t = telas.agendar;
      if (!t) return;
      t.classList.toggle('sem-cabecalho', !mostrar);
      encaixar(t);
    }
    // o form de confirmação do Cal é sempre bem mais baixo (~400px) que o calendário (~730px):
    // altura interna abaixo do limiar = lead está no form -> esconde a headline
    w.Cal.ns[CAL_NS]('on', {
      action: '__dimensionChanged',
      callback: function (e) {
        try {
          var h = e.detail && e.detail.data && e.detail.data.iframeHeight;
          if (typeof h === 'number' && h > 0) cabecalhoAgendar(h >= 560);
        } catch (x) {}
      }
    });
    w.Cal.ns[CAL_NS]('on', {
      action: 'bookingSuccessful',
      callback: function (ev) {
        var quando = '';
        try {
          var d2 = (ev && ev.detail && ev.detail.data) || {};
          var iso = d2.date || (d2.booking && (d2.booking.startTime || d2.booking.start)) || d2.startTime || null;
          if (iso) {
            var dt = new Date(iso);
            if (!isNaN(dt.getTime())) {
              quando = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) +
                ', às ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            }
          }
        } catch (e) {}
        agendado = { quando: quando };
        try { sessionStorage.setItem('wq_agendado', JSON.stringify(agendado)); } catch (e) {}
        pixel('track', 'Lead', { content_name: 'agendamento-demo-waz-quiz' });
        evento('agendou', { extra: { quando: quando } });
        lead({ agendou: true, agendamento_quando: quando });
        ir(POS);
      }
    });
  }

  /* ---------- pós-agendamento ---------- */
  function montarPos() {
    var badge = $('#agendado-quando');
    if (agendado && agendado.quando) {
      badge.hidden = false;
      $('span', badge).textContent = agendado.quando;
    } else badge.hidden = true;
    var ifr = $('#insta-embed');
    if (ifr.src === 'about:blank' || !ifr.src) ifr.src = ifr.dataset.src;
  }

  /* ---------- largura real do aparelho (Safari renderiza layout mais largo) ---------- */
  function ajustarLargura() {
    var w = (window.visualViewport && window.visualViewport.width) || window.innerWidth;
    document.documentElement.style.setProperty('--vwreal', Math.round(w) + 'px');
    var ae = document.activeElement;
    var digitando = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
    if (!digitando) encaixar(document.querySelector('.tela.ativa'));
  }
  ajustarLargura();
  window.addEventListener('resize', ajustarLargura);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', ajustarLargura);
  setTimeout(ajustarLargura, 300);

  /* ---------- trava de arrasto (iOS/Android): página imóvel ---------- */
  document.addEventListener('touchmove', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#cal-container, #insta-embed, input, textarea')) return;
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('scroll', function () {
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  }, { passive: true });

  /* ---------- início ---------- */
  if (agendado && step < POS && step > IDX_INVESTIMENTO) step = POS;
  iniciarSessao();
  render();
})();
