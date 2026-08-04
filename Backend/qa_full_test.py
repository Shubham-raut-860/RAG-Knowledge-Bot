# -*- coding: utf-8 -*-
"""
AERIS Grounded Core - Comprehensive QA Smoke Test (Windows-safe)
Tests: Auth, Chat, RAG Pipeline, Admin, Edge Cases, Security
"""
import sys, io
# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import urllib.request, urllib.error, json, time, sqlite3

BASE = 'http://localhost:8000'
PASS_COUNT = 0
FAIL_COUNT = 0
results = []

def p(label, passed, detail=''):
    global PASS_COUNT, FAIL_COUNT
    status = 'PASS' if passed else 'FAIL'
    if passed: PASS_COUNT += 1
    else: FAIL_COUNT += 1
    results.append((status, label, detail))
    icon = '[OK]' if passed else '[!!]'
    print(f"  {icon} [{status}] {label}{(' -- ' + str(detail)) if detail else ''}", flush=True)

def req(method, path, data=None, token=None, files=None):
    url = BASE + path
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode() if data else None
    if files:
        boundary = 'AERISboundary123'
        headers['Content-Type'] = f'multipart/form-data; boundary={boundary}'
        fname, fcontent, ftype = files
        body = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="file"; filename="{fname}"\r\n'
            f'Content-Type: {ftype}\r\n\r\n'
        ).encode() + fcontent + f'\r\n--{boundary}--\r\n'.encode()
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        res = urllib.request.urlopen(r, timeout=60)
        return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except:
            return e.code, {}
    except Exception as ex:
        return 0, {'error': str(ex)}

print("\n" + "="*65)
print("  AERIS GROUNDED CORE -- COMPREHENSIVE QA SMOKE TEST")
print("="*65, flush=True)

# ---------------------------------------------------------------
print("\n[1] ENVIRONMENT & CONNECTIVITY")
# ---------------------------------------------------------------
for i in range(20):
    try:
        urllib.request.urlopen(BASE + '/health', timeout=3)
        break
    except:
        time.sleep(1)
        if i == 19:
            print("  [!!] Backend not reachable after 20s -- aborting")
            sys.exit(1)

code, data = req('GET', '/health')
p("Health endpoint responds", code == 200, f"code={code}")
p("Health status = 'ok'", data.get('status') == 'ok', f"got={data.get('status')}")
p("chroma_docs field present", 'chroma_docs' in data, str(data.get('chroma_docs', 'MISSING')))

# ---------------------------------------------------------------
print("\n[2] AUTHENTICATION")
# ---------------------------------------------------------------
ts = int(time.time())
NEW_USER = f'qatest_{ts}'

code, data = req('POST', '/auth/register', {'username': NEW_USER, 'password': 'testpass123'})
p("Register new user (201)", code == 201, f"code={code}")
new_token = data.get('access_token', '')
p("Token returned on register", bool(new_token))

code, _ = req('POST', '/auth/register', {'username': NEW_USER, 'password': 'other'})
p("Duplicate register -> 409/400", code in (400, 409), f"code={code}")

code, data = req('POST', '/auth/login', {'username': 'admin', 'password': 'admin123'})
p("Admin login (200)", code == 200, f"code={code}")
admin_token = data.get('access_token', '')
p("Admin token returned", bool(admin_token))

code, _ = req('POST', '/auth/login', {'username': 'admin', 'password': 'wrongpassword'})
p("Wrong password -> 401", code == 401, f"code={code}")

code, _ = req('POST', '/auth/login', {'username': 'nonexistent_user_xyz_qa', 'password': 'abc'})
p("Non-existent user -> 401/404", code in (401, 404), f"code={code}")

# ---------------------------------------------------------------
print("\n[3] DOCUMENT UPLOAD & RAG PIPELINE")
# ---------------------------------------------------------------
test_content = b"""AERIS QA TEST DOCUMENT
Project Codename: Project Phoenix
Budget: $2,500,000 allocated for Q3 2026
Key Contacts: Sarah Chen (Lead), Marcus Webb (Tech)
Risk Level: HIGH - requires board approval
Deadline: September 30, 2026
Policy: All changes must be approved by 3 senior stakeholders.
This document is used for QA testing of the RAG pipeline ingestion.
"""
code, data = req('POST', '/embed/upload', token=admin_token,
                 files=('qa_test_doc.txt', test_content, 'text/plain'))
