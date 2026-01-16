# Test Plan - MVP Officina da Alma

## Regras Globais (validar em TODAS as telas)

| Regra | Critério de Aceite |
|-------|-------------------|
| Formato de Data | Datas exibidas em **DD/MM/AAAA** (não ISO) |
| Loading State | Skeleton ou spinner visível durante carregamento |
| Empty State | Mensagem clara quando não há dados (ex: "Nenhum check-in encontrado") |
| Error State | Mensagem de erro + botão "Tentar novamente" |
| Foco Visível | Outline visível ao navegar com Tab |
| Labels | Todos os inputs têm label associado |
| Botões | Texto descritivo (não apenas ícone) |
| Modais | Fechar com ESC + trap focus |
| Segurança Premium | URLs de mídia premium não vazam para não-premium |

---

## A) Autenticação e Roles

### A1. Signup de novo usuário
| Step | Ação |
|------|------|
| **Given** | Um visitante não autenticado |
| **When** | Preencher formulário de cadastro e submeter |
| **Then** | ✅ Criar registro em `profiles` com `id = auth.uid()` |
| **And** | ✅ Criar registro em `user_roles` com `role = 'user'` |
| **And** | ✅ Redirecionar para `/completar-perfil` ou `/` |

### A2. Login com credenciais válidas
| Step | Ação |
|------|------|
| **Given** | Um usuário cadastrado |
| **When** | Inserir email/senha corretos e submeter |
| **Then** | ✅ Autenticar e redirecionar para Home |
| **And** | ✅ Exibir nome do usuário no header |

### A3. Login com credenciais inválidas
| Step | Ação |
|------|------|
| **Given** | Email ou senha incorretos |
| **When** | Submeter formulário |
| **Then** | ✅ Exibir "Email ou senha incorretos" |
| **And** | ✅ Não redirecionar |

### A4. Login com Google
| Step | Ação |
|------|------|
| **Given** | Botão "Continuar com Google" |
| **When** | Clicar e autorizar no Google |
| **Then** | ✅ Criar/atualizar `profiles` |
| **And** | ✅ Redirecionar para Home |

### A5. Logout
| Step | Ação |
|------|------|
| **Given** | Usuário autenticado |
| **When** | Clicar em "Sair" |
| **Then** | ✅ Encerrar sessão |
| **And** | ✅ Redirecionar para `/login` |
| **And** | ✅ Bloquear acesso a rotas protegidas |

### A6. Guard de rotas admin (usuário comum)
| Step | Ação |
|------|------|
| **Given** | Usuário com `role = 'user'` |
| **When** | Tentar acessar `/admin/conteudo-diario` |
| **Then** | ✅ Bloquear acesso |
| **And** | ✅ Redirecionar para Home |
| **And** | ✅ Exibir mensagem de permissão negada |

### A7. Guard de rotas admin (moderador)
| Step | Ação |
|------|------|
| **Given** | Usuário com `role = 'moderator'` |
| **When** | Acessar `/admin/conteudo-diario` e `/admin/cursos` |
| **Then** | ✅ Permitir acesso |
| **And** | ✅ Exibir painel administrativo |

---

## B) Conteúdo Diário (Admin)

### B1. Criar conteúdo de hoje (rascunho)
| Step | Ação |
|------|------|
| **Given** | Moderador em `/admin/conteudo-diario` |
| **When** | Selecionar "Hoje", preencher Tônica obrigatória, salvar rascunho |
| **Then** | ✅ Criar/atualizar `daily_content` com `published = false` |
| **And** | ✅ Exibir "Conteúdo salvo." |

### B2. Publicar conteúdo
| Step | Ação |
|------|------|
| **Given** | Conteúdo salvo como rascunho |
| **When** | Clicar "Publicar" |
| **Then** | ✅ Setar `published = true` |
| **And** | ✅ Exibir "Conteúdo publicado." |
| **And** | ✅ Home exibe Tônica do Dia sem erro |

### B3. Validação de campos obrigatórios
| Step | Ação |
|------|------|
| **Given** | Formulário incompleto |
| **When** | Tentar publicar sem "Título da Tônica" |
| **Then** | ✅ Exibir "Falta preencher: Título da Tônica." |
| **And** | ✅ Não salvar |

