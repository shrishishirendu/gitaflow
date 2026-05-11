import json

with open('app/data/bhagavad_gita.json', encoding='utf-8') as f:
    g = json.load(f)

print(f'Total verses in library: {len(g)}')
print()

# Check the verses showing empty in your dashboard
print('=== The 3 verses from your dashboard screenshot ===')
for vid in ['BG_2_7', 'BG_18_35', 'BG_2_48']:
    v = g.get(vid)
    if not v:
        print(f'{vid}: NOT FOUND in library')
        continue
    t = v.get('translation') or '<EMPTY OR MISSING>'
    s = v.get('simple_meaning') or '<EMPTY OR MISSING>'
    print(f'{vid}:')
    print(f'  translation:    {t[:100]}')
    print(f'  simple_meaning: {s[:100]}')
    print()

# Library-wide audit
print('=== Library-wide audit ===')
no_trans = [vid for vid, v in g.items() if not (v.get('translation') or '').strip()]
no_simple = [vid for vid, v in g.items() if not (v.get('simple_meaning') or '').strip()]
no_both = [vid for vid, v in g.items()
           if not (v.get('translation') or '').strip()
           and not (v.get('simple_meaning') or '').strip()]
print(f'Verses with empty translation: {len(no_trans)}')
print(f'Verses with empty simple_meaning: {len(no_simple)}')
print(f'Verses with BOTH empty: {len(no_both)}')
if no_trans[:10]:
    print(f'  First 10 missing translation: {no_trans[:10]}')
if no_both[:5]:
    print(f'  First 5 with both empty: {no_both[:5]}')