# HerdSync Security

- Hash passwords with an accepted password-hashing algorithm; never store plaintext.
- Use secure sessions or short-lived tokens with protected cookies where applicable.
- Enforce role permissions on server/API and database queries.
- Validate all input and prevent duplicate critical submissions.
- Use parameterized queries and output encoding.
- Protect exports, attachments, and audit records from unauthorized access.
- Do not expose secrets in source, logs, or errors.
- Audit user, health, treatment, breeding, pregnancy, birth, archive, export, and permission changes.
- Prefer soft deletion/deactivation for operational records.
- Back up database and test restoration before production.
- Review dependencies and deployment configuration before release.
