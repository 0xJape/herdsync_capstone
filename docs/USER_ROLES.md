# HerdSync User Roles

| Capability | Administrator | Farm Manager | Veterinarian | Farm Aide | Faculty |
|---|---:|---:|---:|---:|---:|
| Manage users and roles | Full | No | No | No | No |
| View active cattle | Yes | Yes | Yes | Yes | Yes |
| Create/update cattle | Yes | Yes | Limited | Authorized | No |
| Archive cattle | Yes | Yes | No | No | No |
| Record health assessment | Yes | Authorized | Yes | Authorized | No |
| Record treatment/vaccination | Yes | Yes | Yes | Authorized | No |
| Clear withdrawal | Yes | Authorized | Yes | No | No |
| Record breeding/pregnancy/birth | Yes | Yes | Yes | Authorized | No |
| View reports | Yes | Yes | Yes | Assigned | Yes |
| Export reports | Yes | Yes | Authorized | No | Authorized |
| View audit logs | Yes | Authorized | Limited | No | No |

Server-side authorization required. Account deactivation preferred over permanent deletion. Exact permissions require stakeholder approval.

## Deployed prototype findings

The deployed admin quick-login uses `admin@herdsync.com` and a prefilled password, then opens `/dashboard`. Dashboard navigation exposes:

- Dashboard
- Manage Users
- Audit Log
- Reports
- Add Cattle
- Health Check
- View Cattle Herd
- Pregnancy
- Alerts
- Activity
- Logout

The login screen also exposes quick-login buttons for Administrator, Veterinarian, Farm Aide, and Faculty. Farm Manager is defined in the project requirements but is missing from the visible quick-login choices. Quick-login credentials must not remain enabled in production.