p("Admin can upload document (200/201)", code in (200, 201), f"code={code}")
doc_id = data.get('doc_id')
p("doc_id returned", bool(doc_id), str(doc_id))
p("status field present", 'status' in data, str(data))

code2, _ = req('POST', '/embed/upload', token=new_token,
               files=('hack.txt', b'test', 'text/plain'))
p("Non-admin upload -> 403", code2 == 403, f"code={code2}")

code3, _ = req('POST', '/embed/upload', token=admin_token,
               files=('malware.exe', b'MZ', 'application/octet-stream'))
p("Unsupported file type -> 400/415/422", code3 in (400, 415, 422), f"code={code3}")

print("    [waiting up to 60s for document ingestion...]", flush=True)
ready = False
status_data = {}
if doc_id:
    for i in range(30):
        code_s, status_data = req('GET', f'/embed/status/{doc_id}', token=admin_token)
        st = status_data.get('status', '')
        print(f"    ... attempt {i+1}: status={st}", flush=True)
        if st == 'ready':
            ready = True
            break
        elif st == 'error':
            print(f"    ... ERROR: {status_data.get('error_message', 'unknown')}", flush=True)
            break
        time.sleep(2)

p("Document reaches 'ready' status", ready, f"final_status={status_data.get('status')}")
if ready:
    p("chunk_count > 0", status_data.get('chunk_count', 0) > 0,
      f"chunks={status_data.get('chunk_count')}")

# ---------------------------------------------------------------
print("\n[4] CHAT & RAG QUERY")
# ---------------------------------------------------------------
code, chat_data = req('POST', '/chat', token=new_token,
                      data={'message': 'What is the budget for Project Phoenix?'})
p("Chat endpoint responds (200)", code == 200, f"code={code}")
answer = chat_data.get('answer', '')
session_id = chat_data.get('session_id')
p("Answer non-empty", len(answer) > 10, f"len={len(answer)}")
p("session_id returned", bool(session_id))
sources = chat_data.get('sources', [])
p("Sources returned with answer", len(sources) > 0, f"count={len(sources)}")
if sources:
    p("Source has 'filename' field", 'filename' in sources[0], str(sources[0].get('filename')))
    p("Source has 'content_preview' field", 'content_preview' in sources[0])
    p("Answer mentions budget/Phoenix", any(kw in answer.lower() for kw in
      ['2,500,000','2500000','budget','phoenix','million']), f"answer[:200]={answer[:200]}")

code, chat2 = req('POST', '/chat', token=new_token,
                  data={'message': 'Who are the key contacts?', 'session_id': session_id})
p("Follow-up in same session (200)", code == 200, f"code={code}")
p("Follow-up session_id matches", chat2.get('session_id') == session_id)

code, _ = req('POST', '/chat', token=new_token, data={'message': ''})
p("Empty message -> 422", code in (400, 422), f"code={code}")

code, _ = req('POST', '/chat', data={'message': 'test'})
p("Chat without auth -> 401", code == 401, f"code={code}")

# ---------------------------------------------------------------
print("\n[5] CHAT HISTORY & SESSIONS")
# ---------------------------------------------------------------
code, history = req('GET', f'/chat/history/{session_id}', token=new_token)
p("Get own session history (200)", code == 200, f"code={code}")
msgs = history.get('messages', [])
p("History has >= 2 messages", len(msgs) >= 2, f"count={len(msgs)}")
if msgs:
    p("Message has 'role' field", 'role' in msgs[0])
    p("Message has 'content' field", 'content' in msgs[0])
    p("Message has 'created_at' field", 'created_at' in msgs[0])

code, _ = req('GET', f'/chat/history/{session_id}', token=admin_token)
p("Other user cannot access session -> 403/404", code in (403, 404), f"code={code}")

code, sessions_list = req('GET', '/chat/sessions', token=new_token)
p("List sessions (200)", code == 200, f"code={code}")
p("Session list is array", isinstance(sessions_list, list))

