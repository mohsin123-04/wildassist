# Deploying WildAssist

There are two environments, both on Vercel and both backed by the **same**
Supabase database:

| Environment | URL                              | Branch    | Command               |
| ----------- | -------------------------------- | --------- | --------------------- |
| Staging     | https://wildassist-staging.vercel.app | `staging` | `npm run deploy:staging` |
| Production  | https://wildassist.vercel.app         | `main`    | `npm run deploy:prod`    |

Staging is a Vercel preview deployment pinned to a stable URL, so you always
test at the same address before touching production.

## The rule that keeps production up

Staging and production share one database. So the only thing that can take
production down during an update is a **schema mismatch** - shipping code that
reads a column that doesn't exist yet (or dropping a column old code still
reads).

Avoid that by making every migration **additive and backwards-compatible**:

- Add columns/tables; never drop or rename in the same release as the code
  change.
- Use `add column if not exists ...` (nullable, or with a default).
- Run the SQL **before** deploying the code that needs it.

Because migrations are additive, the current production code keeps working
against the new schema, so staging and prod can safely share the database.

## Normal workflow

```bash
git checkout staging
# ...make changes, commit...

# 1. If this release needs new columns, run the additive SQL in Supabase FIRST.
# 2. Deploy + test on staging:
npm run deploy:staging          # -> https://wildassist-staging.vercel.app

# 3. When staging looks good, promote to production:
git checkout main
git merge --ff-only staging
git push
npm run deploy:prod             # -> https://wildassist.vercel.app
```

## Removing a column (rare)

Do it in two releases so nothing breaks:

1. Ship code that no longer reads the column. Deploy to prod.
2. In a later release, run the `drop column` SQL.
