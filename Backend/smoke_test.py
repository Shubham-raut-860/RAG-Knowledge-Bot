"""
AERIS Grounded Core — Corrected Backend Smoke Test
Verified routes from /openapi.json:
  POST /auth/login
  POST /embed/upload         (multipart, field: 'file')
  GET  /admin/documents
  POST /chat                 (json: {message, session_id})
  GET  /chat/history/{id}
  GET  /chat/sessions
  GET  /admin/users
"""
import urllib.request, json, os, time

BASE = 'http://localhost:8000'
PASS = '[PASS]'
FAIL = '[FAIL]'

def post_json(path, payload, token=None):
    data = json.dumps(payload).encode()
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(f'{BASE}{path}', data=data, headers=headers, method='POST')
    res = urllib.request.urlopen(req, timeout=60)
    return json.loads(res.read())

def get_json(path, token=None):
    headers = {}
    if token: headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(f'{BASE}{path}', headers=headers)
    res = urllib.request.urlopen(req, timeout=30)
    return json.loads(res.read())

def upload_file(file_path, token):
    boundary = b'----AERISSmokeBoundary'
    fname = os.path.basename(file_path)
    with open(file_path, 'rb') as f:
        file_data = f.read()
    body = (
        b'--' + boundary + b'\r\n'
        b'Content-Disposition: form-data; name="file"; filename="' + fname.encode() + b'"\r\n'
        b'Content-Type: text/plain\r\n\r\n'
        + file_data + b'\r\n'
        b'--' + boundary + b'--\r\n'
    )
    headers = {
        'Content-Type': f'multipart/form-data; boundary={boundary.decode()}',
        'Content-Length': str(len(body)),
        'Authorization': f'Bearer {token}',
    }
    req = urllib.request.Request(f'{BASE}/embed/upload', data=body, headers=headers, method='POST')
    res = urllib.request.urlopen(req, timeout=120)
    return json.loads(res.read())

print('=' * 62)
print('AERIS Grounded Core - Full Backend Smoke Test')
print('=' * 62)

results = {'pass': 0, 'fail': 0}

def check(label, fn):
    try:
        result = fn()
        print(f'{PASS} {label}')
        results['pass'] += 1
        return result
    except Exception as e:
        print(f'{FAIL} {label}: {e}')
        results['fail'] += 1
        return None

# 1. Health
h = check('Health check', lambda: get_json('/health'))
if h: print(f'      Status: {h.get("status")} | ChromaDocs: {h.get("chroma_docs", "?")}')

# 2. Login
token = None
r = check('Admin login (admin/admin123)', lambda: post_json('/auth/login', {'username': 'admin', 'password': 'admin123'}))
if r:
    token = r.get('access_token', '')
    print(f'      Role: {r.get("role", "?")} | Token: {token[:25]}...')

if not token:
    print('Cannot continue without token.')
    exit(1)

# 3. Upload document
test_file = 'smoke_test_doc.txt'
with open(test_file, 'w') as f:
    f.write("""AERIS Platform Compliance Rules v1.0

Standard Limits:
- Maximum file upload size: 50MB
- Supported formats: PDF, TXT, DOCX
- Session timeout: 30 minutes of inactivity

Onboarding Requirements:
- All new users must complete identity verification within 7 days
- Admin approval required for role elevation
- Password must be at least 12 characters

Data Retention Policy:
- Chat histories are retained for 90 days
- Uploaded documents stored indefinitely unless manually deleted
- Audit logs immutable and retained for 2 years

Zero-Hallucination Policy:
- AERIS only responds based on documents in the knowledge base
- If no relevant context found, the system says so explicitly
""")

upload_result = check('Document upload (POST /embed/upload)', lambda: upload_file(test_file, token))
if upload_result:
    print(f'      Response: {str(upload_result)[:120]}')

# 4. Document list
docs = check('Document list (GET /admin/documents)', lambda: get_json('/admin/documents', token))
if docs is not None:
    count = len(docs) if isinstance(docs, list) else 0
    print(f'      {count} document(s) in knowledge base')

# 5. Wait for indexing
print('      Waiting 8s for ChromaDB indexing...')
time.sleep(8)

# 6. Chat - new session
chat_result = None
def do_chat():
    return post_json('/chat', {
        'message': 'What are the onboarding requirements for new users in AERIS?',
        'session_id': None
    }, token)

chat_result = check('Chat message - new session (POST /chat)', do_chat)
session_id = None
if chat_result:
    session_id = chat_result.get('session_id', '')
    answer = chat_result.get('answer', '')
    sources = chat_result.get('sources', [])
    print(f'      Session: {session_id[:16]}...' if session_id else '      No session_id in response')
    print(f'      Answer ({len(answer)} chars): {answer[:120]}...' if answer else '      No answer')
    print(f'      Sources cited: {len(sources)}')
    if sources:
        for s in sources[:2]:
            print(f'        - {str(s)[:80]}')

# 7. Follow-up message in same session
if session_id:
    r2 = check(f'Chat follow-up in same session', lambda: post_json('/chat', {
        'message': 'What is the data retention period for chat histories?',
        'session_id': session_id
    }, token))
    if r2:
        print(f'      Answer: {r2.get("answer", "")[:120]}...')

# 8. Conversation history stored?
if session_id:
    history = check(f'History stored (GET /chat/history/{session_id[:8]}...)', lambda: get_json(f'/chat/history/{session_id}', token))
    if history:
        msgs = history.get('messages', [])
        print(f'      {len(msgs)} message(s) in history')
        for m in msgs:
            role = m.get('role', '?')
            snippet = m.get('content', '')[:60]
            print(f'        [{role}] {snippet}...')

# 9. Sessions list
sessions = check('Sessions list (GET /chat/sessions)', lambda: get_json('/chat/sessions', token))
if sessions is not None:
    count = len(sessions) if isinstance(sessions, list) else 0
    print(f'      {count} session(s) stored in DB')

# 10. Users list
users = check('Users list (GET /admin/users)', lambda: get_json('/admin/users', token))
if users is not None:
    count = len(users) if isinstance(users, list) else 0
    print(f'      {count} user(s) in DB')

# Cleanup
os.remove(test_file)

print('=' * 62)
print(f'Result: {results["pass"]} PASSED  |  {results["fail"]} FAILED')
print('=' * 62)
