import sqlite3
c = sqlite3.connect('gitaflow.db')
c.row_factory = sqlite3.Row

# 1. Count reflections per user
print('=== Per-user reflection counts ===')
users = c.execute('SELECT id, device_id, created_at FROM users ORDER BY created_at').fetchall()
for u in users:
    raw = c.execute('SELECT COUNT(*) FROM reflections WHERE user_id = ?', (u['id'],)).fetchone()[0]
    # Count after JOIN with karma_analyses (this is what the journal endpoint uses)
    joined = c.execute('''
        SELECT COUNT(*) FROM reflections r
        JOIN karma_analyses a ON a.id = r.analysis_id
        WHERE r.user_id = ?
    ''', (u['id'],)).fetchone()[0]
    print(f'  user {u["id"][:8]}... ({u["device_id"][-12:]}): raw={raw}, joinable={joined}')

print()

# 2. Total counts across the table
total_refl = c.execute('SELECT COUNT(*) FROM reflections').fetchone()[0]
total_anal = c.execute('SELECT COUNT(*) FROM karma_analyses').fetchone()[0]
orphaned = c.execute('''
    SELECT COUNT(*) FROM reflections r
    LEFT JOIN karma_analyses a ON a.id = r.analysis_id
    WHERE a.id IS NULL
''').fetchone()[0]
print(f'Total reflections: {total_refl}')
print(f'Total karma_analyses: {total_anal}')
print(f'Orphaned reflections (no matching analysis): {orphaned}')

# 3. List orphans if any
if orphaned > 0:
    print()
    print('=== Orphaned reflections ===')
    orphans = c.execute('''
        SELECT r.id, r.user_id, r.analysis_id, r.saved_at FROM reflections r
        LEFT JOIN karma_analyses a ON a.id = r.analysis_id
        WHERE a.id IS NULL
    ''').fetchall()
    for o in orphans:
        print(f'  reflection {o["id"][:8]}... user {o["user_id"][:8]}... analysis {o["analysis_id"][:8]}... saved {o["saved_at"]}')