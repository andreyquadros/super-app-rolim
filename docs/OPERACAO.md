# Operação do dia a dia

Tudo abaixo é feito pelo painel (`/painel`) ou pelo console do Firebase — sem acesso a servidor.

## Pessoas e acessos

| Tarefa | Como |
| --- | --- |
| Liberar um servidor | A pessoa cria a conta no app e **confirma o e-mail** (link enviado no cadastro; Perfil → Reenviar e-mail) → o administrador abre Painel → **Equipe e acessos** → Adicionar → busca por CPF ou e-mail → perfil *Servidor* + unidades que atende |
| Liberar uma farmácia | Mesmo caminho com perfil *Farmácia*; depois, em **Unidades e farmácias**, inclua a pessoa como responsável pela farmácia |
| Retirar acesso | Equipe e acessos → abrir a pessoa → desmarcar **Acesso ativo** |
| Quem pode mexer na equipe | Somente **administradores**. Servidores atendem, mas não concedem acessos |
| Cidadão esqueceu a senha | Tela de login → "Esqueci minha senha" |
| CPF usado por outra pessoa | Console → Firestore → `cpfs` → apague o documento com o CPF; a pessoa correta completa o cadastro |
| Pedido de exclusão de dados (LGPD) | A própria pessoa usa **Perfil → Excluir minha conta**; ou o admin apaga o usuário em Authentication (os dados pessoais são removidos automaticamente) |

## Atendimento

- **Zeladoria/Ouvidoria:** abra a solicitação, escreva a *resposta ao cidadão* (vai para o app e o e-mail) e, se quiser, uma *observação interna*. O fluxo não volta etapas.
- **Indeferir** exige justificativa — use para duplicadas ou pedidos fora da competência do município.
- **Comunicados:** crie o rascunho, revise a prévia e clique em **Enviar** — o aviso vai para todos os aparelhos com notificações ativas e fica público no app.

## Acompanhamento técnico

| O quê | Onde |
| --- | --- |
| Erros e envios das Functions | Console → Functions → **Registros** |
| E-mails com falha | Firestore → coleção `mail` → campo `delivery.error` |
| Quem mudou unidades e acessos | Firestore → coleção `audit` |
| Uso e custos | Console → Uso e faturamento; alerta de orçamento |
| Comunicado com falha | Painel → Comunicados (status *Falhou* com o motivo; pode reenviar). Envios interrompidos viram *Falhou* sozinhos em até 30 min |
| Cidadão não recebe e-mails | Só enviamos e-mail para endereços **confirmados**; peça para abrir Perfil → Reenviar e-mail |

## Backups

O Firestore tem recuperação até 7 dias com **Point-in-time recovery** (ative em Firestore → Recuperação de desastres) e exportações agendadas:

```bash
gcloud firestore backups schedules create --database='(default)' --recurrence=weekly --day-of-week=SUN --retention=8w --project=superapp-rolim
```

## Atualizar o app

1. Alterações chegam ao GitHub (pull request). O fluxo **CI** roda todos os testes automaticamente.
2. Depois do merge: Actions → **Publicar no Firebase** → Run workflow.
3. Os aparelhos mostram "Há uma nova versão do app" e atualizam com um toque.

Mudou de cidade ou de identidade visual? Ajuste `web/src/config/city.ts`, as cores em `web/src/theme/theme.ts` e o retângulo `inMunicipality` em `firestore.rules`.
