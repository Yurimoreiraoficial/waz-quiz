# Waz Quiz — funil de qualificação

Migração do funil `/waz-quiz` (Framer) para estrutura própria, no padrão do funil de ligação.

## Peças
| Camada | Onde | O quê |
|---|---|---|
| Front | GitHub Pages (este repo) | `index.html` + `css/` + `js/app.js` — 25 telas, sem dependências |
| Back | Supabase Edge Function `quiz-api` | rotas POST `/sessao` · `/event` · `/lead` (service role) |
| Banco | Supabase `waz-quiz` (`yiccjupbhruomiymzyiw`, São Paulo) | `sessoes`, `eventos`, `leads`, `admins` — RLS: só admins leem |
| Painel | `admin.html` | magic-link (tabela `admins`), funil por tela, drop-off, tempos, respostas, leads, CSV |
| Agendamento | Cal.com `squad-vendas/60-min` | embed pré-preenchido (nome, e-mail, WhatsApp, respostas nas notas) |
| Pixel | Meta `357259037316204` | PageView, QuizResposta, QuizDados, QuizResultado, Lead (agendamento) |

## Operação
- Produção: https://yurimoreiraoficial.github.io/waz-quiz/
- Painel: https://yurimoreiraoficial.github.io/waz-quiz/admin.html (e-mail precisa estar na tabela `admins`)
- Deploy do front: `git push` (Pages serve da branch `main`)
- Schema e função: `supabase/schema.sql` e `supabase/quiz-api.ts` (aplicados via dashboard)
- Senha do banco Postgres: gerada em 26/08/2026, com o Yuri
