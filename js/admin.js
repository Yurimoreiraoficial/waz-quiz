/* Painel do Waz Quiz — métricas do funil (Supabase + magic-link) */
(function () {
  'use strict';
  var script = document.currentScript;
  var sb = window.supabase.createClient(script.dataset.supabaseUrl, script.dataset.supabaseAnon);

  var SEQ = ['hero', 'prova', 'nome', 'setor', 'imagine', 'volume', 'atendimento', 'dor',
    'd-demora', 'd-esfriam', 'd-equipe', 'd-horario', 'origem', 'trafego', 'numeros', 'crm',
    'urgencia', 'analise', 'dados', 'resultado', 'setedias', 'autoridade', 'garantia',
    'investimento', 'obrigado', 'agendar', 'pos'];
  var NOME_TELA = {
    hero: 'Abertura', prova: 'Prova (Magalu)', nome: 'Nome', setor: 'Setor', imagine: 'Imagine',
    volume: 'Volume de leads', atendimento: 'Quem atende', dor: 'Maior dor',
    'd-demora': 'Insert demora', 'd-esfriam': 'Insert follow-up', 'd-equipe': 'Insert equipe', 'd-horario': 'Insert horário',
    origem: 'Origem dos leads', trafego: 'Insert tráfego', numeros: 'Clareza de números', crm: 'CRM',
    urgencia: 'Urgência', analise: 'Análise', dados: 'Formulário', resultado: 'Perfil aprovado',
    setedias: '7 dias', autoridade: 'Autoridade', garantia: 'Garantia', investimento: 'Investimento',
    obrigado: 'Não é o momento', agendar: 'Agenda', pos: 'Agendado'
  };
  var PERGUNTAS = ['setor', 'volume', 'atendimento', 'dor', 'origem', 'numeros', 'urgencia', 'investimento', 'prova'];
  var ROTULO_PERGUNTA = {
    prova: 'Busca esse resultado?', setor: 'Setor', volume: 'Leads por dia', atendimento: 'Quem atende hoje',
    dor: 'Maior dor', origem: 'Origem dos leads', numeros: 'Clareza dos números', urgencia: 'Urgência', investimento: 'R$ 2.000/mês faz sentido?'
  };

  var $ = function (s) { return document.querySelector(s); };
  var dias = 7, campanha = '', grafico = null;
  var dados = { sessoes: [], eventos: [], leads: [] };

  /* ---------- auth ---------- */
  function mostrarPainel() {
    $('#login').hidden = true;
    $('#painel').hidden = false;
    carregar();
  }
  $('#btn-login').addEventListener('click', function () {
    var email = $('#login-email').value.trim();
    if (!email) return;
    sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.href.split('#')[0] } })
      .then(function (r) {
        $('#login-msg').textContent = r.error ? 'Erro: ' + r.error.message : 'Link enviado! Confira seu e-mail.';
      });
  });
  $('#btn-sair').addEventListener('click', function () { sb.auth.signOut().then(function () { location.reload(); }); });
  sb.auth.getSession().then(function (r) { if (r.data.session) mostrarPainel(); });
  sb.auth.onAuthStateChange(function (_e, session) { if (session && $('#painel').hidden) mostrarPainel(); });

  /* ---------- filtros ---------- */
  document.querySelectorAll('.chip').forEach(function (c) {
    c.addEventListener('click', function () {
      document.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('ativo'); });
      c.classList.add('ativo');
      dias = parseInt(c.dataset.dias, 10);
      carregar();
    });
  });
  $('#filtro-campanha').addEventListener('change', function () { campanha = this.value; desenhar(); });
  $('#btn-atualizar').addEventListener('click', carregar);

  /* ---------- dados ---------- */
  function desde() {
    if (!dias) return '2020-01-01';
    var d = new Date(); d.setDate(d.getDate() - dias); d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  function carregar() {
    $('#status').textContent = 'Carregando…';
    var d = desde();
    Promise.all([
      sb.from('sessoes').select('*').gte('criado_em', d).order('criado_em', { ascending: false }).limit(5000),
      sb.from('eventos').select('*').gte('criado_em', d).order('criado_em', { ascending: true }).limit(20000),
      sb.from('leads').select('*').gte('criado_em', d).order('criado_em', { ascending: false }).limit(5000)
    ]).then(function (rs) {
      var erro = rs.find(function (r) { return r.error; });
      if (erro) { $('#status').textContent = 'Erro ao ler dados: ' + erro.error.message + ' (seu e-mail está na tabela admins?)'; return; }
      dados.sessoes = rs[0].data || [];
      dados.eventos = rs[1].data || [];
      dados.leads = rs[2].data || [];
      var campanhas = {};
      dados.sessoes.forEach(function (s) { var c = s.utm && s.utm.utm_campaign; if (c) campanhas[c] = 1; });
      var sel = $('#filtro-campanha');
      var atual = sel.value;
      sel.innerHTML = '<option value="">Todas as campanhas</option>' + Object.keys(campanhas).sort().map(function (c) {
        return '<option' + (c === atual ? ' selected' : '') + '>' + c + '</option>';
      }).join('');
      desenhar();
    });
  }

  function filtrar() {
    var sess = dados.sessoes.filter(function (s) { return !campanha || (s.utm && s.utm.utm_campaign === campanha); });
    var ids = {}; sess.forEach(function (s) { ids[s.id] = 1; });
    var leadIds = {}; sess.forEach(function (s) { leadIds[s.lead_id] = 1; });
    var evs = dados.eventos.filter(function (e) { return !campanha || ids[e.sessao_id] || leadIds[e.lead_id]; });
    var lds = dados.leads.filter(function (l) { return !campanha || (l.utm && l.utm.utm_campaign === campanha) || leadIds[l.lead_id]; });
    return { sessoes: sess, eventos: evs, leads: lds };
  }

  /* ---------- desenho ---------- */
  function desenhar() {
    var f = filtrar();
    var sess = f.sessoes, evs = f.eventos, lds = f.leads;
    $('#status').textContent = sess.length + ' visitas no período · atualizado ' + new Date().toLocaleTimeString('pt-BR');

    // etapa máxima por sessão
    var maxEtapa = {};
    evs.forEach(function (e) {
      if (e.tipo !== 'tela' && e.tipo !== 'inicio') return;
      var k = e.sessao_id || e.lead_id;
      var idx = SEQ.indexOf(e.tela);
      if (idx < 0) return;
      if (maxEtapa[k] === undefined || idx > maxEtapa[k]) maxEtapa[k] = idx;
    });
    var totalSessoes = Math.max(sess.length, Object.keys(maxEtapa).length);

    var comecaram = 0;
    Object.keys(maxEtapa).forEach(function (k) { if (maxEtapa[k] >= 1) comecaram++; });
    var leadsCompletos = lds.filter(function (l) { return l.email; }).length;
    var agendados = lds.filter(function (l) { return l.agendou; }).length;
    var simInvest = lds.filter(function (l) { return l.investimento === 'sim'; }).length;
    var naoInvest = lds.filter(function (l) { return l.investimento === 'nao'; }).length;

    function pct(a, b) { return b ? Math.round(100 * a / b) + '%' : '—'; }
    $('#kpis').innerHTML = [
      ['Visitas', totalSessoes, ''],
      ['Começaram o quiz', comecaram, pct(comecaram, totalSessoes) + ' das visitas'],
      ['Leads (formulário)', leadsCompletos, pct(leadsCompletos, totalSessoes) + ' das visitas'],
      ['Disseram sim ao preço', simInvest, naoInvest + ' disseram “não é o momento”'],
      ['Agendaram reunião', agendados, pct(agendados, leadsCompletos) + ' dos leads']
    ].map(function (k) {
      return '<div class="kpi"><b>' + k[1] + '</b><span>' + k[0] + '</span>' + (k[2] ? '<small>' + k[2] + '</small>' : '') + '</div>';
    }).join('');

    // funil por etapa
    var chegaram = SEQ.map(function (_t, i) {
      var n = 0;
      Object.keys(maxEtapa).forEach(function (k) { if (maxEtapa[k] >= i) n++; });
      return n;
    });
    var base = chegaram[0] || totalSessoes || 1;
    $('#funil').innerHTML = SEQ.map(function (t, i) {
      if (chegaram[i] === 0 && i > 0 && chegaram[i - 1] === 0) return '';
      var drop = i > 0 && chegaram[i - 1] > 0 ? chegaram[i - 1] - chegaram[i] : 0;
      return '<div class="funil-linha"><div class="funil-nome">' + (NOME_TELA[t] || t) + '</div>' +
        '<div class="funil-barra"><i style="width:' + Math.max(1, Math.round(100 * chegaram[i] / base)) + '%"></i></div>' +
        '<div class="funil-num">' + chegaram[i] + ' · ' + pct(chegaram[i], base) +
        (drop > 0 ? ' <em>-' + drop + '</em>' : '') + '</div></div>';
    }).join('');

    // tempos por tela
    var somas = {}, contagens = {};
    var porSessao = {};
    evs.forEach(function (e) {
      if (e.tipo !== 'tela' && e.tipo !== 'inicio') return;
      var k = e.sessao_id || e.lead_id; if (!k) return;
      (porSessao[k] = porSessao[k] || []).push(e);
    });
    Object.keys(porSessao).forEach(function (k) {
      var lista = porSessao[k];
      for (var i = 0; i < lista.length - 1; i++) {
        var dt = (new Date(lista[i + 1].criado_em) - new Date(lista[i].criado_em)) / 1000;
        if (dt > 0 && dt < 300) {
          var t = lista[i].tela;
          somas[t] = (somas[t] || 0) + dt;
          contagens[t] = (contagens[t] || 0) + 1;
        }
      }
    });
    $('#tempos').innerHTML = SEQ.filter(function (t) { return contagens[t]; }).map(function (t) {
      var media = somas[t] / contagens[t];
      var w = Math.min(100, Math.round(media * 2.2));
      return '<div class="dist"><div class="rotulo"><span>' + (NOME_TELA[t] || t) + '</span><b>' + media.toFixed(1) + 's</b></div>' +
        '<div class="barra"><i style="width:' + w + '%"></i></div></div>';
    }).join('') || '<span style="font-size:13px;color:#798282">Sem dados ainda.</span>';

    // distribuição de respostas
    var dist = {};
    evs.forEach(function (e) {
      if (e.tipo !== 'resposta' || !e.pergunta) return;
      var p = e.pergunta;
      (dist[p] = dist[p] || {})[e.resposta] = (dist[p][e.resposta] || 0) + 1;
    });
    $('#respostas').innerHTML = PERGUNTAS.filter(function (p) { return dist[p]; }).map(function (p) {
      var linhas = Object.keys(dist[p]).sort(function (a, b) { return dist[p][b] - dist[p][a]; });
      var total = linhas.reduce(function (s, r) { return s + dist[p][r]; }, 0);
      return '<div><h3>' + (ROTULO_PERGUNTA[p] || p) + '</h3>' + linhas.map(function (r) {
        var n = dist[p][r];
        return '<div class="dist"><div class="rotulo"><span>' + r + '</span><b>' + n + ' · ' + Math.round(100 * n / total) + '%</b></div>' +
          '<div class="barra"><i style="width:' + Math.round(100 * n / total) + '%"></i></div></div>';
      }).join('') + '</div>';
    }).join('') || '<span style="font-size:13px;color:#798282">Sem respostas ainda.</span>';

    // gráfico diário
    var porDia = {};
    function dia(x) { return new Date(x).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
    sess.forEach(function (s) { var d = dia(s.criado_em); (porDia[d] = porDia[d] || { v: 0, l: 0, a: 0 }).v++; });
    lds.forEach(function (l) {
      var d = dia(l.criado_em);
      porDia[d] = porDia[d] || { v: 0, l: 0, a: 0 };
      if (l.email) porDia[d].l++;
      if (l.agendou) porDia[d].a++;
    });
    var labels = Object.keys(porDia);
    if (grafico) grafico.destroy();
    grafico = new Chart($('#grafico-dias'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Visitas', data: labels.map(function (d) { return porDia[d].v; }), borderColor: '#A8B1AE', backgroundColor: 'transparent', tension: 0.3 },
          { label: 'Leads', data: labels.map(function (d) { return porDia[d].l; }), borderColor: '#0A0A0A', backgroundColor: 'transparent', tension: 0.3 },
          { label: 'Agendados', data: labels.map(function (d) { return porDia[d].a; }), borderColor: '#16A34A', backgroundColor: 'transparent', tension: 0.3 }
        ]
      },
      options: { plugins: { legend: { labels: { boxWidth: 12, font: { size: 11 } } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });

    // tabela de leads
    var R = {
      saude: 'Saúde', imobiliario: 'Imobiliário', ecommerce: 'E-commerce', b2b: 'B2B', delivery: 'Delivery', outro: 'Outro',
      v10: '<10', v20: '10-20', v50: '20-50', v50plus: '50+',
      demora: 'Demora', esfriam: 'Follow-up', equipe: 'Equipe', horario: 'Horário',
      urgente: 'Alta', media: 'Média', baixa: 'Baixa'
    };
    $('#tabela-leads tbody').innerHTML = lds.map(function (l) {
      var r = l.respostas || {};
      var setor = R[r.setor] || r.setor || '—';
      if (r.setor === 'outro' && r.setor_outro) setor = r.setor_outro;
      return '<tr>' +
        '<td>' + new Date(l.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + new Date(l.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '</td>' +
        '<td><b>' + (l.nome || '—') + '</b></td>' +
        '<td>' + (l.whatsapp || '—') + '</td>' +
        '<td>' + (l.email || '—') + '</td>' +
        '<td>' + setor + '</td>' +
        '<td>' + (R[r.volume] || '—') + '</td>' +
        '<td>' + (R[r.dor] || '—') + '</td>' +
        '<td>' + (R[r.urgencia] || '—') + '</td>' +
        '<td>' + (l.investimento === 'sim' ? '<span class="tag ok">Sim</span>' : l.investimento === 'nao' ? '<span class="tag">Não</span>' : '—') + '</td>' +
        '<td>' + (l.agendou ? '<span class="tag ok">✓ ' + (l.agendamento_quando || 'Sim') + '</span>' : '—') + '</td>' +
        '<td>' + ((l.utm && l.utm.utm_campaign) || '—') + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="11" style="color:#798282">Nenhum lead no período.</td></tr>';
  }

  /* ---------- CSV ---------- */
  $('#btn-csv').addEventListener('click', function () {
    var f = filtrar();
    var linhas = [['data', 'nome', 'whatsapp', 'email', 'setor', 'setor_outro', 'volume', 'atendimento', 'dor', 'origem', 'numeros', 'urgencia', 'investimento', 'agendou', 'agendamento', 'utm_source', 'utm_campaign', 'utm_content']];
    f.leads.forEach(function (l) {
      var r = l.respostas || {}, u = l.utm || {};
      linhas.push([l.criado_em, l.nome, l.whatsapp, l.email, r.setor, r.setor_outro, r.volume, r.atendimento, r.dor, r.origem, r.numeros, r.urgencia, l.investimento, l.agendou, l.agendamento_quando, u.utm_source, u.utm_campaign, u.utm_content]);
    });
    var csv = linhas.map(function (l) {
      return l.map(function (c) { return '"' + String(c === undefined || c === null ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'waz-quiz-leads.csv';
    a.click();
  });
})();
