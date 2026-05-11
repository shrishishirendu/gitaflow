import json

with open('app/api/routes_dashboard.py', encoding='utf-8') as f:
    content = f.read()

if 'simple_meaning' in content:
    print('FIX APPLIED: routes_dashboard.py has simple_meaning')
else:
    print('FIX MISSING: routes_dashboard.py needs the zip re-applied')

with open('app/data/bhagavad_gita.json', encoding='utf-8') as f:
    g = json.load(f)

for vid in ['BG_2_7', 'BG_18_35']:
    v = g.get(vid, {})
    sm = (v.get('simple_meaning') or '')[:80]
    print(f'{vid} simple_meaning: "{sm}"')