### B4. Formato de data no painel
| Step | Ação |
|------|------|
| **Given** | Data selecionada no calendário |
| **When** | Exibir data no painel |
| **Then** | ✅ Formato DD/MM/AAAA (ex: 16/01/2026) |

### B5. Adicionar URL do Spotify
| Step | Ação |
|------|------|
| **Given** | Campo de URL do Spotify |
| **When** | Colar link de episódio válido |
| **Then** | ✅ Salvar `spotify_episode_url` |
| **And** | ✅ Home exibe player do episódio |

### B6. Adicionar meditação (premium)
| Step | Ação |
|------|------|
| **Given** | Campos de meditação |
| **When** | Preencher URL de áudio e duração |
| **Then** | ✅ Salvar `meditation_audio_url` e `meditation_duration_seconds` |
| **And** | ✅ Exibir apenas para usuários premium |

---

## C) Home (Ritual do Dia)

### C1. Carregamento paralelo
| Step | Ação |
|------|------|
| **Given** | Usuário autenticado |
| **When** | Abrir Home |
| **Then** | ✅ Carregar em paralelo: daily_content, checkin, subscription, streak |
| **And** | ✅ Exibir skeletons durante loading |
| **And** | ✅ Não travar UI |

### C2. Streak do mês
| Step | Ação |
|------|------|
| **Given** | X check-ins no mês atual |
| **When** | Abrir Home |
| **Then** | ✅ Exibir "X dias com check-in neste mês" |
| **And** | ✅ Se X=0, exibir mensagem de incentivo |

### C3. Tônica do dia (existe)
| Step | Ação |
|------|------|
| **Given** | `daily_content` existe e `published = true` |
| **When** | Abrir Home |
| **Then** | ✅ Exibir título + resumo |
| **And** | ✅ Botão "Ver mais" navega para `/tonica/:date` |

### C4. Tônica do dia (não existe)
| Step | Ação |
|------|------|
| **Given** | Sem `daily_content` para hoje |
| **When** | Abrir Home |
| **Then** | ✅ Exibir "Nenhuma tônica disponível para hoje." |

### C5. Meditação (premium)
| Step | Ação |
|------|------|
| **Given** | Usuário premium com meditação disponível |
| **When** | Abrir Home |
| **Then** | ✅ Exibir duração e botão "Ouvir agora" |
| **And** | ✅ Navegar para `/meditacao/:date` |

### C6. Meditação (não premium)
| Step | Ação |
|------|------|
| **Given** | Usuário não premium |
| **When** | Abrir Home |
| **Then** | ✅ Exibir badge "Premium" |
| **And** | ✅ Botão "Desbloquear Premium" navega para `/assinar` |
| **And** | ❌ Não exibir URL de áudio |

### C7. Spotify player (podcast)
| Step | Ação |
|------|------|
| **Given** | Home carregada |
| **When** | Visualizar seção Astrowake |
| **Then** | ✅ Exibir player do Spotify |
| **And** | ✅ Se `spotify_episode_url` existe, mostrar episódio específico |
| **And** | ✅ Se não existe, mostrar podcast completo |

---

## D) Check-in do Dia

### D1. Criar check-in
| Step | Ação |
|------|------|
| **Given** | Não existe check-in hoje |
| **When** | Preencher energia (1-10) + texto e salvar |
| **Then** | ✅ Criar `checkins` com `(user_id, date)` |
| **And** | ✅ Exibir "Check-in salvo." |

### D2. Editar check-in
| Step | Ação |
|------|------|
| **Given** | Check-in já existe hoje |
| **When** | Editar texto/energia e salvar |
| **Then** | ✅ Atualizar registro existente |
| **And** | ✅ Manter unicidade `(user_id, date)` |

### D3. Limite de caracteres
| Step | Ação |
|------|------|
| **Given** | Campo de texto do check-in |
| **When** | Digitar mais de 500 caracteres |
| **Then** | ✅ Truncar em 500 |
| **And** | ✅ Exibir contador "X/500" |

### D4. Privacidade - Privado
| Step | Ação |
|------|------|
| **Given** | `share_mode = 'private'` |
| **When** | Salvar check-in |
| **Then** | ✅ Não aparecer no feed da comunidade |

### D5. Privacidade - Comunidade
| Step | Ação |
|------|------|
| **Given** | `share_mode = 'community'` e `published = true` |
| **When** | Salvar check-in |
| **Then** | ✅ Aparecer no feed com nome do usuário |

