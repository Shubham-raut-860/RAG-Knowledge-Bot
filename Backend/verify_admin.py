import sqlite3, bcrypt
conn = sqlite3.connect('app.db')
h = conn.execute("SELECT password_hash FROM users WHERE username='admin'").fetchone()[0]
print('HASH:', h[:20] + '...')
print('VALID:', bcrypt.checkpw(b'admin123', h.encode()))
conn.close()
