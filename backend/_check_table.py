import sqlite3
c = sqlite3.connect('gitaflow.db')
tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print('Tables:', tables)
print('verse_media exists:', 'verse_media' in tables)