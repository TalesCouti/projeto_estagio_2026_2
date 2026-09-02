# Clinica Aurora Saude

Sistema web para agendamento de consultas medicas. O projeto tem uma pagina publica para pacientes, API em Express, banco PostgreSQL e painel administrativo com login.

## Stack

- React com Vite no frontend
- Express no backend
- PostgreSQL no banco de dados
- JWT para sessao administrativa
- Bcrypt para senha do admin

## Funcionalidades

- Pagina publica com apresentacao da clinica e especialidades
- Formulario de agendamento com nome, email, tipo, data e horario
- Calendario com dias disponiveis, indisponiveis e lotados
- Horarios livres consultados pela API
- Registro criado sempre com status `pendente`
- Bloqueio de conflito para mesmo tipo, data e horario
- Login administrativo
- Protecao de rota do painel
- Painel com registros ordenados por data e horario
- Filtros por status e especialidade
- Alteracao de status para `confirmado` ou `cancelado`
- Email simulado ou real para avisar o paciente sobre o status
- Logout

## Configuracao

1. Instale as dependencias:

```bash
npm install
```

2. Copie o arquivo de ambiente:

```bash
copy .env.example .env
```

3. Configure o `.env` com as credenciais locais do PostgreSQL.

Exemplo:

```env
DATABASE_URL=postgres://postgres:sua_senha@127.0.0.1:5432/clinica_aurora
EMAIL_ENABLED=false
EMAIL_PROVIDER=resend
EMAIL_API_KEY=
EMAIL_FROM=Clinica Aurora Saude <agendamentos@exemplo.com>
```

4. Crie o banco `clinica_aurora` no PostgreSQL.

5. Crie as tabelas:

```bash
npm run db:setup
```

6. Crie o admin inicial:

```bash
npm run db:seed
```

Credenciais padrao:

- Email: `admin@aurora.local`
- Senha: `Aurora@123`

## Rodar em desenvolvimento

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:3001
```

## Rotas principais da API

- `GET /api/appointments/types`
- `GET /api/appointments/calendar?tipo=clinica_geral&month=2026-09`
- `GET /api/appointments/availability?tipo=clinica_geral&date=2026-09-07`
- `POST /api/appointments`
- `POST /api/auth/login`
- `GET /api/appointments/admin`
- `PATCH /api/appointments/admin/:id/status`
- `POST /api/auth/logout`

## Observacoes

O sistema considera dias uteis de segunda a sexta. Horarios disponiveis: `08:00`, `09:00`, `10:00`, `11:00`, `13:00`, `14:00`, `15:00`, `16:00` e `17:00`.

O arquivo `.env` nao deve ser enviado para o repositorio, pois contem dados locais de conexao.

Com `EMAIL_ENABLED=false`, o envio de email e apenas simulado no console do backend. Para envio real, configure uma chave do Resend em `EMAIL_API_KEY` e altere para `EMAIL_ENABLED=true`.
