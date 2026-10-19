# Migração do sistema antigo (v1)

Mapa de equivalência entre o backend FastAPI/PostgreSQL + Keycloak e o novo modelo no Firestore. Use-o se houver dados de produção da v1 para importar.

## Entidades

| v1 (PostgreSQL / Keycloak) | v2 (Firestore) | Observações |
| --- | --- | --- |
| Usuário Keycloak (`cpf`, `phone`, `full_name`, `email`) | Authentication + `users/{uid}` + `cpfs/{cpf}` | Senhas do Keycloak não são exportáveis: cada pessoa cria a senha de novo (ou "Esqueci minha senha" após importação via Admin SDK) |
| `users` (`keycloak_id`, `roles`, `policies.where`) | `staff/{uid}` (`roles`, `buildingIds`) | As quatro políticas (`canManage*`) usavam a mesma lista de prédios → viraram `buildingIds`. `PHARMACY_MANAGER` → `DUTY_MANAGER` (farmácias e funerárias) |
| `buildings` (`latitude`/`longitude` texto) | `buildings/{id}` (`lat`/`lng` número) | `owner_ids` (ids internos) → `ownerIds` (uids do Firebase) |
| `urban_issues` + `urban_issue_address` | `issues/{id}` com `address` embutido | `photo_path` (MinIO) → `photoPath` no Storage em `issues/{uid}/{id}/foto.jpg` |
| `issue_status_updates` | `issues/{id}/history/{status}` + `notes` | `observation` (interna) → `notes`; `official_response` → `history.officialResponse` |
| `ombudsman` + `ombudsman_status_update` | `ombudsman/{id}` + `history`/`notes` | `time_occurrence` → `occurrenceTime`; data → `occurrenceDate` (AAAA-MM-DD) |
| `notifications` (`NOT_SENT`/`SENT`) | `notifications/{id}` (`DRAFT`/`SENT`…) | |
| `fcm_registration_tokens` | `devices/{token}` | Tokens antigos do app nativo não servem para o PWA; os aparelhos se registram de novo |
| `audit_logs` | `audit/{id}` | Gerado pelas Cloud Functions |

## Status

| Zeladoria v1 | Ouvidoria v1 | v2 |
| --- | --- | --- |
| `RECEIVED` | `RECEIVED` | `RECEIVED` |
| `UNDER_ANALYSIS` | `UNDER_ANALYSIS` | `UNDER_ANALYSIS` |
| `IN_EXECUTION` | `IN_PROGRESS` | `IN_PROGRESS` |
| `COMPLETED` | `RESOLVED` | `RESOLVED` |
| — | — | `REJECTED`, `CANCELED` (novos) |

Protocolos: `ISS-AAAA-…` vira `ZEL-AAAA-…` nos novos registros; ao importar, mantenha o protocolo original no campo `protocol` (as regras só validam o formato em registros criados pelo app).

Categorias da zeladoria e tipos da ouvidoria mantêm os mesmos valores (`lighting`, `service_delay`…).

## Roteiro sugerido

1. Exportar as tabelas do PostgreSQL da v1 em JSON/CSV e os usuários do realm do Keycloak.
2. Criar as contas no Authentication com o Admin SDK (`importUsers`, sem senha) e os documentos `users`/`cpfs`.
3. Importar `buildings`, depois `issues`/`ombudsman` com `history`, convertendo ids e status pela tabela acima.
4. Copiar as fotos do MinIO para o Storage.
5. Conferir no painel e avisar os cidadãos para redefinirem a senha.

Se a v1 nunca entrou em produção em Rolim de Moura, nada disso é necessário: basta seguir [IMPLANTACAO.md](IMPLANTACAO.md).