### D6. Privacidade - Anônimo
| Step | Ação |
|------|------|
| **Given** | `share_mode = 'anonymous'` e `published = true` |
| **When** | Salvar check-in |
| **Then** | ✅ Aparecer no feed como "Anônimo" |
| **And** | ❌ Não revelar identidade |

### D7. Toggle publicado
| Step | Ação |
|------|------|
| **Given** | Check-in existente |
| **When** | Desligar "Publicado" |
| **Then** | ✅ Setar `published = false` |
| **And** | ✅ Remover do feed da comunidade |

### D8. Aviso de privacidade
| Step | Ação |
|------|------|
| **Given** | Primeira vez selecionando "Comunidade" ou "Anônimo" |
| **When** | Clicar no botão |
| **Then** | ✅ Exibir modal de aviso de privacidade |
| **And** | ✅ Só permitir após aceitar |

---

## E) Comunidade (/comunidade)

### E1. Feed janela 7 dias
| Step | Ação |
|------|------|
| **Given** | Usuário em `/comunidade` |
| **When** | Carregar feed |
| **Then** | ✅ Listar apenas check-ins com `date >= hoje-6` |
| **And** | ✅ Filtrar `published = true` e `share_mode IN ('community', 'anonymous')` |
| **And** | ✅ Ordenar por data DESC |

### E2. Anonimato no feed
| Step | Ação |
|------|------|
| **Given** | Check-in com `share_mode = 'anonymous'` |
| **When** | Exibir no feed |
| **Then** | ✅ Mostrar "Anônimo" como autor |
| **And** | ❌ Não exibir `display_name` ou `avatar_url` |

### E3. Identidade no feed (community)
| Step | Ação |
|------|------|
| **Given** | Check-in com `share_mode = 'community'` |
| **When** | Exibir no feed |
| **Then** | ✅ Mostrar `display_name` do autor |
| **And** | ✅ Mostrar `avatar_url` se disponível |

### E4. Empty state
| Step | Ação |
|------|------|
| **Given** | Nenhum check-in nos últimos 7 dias |
| **When** | Abrir `/comunidade` |
| **Then** | ✅ Exibir mensagem "Nenhum check-in compartilhado recentemente" |

---

## F) Reações no Feed

### F1. Adicionar reação
| Step | Ação |
|------|------|
| **Given** | Check-in no feed |
| **When** | Clicar em emoji de reação |
| **Then** | ✅ Criar `checkin_reactions` com `(checkin_id, user_id, emoji)` |
| **And** | ✅ Incrementar contador visual |

### F2. Remover reação
| Step | Ação |
|------|------|
| **Given** | Reação já adicionada |
| **When** | Clicar novamente no mesmo emoji |
| **Then** | ✅ Deletar `checkin_reactions` |
| **And** | ✅ Decrementar contador visual |

### F3. Uma reação por tipo por usuário
| Step | Ação |
|------|------|
| **Given** | Usuário já reagiu com ❤️ |
| **When** | Tentar adicionar outro ❤️ |
| **Then** | ✅ Toggle (remover) em vez de duplicar |

### F4. Múltiplos emojis
| Step | Ação |
|------|------|
| **Given** | Usuário reagiu com ❤️ |
| **When** | Adicionar 🔥 |
| **Then** | ✅ Permitir múltiplos emojis diferentes |

---

## G) Denúncias

### G1. Criar denúncia
| Step | Ação |
|------|------|
| **Given** | Check-in no feed |
| **When** | Clicar em "Denunciar" e preencher motivo |
| **Then** | ✅ Criar `reports` com `(checkin_id, reporter_user_id, reason, status='pending')` |
| **And** | ✅ Exibir "Denúncia enviada." |

### G2. Não denunciar próprio check-in
| Step | Ação |
|------|------|
| **Given** | Meu próprio check-in |
| **When** | Visualizar no feed |
| **Then** | ✅ Ocultar botão "Denunciar" |

### G3. Moderador vê denúncias
| Step | Ação |
|------|------|
| **Given** | Moderador em `/admin/moderacao` |
| **When** | Carregar página |
| **Then** | ✅ Listar denúncias pendentes |
| **And** | ✅ Exibir conteúdo do check-in + motivo |

