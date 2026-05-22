# Conteúdo necessário — Maple Bear Caxias do Sul

> Lista do que preciso pra fechar o site institucional. Você preenche no seu ritmo; eu construo tudo em paralelo com placeholders bem-marcados.

---

## 1. Dados institucionais (CRÍTICO — vai no JSON-LD/SEO)

- [ ] **Endereço completo** da unidade (rua, número, bairro, CEP)
- [ ] **Telefone fixo** (se diferente do WhatsApp 54 99702-1634)
- [ ] **E-mail institucional** (provável: `contato@maplebearcaxiasdosul.com.br`)
- [ ] **Horário de funcionamento** (entrada, saída, contraturno)
- [ ] **Ano de fundação** da unidade Caxias
- [ ] **CNPJ** (vai no rodapé)
- [ ] **Razão social**
- [ ] **Coordenadas GPS** (Google Maps link / lat-long pra LocalBusiness)
- [ ] **Redes sociais oficiais da unidade** (Instagram, Facebook, YouTube?)

## 2. Fotografia (CRÍTICO — você disse que tem profissionais)

Coloque em `assets/photos/` organizados por pasta:

### `assets/photos/hero/`
- [ ] 1-3 fotos para o **hero da home** (alta resolução, horizontal preferencial 16:9 ou 21:9, crianças em atividade autêntica — não posada)

### `assets/photos/estrutura/`
- [ ] **Fachada** da unidade
- [ ] **Recepção / hall**
- [ ] **Salas de aula** (Infantil + Fundamental se houver)
- [ ] **Pátio** / áreas externas
- [ ] **Biblioteca**
- [ ] **Refeitório**
- [ ] **Espaço sensorial / motor** (educação infantil)
- [ ] **Áreas técnicas**: laboratório, sala de informática, sala de música, sala de arte (se tiver)

### `assets/photos/cotidiano/`
- [ ] **Crianças em sala** (várias idades)
- [ ] **Atividades em inglês** (imersão)
- [ ] **Recreio / brincadeiras**
- [ ] **Refeições**
- [ ] **Atividades artísticas / projetos**
- [ ] **Apresentações / eventos**

### `assets/photos/equipe/`
- [ ] **Foto da diretora pedagógica** (Denise Magnus?)
- [ ] **Foto da coordenação** (Simone Onzi?)
- [ ] **Foto de grupo dos professores** (ou individuais com fundo neutro consistente)

### `assets/photos/og/`
- [ ] **og-image.png** (1200×630px) — pra preview social

> **Dica:** WebP com fallback JPG. Nomeie em kebab-case, sem espaços. Eu otimizo via script depois.

## 3. Equipe pedagógica (página /equipe/)

Pra cada membro:
- [ ] Nome completo
- [ ] Cargo (Diretora pedagógica, Coordenadora, Professora Year X, etc.)
- [ ] Foto profissional (ver pasta acima)
- [ ] Formação (graduação + pós/especialização se relevante)
- [ ] Tempo de Maple Bear / tempo de educação
- [ ] 1 frase curta sobre filosofia/abordagem (opcional)

## 4. Níveis de ensino oferecidos (página /niveis/)

Confirmar quais níveis a unidade Caxias atende em 2026 e 2027:

- [ ] Bear Care (18 meses)
- [ ] Toddler (2 anos)
- [ ] Nursery (3 anos)
- [ ] Junior Kindergarten (4 anos)
- [ ] Senior Kindergarten (5 anos)
- [ ] Year 1 a Year 5 — Fundamental I
- [ ] Year 6 a Year 9 — Fundamental II

Pra cada nível:
- [ ] Horário (matutino, vespertino, integral)
- [ ] Carga horária semanal
- [ ] % de imersão em inglês
- [ ] Materiais/livros (se proprietário Maple Bear, dizer)
- [ ] Contraturno disponível

## 5. Matrículas 2027 (página /matriculas/)

- [ ] **Período de matrícula** (datas de abertura e fechamento)
- [ ] **Vagas por turma** (limite máximo de alunos)
- [ ] **Valores por nível** (mensalidade, matrícula, material) — política de transparência (ou intervalo "a partir de R$ X")
- [ ] **Forma de pagamento** (10/12 parcelas, descontos, irmãos)
- [ ] **Bolsas/descontos** (se houver)
- [ ] **Documentação necessária**
- [ ] **Processo seletivo** (entrevista? visita? atendimento individual?)

## 6. Depoimentos (página /depoimentos/)

Pra cada família/aluno:
- [ ] Nome dos pais (ou "Família X")
- [ ] Nome e idade do filho(a)
- [ ] Foto da família (com autorização)
- [ ] **Vídeo curto de 30-60s** (preferencial) ou texto curto
- [ ] Tempo na escola
- [ ] Autorização assinada para uso da imagem

Meta: **5-10 depoimentos** pra estreia.

## 7. FAQ (página /faq/)

Vou popular o esqueleto com perguntas padrão. Você revisa as **respostas específicas da Caxias**:

- [ ] Como funciona a alimentação? (refeitório? lanche? cardápio?)
- [ ] Tem contraturno? Custo separado?
- [ ] Tem transporte escolar? Parceria?
- [ ] Material didático: lista, comprado onde, custo
- [ ] Uniforme: lista, lojas, custo
- [ ] Visita pré-matrícula é obrigatória?
- [ ] A escola atende crianças com necessidades especiais?
- [ ] Aulas de inglês são por professor brasileiro ou nativo?
- [ ] Como é o acompanhamento pedagógico? Reuniões? Boletins?
- [ ] Como funciona a comunicação escola-família (app, WhatsApp)?

## 8. Conteúdo institucional curto (várias páginas)

- [ ] **Missão** da Maple Bear Caxias (1-2 frases)
- [ ] **Valores** (3-5 itens)
- [ ] **História da unidade** — 2-3 parágrafos (quando abriu, quem fundou, marcos)
- [ ] **Por que escolher a Maple Bear Caxias** — 4-6 diferenciais concretos (não genéricos)
- [ ] **Eventos/conquistas marcantes** (prêmios, parcerias, datas)

## 9. Integração técnica (eu cuido — só preciso confirmação)

- [ ] **Lumied: confirmar `escola_id`** da unidade Maple Bear Caxias pra integração de leads
- [ ] **Resend: emails de destino** — Denise + Simone (e quem mais?)
- [ ] **Domínio de envio Resend** — já configurado? `noreply@maplebearcaxiasdosul.com.br`?

---

## Como me passar

Quando tiver tudo (ou parte), me avise. Pode ser:
- Markdown editado em cima desse arquivo
- ZIP com fotos + texto solto
- Pasta no Drive que eu acesse
- Voz/texto solto pelo chat — eu organizo

Sem essas infos, eu sigo construindo com placeholders bem-visíveis (rotulados `TODO: PREENCHER`) — o site fica visualmente pronto, só faltando preencher.
