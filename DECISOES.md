# Decisoes do projeto

## Tema

Escolhi uma clinica medica porque o fluxo de agendamento combina bem com os requisitos do teste: uma pessoa externa solicita um horario e alguem da equipe gerencia os pedidos recebidos.

## Stack

Usei React com Vite no frontend, Express no backend e PostgreSQL no banco. A escolha deixa cada parte bem separada e facilita explicar o caminho dos dados: o formulario chama a API, a API valida, salva no banco e o painel consome os registros protegidos por login.
Um grande fator para escolher essa stack é porque são ferramentas que estou mais habituado por já usar antes e não precisei aprender do zero.
O ganho dessa stack e a simplicidade para desenvolver uma aplicacao full stack pequena com uma API clara. O custo e ter mais configuracao local: Node, variaveis de ambiente e PostgreSQL precisam estar corretos para tudo rodar.

## Banco e regras

O PostgreSQL foi escolhido por lidar bem com dados estruturados e restricoes. Usei ENUM para `tipo` e `status`, um índice único parcial para impedir dois agendamentos ativos no mesmo tipo, data e horario e uma tabela `holidays` para manter feriados nacionais importados da BrasilAPI e feriados personalizados cadastrados pelo administrador. Agendamentos cancelados liberam o horario novamente. A consulta do calendário usa os feriados armazenados, evitando chamada externa repetida.

Os horarios ficaram fixos no codigo para manter o escopo controlado. Em uma versao maior, eu moveria isso para tabelas de profissionais, especialidades e disponibilidade.

## Autenticacao

Usei JWT para proteger o painel administrativo, isso resolve bem o controle de acesso.

## Email para o paciente

Inclui uma camada de email para avisar o paciente quando o pedido de agendamento for enviado, aceito ou cancelado. A ideia e reduzir incerteza para quem preencheu o formulario: a pessoa sabe que a solicitacao entrou como pendente e tambem recebe retorno quando a equipe muda o status.

Como o repositorio e publico, deixei o envio real dependente de variaveis de ambiente. Por padrao, `EMAIL_ENABLED=false` apenas simula o email no console. Se houver uma chave configurada, `EMAIL_ENABLED=true` envia pelo Resend sem expor credenciais no codigo.

## O que foi alem do pedido

Inclui calendario com disponibilidade por dia, bloqueio de conflito no banco, filtros no painel, alteracao de status, contadores no painel, validacao no backend, tratamento para banco indisponivel, notificacao de email simulada ou real, reagendamento pelo painel e cadastro de feriados personalizados.

O reagendamento altera a reserva em uma transação: se a nova vaga estiver ocupada, o horário anterior é preservado. O status permanece igual para não confirmar automaticamente um pedido pendente. A mensagem ao paciente informa o agendamento anterior e o novo. Uma falha no email não desfaz uma alteração já salva.


## Uso de IA

Deleguei à IA apoio na estrutura inicial, revisão de requisitos, implementação de melhorias e testes. Na etapa final, a IA também implementou o reagendamento e as correções; minha participação foi escolher essas prioridades, realizar ajustes de interface e design e escolhas de ferramenta,segurança, estrutura do banco de dados. O uso de IA incluiu execução de testes de segurança, não apenas geração de código.

Um problema encontrado no código produzido com auxílio de IA foi a mensagem de sucesso do agendamento depender da atualização seguinte do calendário. Se essa consulta falhasse, um pedido já salvo aparecia como erro. A correção separou a persistência da atualização da tela. O teste no navegador simulou a falha do calendário e confirmou que a mensagem de sucesso permanecia visível.

## Validação

Os testes cobrem regras, conteúdo dos emails e respostas da API. O teste opcional de integração usa PostgreSQL real em um schema temporário e verifica reservas simultâneas, autenticação, listagem, confirmação, cancelamento, reagendamento e liberação de vagas. A interface compilada foi conferida no navegador em tamanho de celular, incluindo o redirecionamento para login e o feedback após envio. Nenhum email real é enviado durante esses testes.