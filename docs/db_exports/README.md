# phalla.mdb CSV Exports

This directory contains table exports from the legacy `phalla.mdb` Microsoft Access database.

Each `.csv` file was generated with `mdb-export` and uses UTF-8 encoding with quoted values. The available tables are:

- `actions.csv`
- `actiontypes.csv`
- `games.csv`
- `players.csv`
- `posts.csv`
- `roles.csv`
- `rules.csv`
- `users.csv`

Run the following command from the repository root to regenerate the exports after updating `phalla.mdb`:

```bash
for table in actions actiontypes games players posts roles rules users; do
  mdb-export phalla.mdb "$table" > "docs/db_exports/${table}.csv"
done
```
