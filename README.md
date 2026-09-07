# Autoria 
Projeto de Tales Coutinho Carlos
Talescouti40@gmail.com

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
- Calendario com dias disponiveis, indisponiveis e lotados, incluindo feriados nacionais brasileiros
- Horarios livres consultados pela API
- Registro criado sempre com status `pendente`
- Bloqueio de conflito para mesmo tipo, data e horario
- Login administrativo
- Protecao de rota do painel
- Painel com registros ordenados por data e horario
- Filtros por status e especialidade
- Alteracao de status para `confirmado` ou `cancelado`
- Reagendamento pelo painel com nova data e horário, mantendo o status atual
- Mensagem de reagendamento com data/horário anterior e novo, disponível no painel e no envio de email
- Cadastro e exclusão de feriados personalizados pelo painel administrativo
- Email simulado ou real para avisar o paciente sobre o status
- Logout

## Pré-requisitos

- Git, Node.js 22.12 ou superior e npm. Node 20 a partir de 20.19 também atende ao requisito do Vite.
- PostgreSQL instalado e em execução, com usuário que possa criar o banco e as tabelas. O ambiente de desenvolvimento usa PostgreSQL 18.
- Para os comandos de banco abaixo, a pasta `bin` do PostgreSQL deve estar no PATH. Como alternativa, execute o SQL no Query Tool do pgAdmin.

Clone o projeto e entre na pasta antes de executar os próximos comandos:

```bash
git clone https://github.com/TalesCouti/projeto_estagio_2026_2.git
cd projeto_estagio_2026_2
```

## Configuracao

1. Instale as dependencias:

```bash
npm ci
```

2. Copie o arquivo de ambiente:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
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

```bash
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE clinica_aurora;"
```

Informe a senha do PostgreSQL quando solicitada. No pgAdmin, execute `CREATE DATABASE clinica_aurora;` conectado ao banco `postgres`. No Windows com instalação padrão da versão 18, também é possível usar `& 'C:\Program Files\PostgreSQL\18\bin\psql.exe'` no lugar de `psql`.

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

O seed usa `ADMIN_EMAIL` e `ADMIN_PASSWORD` do `.env`. Se o administrador já existir, sua senha será redefinida. Para uso público, escolha credenciais próprias e substitua `JWT_SECRET` por um segredo aleatório. Para gerar um segredo, execute `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` e copie a saída para o `.env`.

Senhas com caracteres especiais em `DATABASE_URL` precisam de codificação de URL. Não envie o `.env` para o repositório.

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

## Compilação e produção

```bash
npm run build
```

Windows PowerShell, para testar a aplicação compilada localmente:

```powershell
$env:NODE_ENV = 'production'
$env:CLIENT_ORIGIN = 'http://localhost:3001'
npm start
```

Linux/macOS:

```bash
NODE_ENV=production CLIENT_ORIGIN=http://localhost:3001 npm start
```

A API serve também a interface em http://localhost:3001, incluindo as rotas `/login` e `/admin`. Em uma implantação pública, use a origem real em `CLIENT_ORIGIN`. `npm run preview` serve apenas a interface e não substitui a API. Use outro terminal ou remova `NODE_ENV` do ambiente para voltar ao modo de desenvolvimento.

## Verificação

```bash
npm test
npm run build
```

Os testes padrão usam dependências controladas. Os testes opcionais com PostgreSQL usam um schema temporário e o removem ao terminar; exigem uma conexão válida no `.env` e permissão para criar schemas.

Windows PowerShell:

```powershell
$env:AURORA_INTEGRATION_TEST = '1'
node --test server/tests/integration.test.js
Remove-Item Env:AURORA_INTEGRATION_TEST
```

Linux/macOS:

```bash
AURORA_INTEGRATION_TEST=1 node --test server/tests/integration.test.js
```

Para verificar manualmente, envie um pedido, entre no painel, confirme ou reagende e faça logout. Em uma janela anônima, acesse `/admin`: o sistema deve redirecionar para `/login`. Confira também em uma tela estreita.

## Problemas comuns

- Banco indisponível: confira serviço, porta, nome do banco, usuário e senha em `DATABASE_URL`.
- Tabela ausente: execute `npm run db:setup`.
- Login inválido: confira o usuário configurado; execute `npm run db:seed` apenas se quiser criar ou redefinir o acesso.
- Porta ocupada: encerre a outra instância. Se mudar a porta da API, ajuste também o proxy em `vite.config.mjs`.
- Falha na instalação ou compilação: confira `node --version` e os pré-requisitos.

## Rotas principais da API

- `GET /api/appointments/types`
- `GET /api/appointments/calendar?tipo=clinica_geral&month=2026-09`
- `GET /api/appointments/availability?tipo=clinica_geral&date=2026-09-07`
- `POST /api/appointments`
- `POST /api/auth/login`
- `GET /api/appointments/admin`
- `PATCH /api/appointments/admin/:id/status`
- `PATCH /api/appointments/admin/:id/reschedule`
- `GET /api/holidays/admin`
- `POST /api/holidays/admin`
- `DELETE /api/holidays/admin/:date`
- `POST /api/auth/logout`

## Observacoes

A resposta mostra a mensagem destinada ao paciente e a situação do envio. Com `EMAIL_ENABLED=false`, o email é apenas simulado. Com envio real configurado, a mensagem é encaminhada pelo provedor existente. Uma falha de envio não desfaz o reagendamento.

A rota de reagendamento recebe `data`, `horario` e `previous: { data, horario, status }` com os valores vistos no painel. O status é preservado: reagendar um pedido pendente não confirma a consulta.

O sistema considera dias uteis de segunda a sexta. Horarios disponiveis: `08:00`, `09:00`, `10:00`, `11:00`, `13:00`, `14:00`, `15:00`, `16:00` e `17:00`.

A primeira consulta de um ano busca os feriados nacionais na BrasilAPI e salva as datas no PostgreSQL; as próximas usam os dados armazenados. Se a API estiver indisponível antes de existir cache local, o calendário responde com erro temporário para não liberar uma data possivelmente feriada. O administrador também pode cadastrar e excluir feriados personalizados no painel; eles são gravados com fonte `admin`, bloqueiam o agendamento imediatamente e não podem substituir ou excluir feriados nacionais importados.

O arquivo `.env` nao deve ser enviado para o repositorio, pois contem dados locais de conexao.

Com `EMAIL_ENABLED=false`, o envio de email e apenas simulado no console do backend. Para envio real, configure uma chave do Resend em `EMAIL_API_KEY` e altere para `EMAIL_ENABLED=true`.

Para controlar a sincronização de feriados, use `HOLIDAYS_ENABLED`, `HOLIDAYS_API_URL` e `HOLIDAYS_API_TIMEOUT_MS` no `.env`. O endpoint padrão é `https://brasilapi.com.br/api/feriados/v1/{ano}`. O campo `holidayName` é retornado pelo calendário e pela disponibilidade para a interface identificar a data bloqueada.
