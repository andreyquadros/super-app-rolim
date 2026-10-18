# Implantação passo a passo

Este guia leva o app do zero até o ar, **sem servidor próprio**. Leva cerca de 1 hora. Você precisa de:

- uma conta Google institucional da prefeitura (será a dona do projeto);
- um computador com Node.js 22+ e o Firebase CLI (`npm i -g firebase-tools`);
- acesso ao DNS do domínio da prefeitura (só para o endereço personalizado, opcional);
- uma conta de e-mail SMTP para os avisos por e-mail (pode ser a do domínio da prefeitura).

> Dica: guarde as senhas e chaves num cofre de senhas da prefeitura, nunca no repositório.

---

## 1. Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e clique em **Criar projeto**. Sugestão de id: `superapp-rolim`.
2. Desative o Google Analytics (não é necessário).
3. Em **Uso e faturamento → Detalhes e configurações**, mude para o plano **Blaze** (pagamento conforme o uso). É exigido para Cloud Functions e Storage.
4. **Crie um alerta de orçamento** (Google Cloud → Faturamento → Orçamentos e alertas), por exemplo R$ 50/mês com aviso em 50%, 90% e 100%. Para o porte de Rolim de Moura o custo esperado fica próximo de zero (veja [ARQUITETURA.md](ARQUITETURA.md#custos)).

## 2. Ativar os serviços (Firestore e Functions em **southamerica-east1 – São Paulo**)

| Serviço | Onde | O que fazer |
| --- | --- | --- |
| Authentication | Criação → Authentication → Método de login | Ative **E-mail/senha** e **Google**. Em *Modelos*, mude o idioma para **Português (Brasil)**. |
| Firestore | Criação → Firestore Database | **Criar banco** em modo produção, local `southamerica-east1`. (O `firebase.json` já fixa essa região: se o banco ainda não existir, o deploy o cria em São Paulo.) |
| Storage | Criação → Storage | **Começar** e escolha a região das fotos — **a escolha é definitiva**. *Sem custo* (EUA, ex.: `us-east1`): 5 GB gratuitos, mas as fotos saem do país (é o que usa a produção de Rolim de Moura; veja [ARQUITETURA.md](ARQUITETURA.md#onde-os-dados-ficam)). *Todas as localizações* → `southamerica-east1`: dados no Brasil, centavos por GB/mês; nesse caso ajuste a página de privacidade (`web/src/pages/PrivacyPage.tsx`). |
| Cloud Messaging | Configurações do projeto → Cloud Messaging → Configuração da Web | Em *Certificados push da Web*, clique em **Gerar par de chaves** e copie a chave (VAPID). |

## 3. Registrar o app Web e configurar o código

1. Configurações do projeto → **Seus apps** → ícone **Web** (`</>`). Nome: `Super App Rolim`. Não marque Hosting aqui.
2. Copie os valores do `firebaseConfig` e preencha **`web/.env.production`** a partir de [`web/.env.example`](../web/.env.example). Esses valores são públicos por natureza — a segurança está nas regras.
3. Crie **`functions/.env.<id-do-projeto>`** a partir de [`functions/.env.example`](../functions/.env.example) com o endereço final do app (`APP_URL`).
4. No terminal, na pasta do repositório:

```bash
firebase login
```

```bash
firebase use --add
```

(escolha o projeto e dê o apelido `producao`).

## 4. E-mails automáticos (extensão oficial "Trigger Email")

As Cloud Functions colocam os e-mails na coleção `mail`; a extensão oficial os envia por SMTP.

1. Console → **Extensions** → procure **Trigger Email from Firestore** (`firebase/firestore-send-email`) → **Instalar**.
2. Configure:
   - *Email documents collection*: `mail`
   - *SMTP connection URI*: por exemplo `smtps://usuario%40rolimdemoura.ro.gov.br@smtp.servidor.com.br:465` (a senha vai no campo de senha/segredo).
   - *Default FROM address*: `Prefeitura de Rolim de Moura <naoresponda@rolimdemoura.ro.gov.br>`
   - Região: `southamerica-east1`.
3. Sem servidor de e-mail próprio? Serviços como Brevo, Amazon SES ou Gmail (senha de app) funcionam; confira os limites diários.

## 5. Publicar

```bash
npm run setup
```

```bash
firebase deploy
```

O comando publica regras, índices, Cloud Functions e o app. Ao final, o app fica em `https://<id-do-projeto>.web.app`.

Particularidades da **primeira** publicação:

- **Functions:** é comum falhar com *"Permission denied while using the Eventarc Service Agent"*. São permissões do Google ainda propagando: aguarde 3 a 5 minutos e rode `firebase deploy --only functions` de novo.
- **Storage:** as regras de fotos consultam o Firestore e exigem um papel extra na conta de serviço do Storage. Rode `firebase deploy --only storage` num terminal **interativo** (sem `--non-interactive`) e responda **sim** quando perguntar *"Grant the new role?"*. Sem isso, a equipe não consegue ver as fotos.
- **Custos de imagens:** rode uma vez `firebase functions:artifacts:setpolicy --location southamerica-east1 --days 3` para apagar imagens antigas de deploy.

## 6. Endereço da prefeitura (opcional, recomendado)

1. Hosting → **Adicionar domínio personalizado** → `app.rolimdemoura.ro.gov.br`.
2. Crie no DNS os registros que o Firebase mostrar (TXT de verificação e A/AAAA). O certificado HTTPS é emitido automaticamente.
3. Authentication → Configurações → **Domínios autorizados** → adicione o novo domínio (necessário para o login com Google).
4. Atualize `VITE_FIREBASE_AUTH_DOMAIN` para o domínio próprio e `APP_URL` em `functions/.env.<id>`, e publique de novo. Isso deixa o login com Google mais confiável no iPhone.

## 7. Primeiro administrador

1. A pessoa responsável abre o app, cria a conta, completa o cadastro (CPF e celular) e **confirma o e-mail** pelo link recebido.
2. Conceda o perfil de administrador por **um** destes caminhos:
   - **Pelo console (sem programação):** Authentication → copie o *UID* da pessoa. Firestore → coleção `staff` → **Adicionar documento** com ID = UID e os campos:
     `roles` (array) = `ROOT` · `buildingIds` (array) vazio · `fullName`, `email`, `cpf` (string) · `active` (boolean) = `true` · `updatedBy` (string) = `console` · `createdAt` e `updatedAt` (timestamp).
   - **Pelo script:** `gcloud auth application-default login` e depois:

```bash
node scripts/grant-admin.mjs superapp-rolim email@rolimdemoura.ro.gov.br
```

3. Daqui em diante, tudo é feito pelo painel em `/painel`: cadastre as **unidades públicas** e **farmácias** e libere a **equipe** (Equipe e acessos).

## 8. Publicação automática pelo GitHub (opcional)

Para atualizar o app com um clique, sem precisar do computador configurado:

1. Google Cloud → IAM → **Contas de serviço** → criar `github-deploy` com o papel **Administrador do Firebase** (e **Usuário da conta de serviço**). Gere uma chave JSON.
2. No GitHub do projeto → Settings → Secrets and variables → Actions:
   - Secret `FIREBASE_SERVICE_ACCOUNT`: conteúdo do JSON (depois apague o arquivo do computador).
   - Variables: `FIREBASE_PROJECT_ID`, `APP_URL` e os `VITE_FIREBASE_*` do passo 3.
3. Actions → **Publicar no Firebase** → **Run workflow**.

A cada envio para o GitHub, o fluxo **CI** roda todos os testes (unitários, regras e ponta a ponta) antes de qualquer publicação.

## Checklist final

- [ ] App abre em `https://app.rolimdemoura.ro.gov.br` e oferece "Instalar"
- [ ] Cadastro com CPF funciona e o e-mail de confirmação chega
- [ ] Uma zeladoria de teste (com e-mail confirmado) gera e-mail "Recebida"
- [ ] Mudar o status no painel gera e-mail e aviso push no celular
- [ ] Comunicado de teste chega como aviso em um Android e em um iPhone com o app instalado
- [ ] Alerta de orçamento configurado
