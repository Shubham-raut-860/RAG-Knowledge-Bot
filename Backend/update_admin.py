"""One-time script to fix the admin password hash in the database."""
import sqlite3
import bcrypt

# Hash 'admin123' with bcrypt
password = b'admin123'
pw_hash = bcrypt.hashpw(password, bcrypt.gensalt()).decode()

# Update the admin record in the database
conn = sqlite3.connect('app.db')
conn.execute('UPDATE users SET password_hash = ? WHERE username = ?', (pw_hash, 'admin'))
conn.commit()

# Verify it works
stored_hash = conn.execute('SELECT password_hash FROM users WHERE username = "admin"').fetchone()[0]
valid = bcrypt.checkpw(password, stored_hash.encode())
print(f"Hash updated: {pw_hash}")
print(f"Verification: {'✅ PASS' if valid else '❌ FAIL'}")

conn.close()
