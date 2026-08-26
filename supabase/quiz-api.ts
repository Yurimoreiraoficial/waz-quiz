// Edge Function: quiz-api
// Rotas: POST /sessao · POST /event · POST /lead
// Grava com service role (RLS bloqueia qualquer acesso direto do navegador).

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const s = (v: unknown, max = 500) =>
  typeof v === "string" ? v.slice(0, max) : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "método" }, 405);

  const rota = new URL(req.url).pathname.split("/").pop();
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch (_e) {
    return json({ erro: "json" }, 400);
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const pais = req.headers.get("cf-ipcountry") || null;

  try {
    if (rota === "sessao") {
      const { data, error } = await supabase
        .from("sessoes")
        .insert({
          lead_id: s(body.lead_id, 80) || "anon",
          utm: body.utm ?? null,
          user_agent: s(body.user_agent, 400),
          referrer: s(body.referrer, 400),
          pagina: s(body.pagina, 200),
          largura: Number(body.largura) || null,
          ip,
          pais,
        })
        .select("id")
        .single();
      if (error) throw error;
      return json({ sessao_id: data.id });
    }

    if (rota === "event") {
      const { error } = await supabase.from("eventos").insert({
        sessao_id: s(body.sessao_id, 40),
        lead_id: s(body.lead_id, 80),
        tipo: s(body.tipo, 40) || "evento",
        tela: s(body.tela, 80),
        etapa: Number.isFinite(Number(body.etapa)) ? Number(body.etapa) : null,
        pergunta: s(body.pergunta, 120),
        resposta: s(body.resposta, 300),
        extra: body.extra ?? null,
      });
      if (error) throw error;
      return json({ ok: true });
    }

    if (rota === "lead") {
      const lead_id = s(body.lead_id, 80);
      if (!lead_id) return json({ erro: "lead_id" }, 400);
      const patch: Record<string, unknown> = {
        lead_id,
        atualizado_em: new Date().toISOString(),
      };
      if (body.sessao_id) patch.sessao_id = s(body.sessao_id, 40);
      if (body.nome !== undefined) patch.nome = s(body.nome, 160);
      if (body.email !== undefined) patch.email = s(body.email, 200);
      if (body.whatsapp !== undefined) patch.whatsapp = s(body.whatsapp, 40);
      if (body.respostas !== undefined) patch.respostas = body.respostas;
      if (body.utm !== undefined) patch.utm = body.utm;
      if (body.investimento !== undefined)
        patch.investimento = s(body.investimento, 20);
      if (body.agendou === true) {
        patch.agendou = true;
        patch.agendamento_em = new Date().toISOString();
        if (body.agendamento_quando !== undefined)
          patch.agendamento_quando = s(body.agendamento_quando, 160);
      }
      if (pais) patch.pais = pais;
      const { error } = await supabase
        .from("leads")
        .upsert(patch, { onConflict: "lead_id" });
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ erro: "rota" }, 404);
  } catch (e) {
    console.error(e);
    return json({ erro: "interno" }, 500);
  }
});
