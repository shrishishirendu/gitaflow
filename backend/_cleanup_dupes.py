import sqlite3
c = sqlite3.connect('gitaflow.db')
c.row_factory = sqlite3.Row

# For each (user_id, analysis_id) pair with duplicates, keep only the
# earliest row. Delete the rest.
dupes = c.execute('''
    SELECT user_id, analysis_id, COUNT(*) as n
    FROM reflections
    GROUP BY user_id, analysis_id
    HAVING COUNT(*) > 1
''').fetchall()

if not dupes:
    print('No duplicates found - nothing to clean.')
else:
    total_removed = 0
    for d in dupes:
        # Find all reflection IDs for this pair, ordered by saved_at
        rows = c.execute('''
            SELECT id FROM reflections
            WHERE user_id = ? AND analysis_id = ?
            ORDER BY saved_at ASC
        ''', (d['user_id'], d['analysis_id'])).fetchall()
        keep_id = rows[0]['id']
        delete_ids = [r['id'] for r in rows[1:]]
        for did in delete_ids:
            c.execute('DELETE FROM reflections WHERE id = ?', (did,))
        total_removed += len(delete_ids)
        print(f"  Kept {keep_id[:8]}..., removed {len(delete_ids)} duplicates of analysis_id {d['analysis_id'][:8]}...")
    c.commit()
    print(f'\nTotal duplicates removed: {total_removed}')
    print('Verifying...')
    remaining = c.execute('SELECT COUNT(*) FROM reflections').fetchone()[0]
    print(f'Reflections after cleanup: {remaining}')