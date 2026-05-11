import sqlite3
c = sqlite3.connect('gitaflow.db')
c.row_factory = sqlite3.Row

rows = c.execute('''
    SELECT analysis_id, COUNT(*) as n, MIN(saved_at) as first, MAX(saved_at) as last
    FROM reflections
    GROUP BY analysis_id
    HAVING COUNT(*) > 1
    ORDER BY n DESC
''').fetchall()

if not rows:
    print('No duplicates found - data is clean.')
    print()
    print('Check total count and recent saves:')
    total = c.execute('SELECT COUNT(*) FROM reflections').fetchone()[0]
    print(f'Total reflections: {total}')
    recent = c.execute('SELECT id, analysis_id, saved_at FROM reflections ORDER BY saved_at DESC LIMIT 10').fetchall()
    for r in recent:
        print(f'  {r["saved_at"]} | {r["id"][:8]}... | analysis={r["analysis_id"][:8]}...')
else:
    print(f'Found {len(rows)} analysis_id values with multiple reflection entries:')
    print()
    for r in rows:
        print(f'  analysis_id={r["analysis_id"][:8]}... saved {r["n"]} times')
        print(f'    first: {r["first"]}')
        print(f'    last:  {r["last"]}')