

# Plano: Backup Completo do Banco de Dados

Vou exportar todas as tabelas do banco de dados em um arquivo Excel organizado por abas, e gerar uma lista com todos os links públicos dos arquivos no Storage.

## O que será exportado

**Banco de Dados (Excel com abas):**
- profiles, checkins, daily_content, courses, course_modules, course_lessons
- user_sessions, user_roles, subscriptions, lesson_progress, lesson_analytics
- meditation_analytics_events, daily_content_analytics, forum_topics, forum_replies
- scheduled_events, push_subscriptions, reports, role_audit_log

**Storage (arquivo TXT/CSV):**
- Lista de todos os arquivos nos 4 buckets (avatars, daily-content, course-images, lesson-content) com URLs públicas para download manual

## Entrega
- `/mnt/documents/backup_completo.xlsx` — todas as tabelas
- `/mnt/documents/backup_storage_links.csv` — links de todos os arquivos no Storage

## Passos técnicos
1. Consultar cada tabela via `SELECT *` e coletar os dados
2. Listar arquivos de cada bucket via Supabase Storage API
3. Gerar Excel com openpyxl (uma aba por tabela)
4. Gerar CSV com os links públicos dos arquivos
5. QA dos arquivos gerados

