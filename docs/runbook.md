## Runbook

This is a running list of steps we should do when we deploy to a fresh environment for the first time.

- Run new database migrations with nextjs deployment
- Set the `smackosoft_service` Postgres role's password
  - `ALTER ROLE "smackosoft_service" WITH PASSWORD '...'`