### G4. Ação em denúncia
| Step | Ação |
|------|------|
| **Given** | Denúncia pendente |
| **When** | Moderador marcar como "Analisada" ou "Arquivada" |
| **Then** | ✅ Atualizar `status` do report |
| **And** | ✅ Remover da lista de pendentes |

---

## H) Diário (/diario)

### H1. Calendário mensal
| Step | Ação |
|------|------|
| **Given** | Usuário em `/diario` |
| **When** | Carregar página |
| **Then** | ✅ Exibir calendário do mês atual |
| **And** | ✅ Marcar dias com check-in |

### H2. Navegar meses
| Step | Ação |
|------|------|
| **Given** | Calendário exibido |
| **When** | Clicar em setas de navegação |
| **Then** | ✅ Mudar para mês anterior/próximo |
| **And** | ✅ Atualizar marcações de check-in |

### H3. Selecionar dia
| Step | Ação |
|------|------|
| **Given** | Dia com check-in marcado |
| **When** | Clicar no dia |
| **Then** | ✅ Exibir detalhes do check-in |
| **And** | ✅ Permitir edição |

### H4. Dia sem check-in
| Step | Ação |
|------|------|
| **Given** | Dia sem check-in |
| **When** | Clicar no dia |
| **Then** | ✅ Exibir opção de criar check-in retroativo |

### H5. Visualizar Tônica do dia
| Step | Ação |
|------|------|
| **Given** | Dia selecionado com `daily_content` |
| **When** | Exibir detalhes |
| **Then** | ✅ Mostrar Tônica daquele dia |
| **And** | ✅ Link para `/tonica/:date` |

---

## I) Assinatura (Mercado Pago)

### I1. Página de assinatura
| Step | Ação |
|------|------|
| **Given** | Usuário não premium em `/assinar` |
| **When** | Carregar página |
| **Then** | ✅ Exibir planos disponíveis |
| **And** | ✅ Exibir preços corretos |
| **And** | ✅ Destacar economia do plano anual |

### I2. Iniciar trial
| Step | Ação |
|------|------|
| **Given** | Usuário sem trial anterior |
| **When** | Clicar em "Começar Trial Grátis" |
| **Then** | ✅ Criar `subscriptions` com `trial_ends_at = hoje + 7 dias` |
| **And** | ✅ Desbloquear conteúdo premium |

### I3. Trial expirado
| Step | Ação |
|------|------|
| **Given** | `trial_ends_at < hoje` |
| **When** | Acessar conteúdo premium |
| **Then** | ✅ Bloquear acesso |
| **And** | ✅ Exibir "Trial expirado. Assine para continuar." |

### I4. Checkout mensal
| Step | Ação |
|------|------|
| **Given** | Plano mensal selecionado |
| **When** | Clicar em "Assinar" |
| **Then** | ✅ Redirecionar para checkout Mercado Pago |
| **And** | ✅ Após pagamento, criar `subscriptions` ativa |

### I5. Checkout anual (PIX)
| Step | Ação |
|------|------|
| **Given** | Plano anual selecionado |
| **When** | Escolher PIX como forma de pagamento |
| **Then** | ✅ Exibir QR Code |
| **And** | ✅ Após confirmação, ativar assinatura anual |

### I6. Webhook de pagamento
| Step | Ação |
|------|------|
| **Given** | Pagamento confirmado no Mercado Pago |
| **When** | Webhook recebido |
| **Then** | ✅ Atualizar `current_period_end` |
| **And** | ✅ Setar `provider_subscription_id` |

### I7. Assinatura expirada
| Step | Ação |
|------|------|
| **Given** | `current_period_end < hoje` |
| **When** | Acessar conteúdo premium |
| **Then** | ✅ Bloquear acesso |
| **And** | ✅ Exibir "Assinatura expirada. Renove para continuar." |

---

## J) Gating Premium

### J1. Meditação bloqueada
| Step | Ação |
|------|------|
| **Given** | Usuário não premium |
| **When** | Tentar acessar `/meditacao/:date` |
| **Then** | ✅ Redirecionar para `/assinar` ou exibir paywall |
| **And** | ❌ Não expor URL de áudio |

