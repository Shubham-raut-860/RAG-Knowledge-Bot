import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import sqlite3, requests, base64, json

# Check DB for admin user role
print("=== DATABASE USER CHECK ===")
conn = sqlite3.connect('./app.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute('SELECT id, username, role FROM users')
rows = cur.fetchall()
for r in rows:
    uid = r['id']
    uname = r['username']
    urole = r['role']
    print(f"  id={uid} username={uname} role={urole}")
conn.close()

print("\n=== JWT DECODE CHECK ===")
# Login and decode the JWT to see what role is in it
r = requests.post("http://localhost:8000/auth/login",
                  json={"username": "admin", "password": "admin123"})
if r.status_code == 200:
    token = r.json()["access_token"]
    # Decode without verification to inspect claims
    payload_b64 = token.split('.')[1]
    # Add padding
    payload_b64 += '=' * (4 - len(payload_b64) % 4)
    payload = json.loads(base64.b64decode(payload_b64))
    print(f"  JWT claims: {json.dumps(payload, indent=2)}")
else:
    print(f"  Login failed: {r.status_code} {r.text}")

print("\n=== UPLOAD WITH TOKEN ===")
# Now try the upload and show exact response
DOC_CONTENT = "Test doc for scope debugging."
with open("scope_test.txt", "w") as f:
    f.write(DOC_CONTENT)

token = r.json()["access_token"] if r.status_code == 200 else ""
if token:
    with open("scope_test.txt", "rb") as f:
        resp = requests.post("http://localhost:8000/embed/upload",
                             headers={"Authorization": f"Bearer {token}"},
                             files={"file": ("scope_test.txt", f, "text/plain")})
    print(f"  POST /embed/upload -> {resp.status_code}: {resp.text}")

print("\n=== SSE STREAM FORMAT TEST ===")
# Test the actual SSE format returned by /chat
if token:
    with requests.post("http://localhost:8000/chat",
                       headers={"Authorization": f"Bearer {token}", "Accept": "text/event-stream"},
                       json={"message": "Say hello in one word."},
                       stream=True, timeout=60) as resp:
        print(f"  POST /chat -> {resp.status_code}, CT={resp.headers.get('Content-Type','?')}")
        print("  RAW SSE LINES (first 20):")
        count = 0
        for line in resp.iter_lines():
            if count >= 20:
                break
            if line:
                print(f"    {repr(line[:200])}")
                count += 1
