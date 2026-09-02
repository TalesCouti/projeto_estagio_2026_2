# Decisoes do projeto

## Tema

Escolhi uma clinica medica porque o fluxo de agendamento combina bem com os requisitos do teste: uma pessoa externa solicita um horario e alguem da equipe gerencia os pedidos recebidos.

## Stack

Usei React com Vite no frontend, Express no backend e PostgreSQL no banco. A escolha deixa cada parte bem separada e facilita explicar o caminho dos dados: o formulario chama a API, a API valida, salva no banco e o painel consome os registros protegidos por login.

O ganho dessa stack e a simplicidade para desenvolver uma aplicacao full stack pequena com uma API clara. O custo e ter mais configuracao local: Node, variaveis de ambiente e PostgreSQL precisam estar corretos para tudo rodar.

## Banco e regras

O PostgreSQL foi escolhido por lidar bem com dados estruturados e restricoes. Usei ENUM para `tipo` e `status`, e um indice unico parcial para impedir dois agendamentos ativos no mesmo tipo, data e horario. Agendamentos cancelados liberam o horario novamente.

Os horarios ficaram fixos no codigo para manter o escopo controlado. Em uma versao maior, eu moveria isso para tabelas de profissionais, especialidades e disponibilidade.

## Autenticacao

Usei JWT para proteger o painel administrativo. Para este escopo, isso resolve bem o controle de acesso. Em producao, eu preferiria cookie HTTP-only e regras melhores para expiracao ou revogacao da sessao.

## Email para o paciente

Inclui uma camada de email para avisar o paciente quando o pedido de agendamento for enviado, aceito ou cancelado. A ideia e reduzir incerteza para quem preencheu o formulario: a pessoa sabe que a solicitacao entrou como pendente e tambem recebe retorno quando a equipe muda o status.

Como o repositorio e publico, deixei o envio real dependente de variaveis de ambiente. Por padrao, `EMAIL_ENABLED=false` apenas simula o email no console. Se houver uma chave configurada, `EMAIL_ENABLED=true` envia pelo Resend sem expor credenciais no codigo.

## O que foi alem do minimo

Inclui calendario com disponibilidade por dia, bloqueio de conflito no banco, filtros no painel, alteracao de status, contadores no painel, validacao no backend, tratamento para banco indisponivel e notificacao de email simulada ou real.

## O que ficou de fora

Nao implementei telefone do paciente, reagendamento, paginacao e agenda por medico. Essas partes deixariam o sistema mais completo, mas aumentariam o escopo inicial.

## Uso de IA

Usei IA para acelerar a montagem inicial da estrutura, revisar riscos e lembrar pontos que poderiam faltar, como bloqueio de conflito e protecao da rota administrativa. Depois validei o projeto rodando testes, build, audit e chamadas reais na API.

Uma sugestao que precisei ajustar foi o uso inicial de `react-router-dom`. O audit apontou alerta de seguranca, entao removi a dependencia e deixei um roteamento simples porque o projeto so tem tres rotas.

Tambem optei por deixar o relatorio detalhado fora do Git, em `relatorio.md`, para manter o repositorio mais limpo e entregar no versionamento apenas os arquivos necessarios para rodar e explicar o projeto.