### J2. URL de mídia protegida
| Step | Ação |
|------|------|
| **Given** | Usuário não premium |
| **When** | Inspecionar Network requests |
| **Then** | ❌ `meditation_audio_url` não deve aparecer na resposta |

### J3. Cursos premium bloqueados
| Step | Ação |
|------|------|
| **Given** | Aula com `access_level = 'premium'` |
| **When** | Usuário não premium tentar acessar |
| **Then** | ✅ Exibir paywall |
| **And** | ❌ Não expor `media_url` |

---

## K) Cursos e Aulas

### K1. Listar cursos
| Step | Ação |
|------|------|
| **Given** | Usuário em `/aulas` |
| **When** | Carregar página |
| **Then** | ✅ Listar apenas cursos com `is_published = true` |
| **And** | ✅ Exibir título, descrição curta, imagem |

### K2. Ver detalhes do curso
| Step | Ação |
|------|------|
| **Given** | Curso publicado |
| **When** | Clicar no curso |
| **Then** | ✅ Navegar para `/curso/:slug` |
| **And** | ✅ Exibir módulos e aulas |

### K3. Módulos ordenados
| Step | Ação |
|------|------|
| **Given** | Curso com múltiplos módulos |
| **When** | Exibir página do curso |
| **Then** | ✅ Ordenar módulos por `position` ASC |
| **And** | ✅ Ordenar aulas dentro do módulo por `position` ASC |

### K4. Aula com conteúdo de texto
| Step | Ação |
|------|------|
| **Given** | Aula com `content_type = 'text'` |
| **When** | Acessar aula |
| **Then** | ✅ Renderizar `body_markdown` como HTML |

### K5. Aula com vídeo
| Step | Ação |
|------|------|
| **Given** | Aula com `content_type = 'video'` |
| **When** | Acessar aula |
| **Then** | ✅ Exibir player de vídeo |
| **And** | ✅ Carregar `media_url` |

### K6. Aula com áudio
| Step | Ação |
|------|------|
| **Given** | Aula com `content_type = 'audio'` |
| **When** | Acessar aula |
| **Then** | ✅ Exibir player de áudio |
| **And** | ✅ Controles de play/pause/seek |

---

## L) Player e Progresso

### L1. Salvar posição do vídeo/áudio
| Step | Ação |
|------|------|
| **Given** | Usuário assistindo aula |
| **When** | Pausar ou sair da página |
| **Then** | ✅ Salvar `last_position_seconds` em `lesson_progress` |

### L2. Retomar de onde parou
| Step | Ação |
|------|------|
| **Given** | `lesson_progress` existe para a aula |
| **When** | Abrir aula novamente |
| **Then** | ✅ Iniciar player na `last_position_seconds` |
| **And** | ✅ Exibir "Continuar de onde parou?" |

### L3. Marcar aula como concluída
| Step | Ação |
|------|------|
| **Given** | Progresso >= 90% |
| **When** | Atingir final do conteúdo |
| **Then** | ✅ Setar `completed_at` e `progress_percent = 100` |
| **And** | ✅ Exibir badge "Concluída" |

### L4. Progresso por aula
| Step | Ação |
|------|------|
| **Given** | Usuário com várias aulas assistidas |
| **When** | Ver lista de aulas do curso |
| **Then** | ✅ Exibir indicador de progresso por aula |
| **And** | ✅ Diferenciar: não iniciada, em progresso, concluída |

### L5. Progresso do curso
| Step | Ação |
|------|------|
| **Given** | Curso com 10 aulas |
| **When** | 5 aulas concluídas |
| **Then** | ✅ Exibir "50% concluído" no card do curso |

---

## M) Admin - Cursos (/admin/cursos)

### M1. Criar curso
| Step | Ação |
|------|------|
| **Given** | Moderador em `/admin/cursos` |
| **When** | Preencher título, slug, descrição e salvar |
| **Then** | ✅ Criar `courses` com `is_published = false` |

### M2. Adicionar módulo
| Step | Ação |
|------|------|
| **Given** | Curso criado |
| **When** | Adicionar módulo com título |
| **Then** | ✅ Criar `course_modules` com `position` automático |

### M3. Adicionar aula
| Step | Ação |
|------|------|
| **Given** | Módulo criado |
| **When** | Adicionar aula com título, tipo, mídia |
| **Then** | ✅ Criar `course_lessons` vinculada ao módulo |

