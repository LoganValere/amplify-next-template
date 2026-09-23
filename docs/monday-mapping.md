# Monday Accounts mapping

The active Accounts board is selected by an administrator and stored in the
`MondayIntegration` singleton. The API token is stored only in AWS Secrets
Manager using a unique name under `valere-portal/monday-*`.

| Portal field | Monday column id | Notes |
| --- | --- | --- |
| name | name | Item name |
| clientLabel | text | Client |
| status | status0 | Project Status. Dead/Completed → not trackable |
| office | status2 | Office |
| projectManager | dropdown4 | Project Manager |
| accountManager | people | Account Manager |
| projectedEnd | date_mknb6xq3 | Projected End Date |

Do **not** sync Uruguay / Croatia / India board relations or subitems as billable projects.

Workspace IDs may be stored per client as `IntegrationLink` kind `monday_workspace` for PM context only.

During setup, `POST /api/monday/boards` accepts a temporary token in a validated
JSON body. Tokens must never be put in URLs. `GET /api/monday/boards` uses only
the saved Secrets Manager token.

Sync result `total` is the number of remote board items fetched. It is not the
sum of `created`, `updated`, and `archived` because unchanged items are included.

The hardening migration tags legacy clients from the historical Accounts board
`4476095209`, excluding `local-*` seed item IDs. This lets the first sync archive
historical clients removed from that board. Legacy rows imported from any other
board are not inferred automatically; leave them untagged or assign their
`mondayBoardId` explicitly before syncing that board.

Configure, disconnect, and sync share one database lease on `MondayIntegration`.
The owner renews after each Monday page; the 15-minute TTL covers bounded
retries if a renew is delayed. A busy lease returns HTTP 409 before secret or
settings mutations.

`MondaySyncState` is a legacy, unused model retained to avoid an unreviewed
destructive migration. `MondayIntegration` is the only active settings and
sync-status source of truth.
