# Integração com Google Agenda

Cada usuário do SGA App pode conectar sua própria conta Google em **Meu Perfil > Google Agenda**. Quando um orçamento é confirmado pelo cadastro da cobrança, o sistema cria um evento na agenda principal dessa conta.

## Configuração no Google Cloud

1. Crie ou selecione um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Ative a **Google Calendar API**.
3. Configure a tela de consentimento OAuth.
4. Adicione o escopo `https://www.googleapis.com/auth/calendar.events`.
   Enquanto o aplicativo estiver em modo de teste, cadastre como usuários de teste as contas Google que poderão conectar suas agendas.
5. Crie uma credencial **OAuth 2.0 Client ID** do tipo **Web application**.
6. Cadastre as URIs de redirecionamento:
   - Desenvolvimento: `http://localhost:3000/api/google-calendar/callback`
   - Produção: `https://SEU-DOMINIO/api/google-calendar/callback`

## Variáveis de ambiente

```env
GOOGLE_CALENDAR_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=seu-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=https://SEU-DOMINIO/api/google-calendar/callback
APP_URL=https://SEU-DOMINIO
GOOGLE_TOKEN_ENCRYPTION_KEY=uma-chave-longa-e-aleatoria
```

Em desenvolvimento, ajuste `GOOGLE_CALENDAR_REDIRECT_URI` e `APP_URL` para `http://localhost:3000`.

`GOOGLE_TOKEN_ENCRYPTION_KEY` protege os refresh tokens armazenados. Depois que usuários conectarem suas agendas, não altere essa chave sem antes desconectá-los, pois os tokens existentes deixarão de ser descriptografáveis.

## Comportamento

- O evento é criado na agenda `primary` do usuário.
- O horário usa o fuso `America/Sao_Paulo`.
- A duração inicial é de duas horas.
- Repetir a sincronização atualiza o mesmo evento em vez de duplicá-lo.
- Se o Google estiver indisponível, a cobrança continua salva e o erro fica registrado no agendamento.