### M4. Reordenar módulos/aulas
| Step | Ação |
|------|------|
| **Given** | Múltiplos módulos/aulas |
| **When** | Drag & drop para reordenar |
| **Then** | ✅ Atualizar `position` de todos os itens |

### M5. Publicar curso
| Step | Ação |
|------|------|
| **Given** | Curso com módulos e aulas |
| **When** | Clicar "Publicar" |
| **Then** | ✅ Setar `is_published = true` |
| **And** | ✅ Curso aparece em `/aulas` |

---

## N) Acessibilidade

### N1. Navegação por teclado
| Step | Ação |
|------|------|
| **Given** | Qualquer página |
| **When** | Navegar usando Tab |
| **Then** | ✅ Foco visível em todos os elementos interativos |
| **And** | ✅ Ordem lógica de navegação |

### N2. Labels em formulários
| Step | Ação |
|------|------|
| **Given** | Qualquer formulário |
| **When** | Inspecionar inputs |
| **Then** | ✅ Todos os inputs têm `<label>` associado ou `aria-label` |

### N3. Modais acessíveis
| Step | Ação |
|------|------|
| **Given** | Modal aberto |
| **When** | Pressionar ESC |
| **Then** | ✅ Modal fecha |
| **And** | ✅ Foco retorna ao elemento que abriu o modal |

### N4. Trap focus em modais
| Step | Ação |
|------|------|
| **Given** | Modal aberto |
| **When** | Navegar com Tab |
| **Then** | ✅ Foco permanece dentro do modal |
| **And** | ✅ Não escapa para conteúdo atrás |

### N5. Contraste de cores
| Step | Ação |
|------|------|
| **Given** | Texto em qualquer página |
| **When** | Verificar contraste |
| **Then** | ✅ Ratio mínimo 4.5:1 para texto normal |
| **And** | ✅ Ratio mínimo 3:1 para texto grande |

---

## O) Segurança

### O1. RLS em profiles
| Step | Ação |
|------|------|
| **Given** | Usuário autenticado |
| **When** | Consultar `profiles` |
| **Then** | ✅ Retornar apenas próprio perfil |
| **And** | ❌ Não expor dados de outros usuários |

### O2. RLS em checkins
| Step | Ação |
|------|------|
| **Given** | Usuário autenticado |
| **When** | Consultar `checkins` |
| **Then** | ✅ Retornar próprios check-ins |
| **And** | ✅ Retornar check-ins publicados (community/anonymous) |
| **And** | ❌ Não retornar check-ins privados de outros |

### O3. Dados sensíveis em public_profiles
| Step | Ação |
|------|------|
| **Given** | View `public_profiles` |
| **When** | Consultar |
| **Then** | ✅ Retornar apenas `id`, `display_name`, `avatar_url` |
| **And** | ❌ Não expor `phone`, `birth_date`, etc. |

### O4. URLs premium não vazam
| Step | Ação |
|------|------|
| **Given** | Usuário não premium |
| **When** | Inspecionar resposta da API `daily_content` |
| **Then** | ❌ `meditation_audio_url` não deve aparecer |

### O5. Admin routes protegidas
| Step | Ação |
|------|------|
| **Given** | Usuário sem role admin/moderator |
| **When** | Acessar `/admin/*` via URL direta |
| **Then** | ✅ Bloquear e redirecionar |

---

## Checklist de Execução

| Seção | Total | Passou | Falhou | Bloqueado |
|-------|-------|--------|--------|-----------|
| A) Autenticação | 7 | | | |
| B) Conteúdo Diário | 6 | | | |
| C) Home | 7 | | | |
| D) Check-in | 8 | | | |
| E) Comunidade | 4 | | | |
| F) Reações | 4 | | | |
| G) Denúncias | 4 | | | |
| H) Diário | 5 | | | |
| I) Assinatura | 7 | | | |
| J) Gating Premium | 3 | | | |
| K) Cursos | 6 | | | |
| L) Player/Progresso | 5 | | | |
| M) Admin Cursos | 5 | | | |
| N) Acessibilidade | 5 | | | |
| O) Segurança | 5 | | | |
| **TOTAL** | **81** | | | |

---

## Notas de Execução

**Data:** ___/___/______

**Testador:** _______________

**Ambiente:** [ ] Preview [ ] Produção

**Observações:**

---