code, del_data = req('DELETE', f'/chat/sessions/{session_id}', token=new_token)
p("Delete own session (200)", code == 200, f"code={code}")
p("Delete response has deleted=True", del_data.get('deleted') == True)

code, _ = req('DELETE', f'/chat/sessions/{session_id}', token=new_token)
p("Delete non-existent session -> 404", code == 404, f"code={code}")

# ---------------------------------------------------------------
print("\n[6] ADMIN ENDPOINTS")
# ---------------------------------------------------------------
code, docs = req('GET', '/admin/documents', token=admin_token)
p("Admin list documents (200)", code == 200, f"code={code}")
p("Documents is a list", isinstance(docs, list))

code, _ = req('GET', '/admin/documents', token=new_token)
p("Non-admin cannot list docs -> 403", code == 403, f"code={code}")

code, users = req('GET', '/admin/users', token=admin_token)
p("Admin list users (200)", code == 200, f"code={code}")
p("Users is a list", isinstance(users, list))
if isinstance(users, list) and users:
    u0 = users[0]
    p("User has id/username/role", all(k in u0 for k in ('id','username','role')))

code, _ = req('GET', '/admin/users', token=new_token)
p("Non-admin cannot list users -> 403", code == 403, f"code={code}")

if isinstance(users, list):
    admin_user = next((u for u in users if u.get('username') == 'admin'), None)
    if admin_user:
        code, _ = req('POST', f"/admin/users/{admin_user['id']}/role",
                      token=admin_token, data={'role': 'user'})
        p("Admin self-demotion blocked -> 400/403", code in (400, 403), f"code={code}")

if doc_id:
    code, _ = req('DELETE', f'/admin/documents/{doc_id}', token=admin_token)
    p("Admin delete document (200)", code == 200, f"code={code}")
    code, _ = req('DELETE', f'/admin/documents/{doc_id}', token=admin_token)
    p("Delete non-existent doc -> 404", code == 404, f"code={code}")

# ---------------------------------------------------------------
print("\n[7] SECURITY CHECKS")
# ---------------------------------------------------------------
code, _ = req('GET', '/admin/users',
              token='placeholder_token_value')
p("Tampered JWT rejected -> 401/403", code in (401, 403), f"code={code}")

code, _ = req('GET', '/admin/documents')
p("No token on admin endpoint -> 401", code == 401, f"code={code}")

try:
    r = urllib.request.Request(BASE + '/health',
                               headers={'Origin': 'http://localhost:3000'})
    res = urllib.request.urlopen(r, timeout=5)
    cors = res.headers.get('Access-Control-Allow-Origin', '')
    p("CORS allows localhost:3000", bool(cors), f"header={cors!r}")
except Exception as ex:
    p("CORS header check", False, str(ex))

conn = sqlite3.connect('./app.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT password_hash FROM users WHERE username='admin'")
row = c.fetchone()
conn.close()
if row:
    phash = row[0]
    p("Password stored as bcrypt hash", phash.startswith('$2b$') or phash.startswith('$2a$'),
      f"prefix={phash[:10]}")
else:
    p("Admin user found in DB", False, "no admin row")

# ---------------------------------------------------------------
print("\n[8] FRONTEND BUILD STATUS")
# ---------------------------------------------------------------
import os, subprocess
result = subprocess.run(
    ['npm', 'run', 'lint'],
    capture_output=True, text=True,
    cwd=r'D:\Shubham\RAG+BOT\Frontend'
)
p("Frontend TypeScript compiles (tsc --noEmit)", result.returncode == 0,
  result.stderr[:200] if result.returncode != 0 else 'clean')

# ---------------------------------------------------------------
print("\n" + "="*65)
print(f"  FINAL: {PASS_COUNT} PASSED | {FAIL_COUNT} FAILED | {PASS_COUNT+FAIL_COUNT} TOTAL")
print("="*65, flush=True)

if FAIL_COUNT > 0:
    print("\nFAILED TESTS SUMMARY:")
    for status, label, detail in results:
        if status == 'FAIL':
            print(f"  [!!] {label}: {detail}")
else:
    print("\n  All tests passed! AERIS is fully operational.")
