import sqlite3

conn = sqlite3.connect('app.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Tables
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print("Tables:", tables)

# Row counts
for t in tables:
    c.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  {t}: {c.fetchone()[0]} rows")

# Schema
for t in tables:
    c.execute(f"PRAGMA table_info({t})")
    cols = [r[1] for r in c.fetchall()]
    print(f"  {t} columns: {cols}")

# Sample admin user
c.execute("SELECT id, username, role FROM users LIMIT 5")
rows = c.fetchall()
print("Sample users:", [(r[0], r[1], r[2]) for r in rows])

conn.close()
print("DB check complete.")
