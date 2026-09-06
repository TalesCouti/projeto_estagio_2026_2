## Entrega

Sistema de agendamento para uma clínica, com página pública, persistência de pedidos pendentes no PostgreSQL e painel administrativo protegido. A equipe visualiza os pedidos em ordem de data, confirma, cancela e reagenda consultas.

## Além do solicitado

- Calendário e horários disponíveis por especialidade, com bloqueio de reservas simultâneas no banco para evitar duplicidade de vagas.
- Filtros e contadores no painel para facilitar o acompanhamento dos pedidos.
- Reagendamento que preserva a reserva original quando há conflito, com mensagem ao paciente mostrando o horário anterior e o novo.
- E-mails simulados por padrão e envio real opcional, para permitir avaliar o fluxo sem configurar um provedor.

## Cortes de escopo

Telefone, paginação, agenda por profissional, feriados e lembretes ficaram de fora para concentrar o trabalho no fluxo de agendamento e gestão. A sessão usa JWT no navegador; o logout remove a credencial local, mas não revoga o token no servidor. Essa limitação e as decisões sobre IA estão registradas em `DECISOES.md`.

## Dificuldades e soluções

Reservas concorrentes exigiram uma restrição no PostgreSQL, e o reagendamento usa uma transação para não perder a vaga original. A confirmação visual foi separada da atualização do calendário para que uma falha de carregamento não apresente um pedido salvo como erro. Na validação da interface, a ordem dos eventos de navegação foi ajustada para impedir uma tela vazia ao redirecionar visitantes do painel para o login. A rota de produção também foi adaptada à sintaxe do Express 5.

## Validação

- 15 testes aprovados, incluindo integração com PostgreSQL em schema temporário.
- Compilação de produção concluída.
- Verificação no navegador em desktop e tela de celular: pedido, login, reagendamento, logout e acesso direto ao painel sem autenticação.
- Falha de calendário simulada após salvar um pedido: a confirmação permanece visível.
- Nenhum e-mail real enviado nos testes.
