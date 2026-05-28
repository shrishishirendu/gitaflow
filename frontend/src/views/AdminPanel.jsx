import { useEffect, useState, useCallback } from 'react';
import { Search, Save, Youtube, Mic, Image, Volume2, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Logo from '../components/Logo';

const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * GitaFlow Admin Panel
 * Access at: /admin
 * Password set via ADMIN_PASSWORD env var on Railway (default: gitaflow-admin-2026)
 *
 * Features:
 *   - Search all 697 verses by text, chapter, or media status
 *   - Add/edit YouTube URL, Podcast URL, Infographic URL per verse
 *   - Stats header showing population progress
 */

export default function AdminPanel() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);

  async function tryLogin() {
    try {
      const r = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { 'X-Admin-Password': password },
      });
      if (r.ok) {
        setAuthenticated(true);
        setAuthError(false);
        localStorage.setItem('gf_admin_pw', password);
      } else {
        setAuthError(true);
      }
    } catch {
      setAuthError(true);
    }
  }

  // Try saved password on mount
  useEffect(() => {
    const saved = localStorage.getItem('gf_admin_pw');
    if (saved) {
      setPassword(saved);
      fetch(`${API_BASE}/api/admin/stats`, {
        headers: { 'X-Admin-Password': saved },
      }).then(r => { if (r.ok) setAuthenticated(true); }).catch(() => {});
    }
  }, []);

  if (!authenticated) {
    return (
      <div style={{ fontFamily: 'system-ui', maxWidth: 400, margin: '120px auto', padding: 24 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>GitaFlow Admin</h1>
        <p style={{ color: '#666', marginBottom: 24 }}>Enter your admin password to continue.</p>
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && tryLogin()}
          style={{
            width: '100%', padding: '10px 14px', fontSize: 15,
            border: authError ? '2px solid #e53e3e' : '1px solid #ccc',
            borderRadius: 8, marginBottom: 12, boxSizing: 'border-box',
          }}
        />
        {authError && <p style={{ color: '#e53e3e', marginBottom: 12 }}>Wrong password.</p>}
        <button
          onClick={tryLogin}
          style={{
            width: '100%', padding: '10px 14px', background: '#1F1814',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer',
          }}
        >
          Sign in
        </button>
      </div>
    );
  }

  return <AdminDashboard password={password} onLogout={() => {
    setAuthenticated(false);
    localStorage.removeItem('gf_admin_pw');
  }} />;
}

function AdminDashboard({ password, onLogout }) {
  const [stats, setStats] = useState(null);
  const [verses, setVerses] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [chapter, setChapter] = useState('');
  const [hasMedia, setHasMedia] = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  const headers = { 'X-Admin-Password': password, 'Content-Type': 'application/json' };

  const loadStats = useCallback(async () => {
    const r = await fetch(`${API_BASE}/api/admin/stats`, { headers });
    if (r.ok) setStats(await r.json());
  }, []);

  const loadVerses = useCallback(async (p = 1) => {
    const params = new URLSearchParams({ page: p, page_size: 20 });
    if (query) params.set('q', query);
    if (chapter) params.set('chapter', chapter);
    if (hasMedia !== '') params.set('has_media', hasMedia);
    const r = await fetch(`${API_BASE}/api/admin/verses?${params}`, { headers });
    if (r.ok) {
      const d = await r.json();
      setVerses(d.results);
      setTotal(d.total);
      setPages(d.pages);
      setPage(p);
    }
  }, [query, chapter, hasMedia]);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadVerses(1); }, [query, chapter, hasMedia]);

  async function selectVerse(verse) {
    const r = await fetch(`${API_BASE}/api/admin/verses/${verse.verse_id}`, { headers });
    if (r.ok) setSelected(await r.json());
  }

  async function saveMedia() {
    if (!selected) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/verses/${selected.verse_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          youtube_url: selected.youtube_url || null,
          podcast_url: selected.podcast_url || null,
          infographic_url: selected.infographic_url || null,
          recitation_url: selected.recitation_url || null,
          analysis_url: selected.analysis_url || null,
        }),
      });
      if (r.ok) {
        setSaveMsg('saved');
        loadStats();
        loadVerses(page);
        setTimeout(() => setSaveMsg(null), 3000);
      } else {
        setSaveMsg('error');
      }
    } catch {
      setSaveMsg('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui', minHeight: '100vh', background: '#f8f6f1' }}>
      {/* Header */}
      <div style={{ background: '#1F1814', color: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo size={34} />
          <div>
            <span style={{ fontSize: 18, fontWeight: 600 }}>GitaFlow Admin</span>
            <span style={{ marginLeft: 16, fontSize: 13, opacity: 0.6 }}>Verse Media Manager</span>
          </div>
        </div>
        {stats && (
          <div style={{ display: 'flex', gap: 24, fontSize: 13, opacity: 0.85 }}>
            <span>📺 {stats.with_youtube} YouTube</span>
            <span>🎙️ {stats.with_podcast} Podcasts</span>
            <span>🖼️ {stats.with_infographic} Infographics</span>
            <span style={{ opacity: 0.5 }}>of {stats.total_verses} verses</span>
          </div>
        )}
        <button onClick={onLogout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          Sign out
        </button>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 57px)' }}>
        {/* Left panel — verse list */}
        <div style={{ width: 420, borderRight: '1px solid #e2ddd6', display: 'flex', flexDirection: 'column', background: '#fff' }}>
          {/* Search + filters */}
          <div style={{ padding: 16, borderBottom: '1px solid #e2ddd6' }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input
                placeholder="Search verses — anger, equanimity, BG 2.47..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 10px 8px 32px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={chapter}
                onChange={e => setChapter(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
              >
                <option value="">All chapters</option>
                {Array.from({ length: 18 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Chapter {i + 1}</option>
                ))}
              </select>
              <select
                value={hasMedia}
                onChange={e => setHasMedia(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
              >
                <option value="">All verses</option>
                <option value="true">Has media</option>
                <option value="false">No media</option>
              </select>
            </div>
          </div>

          {/* Verse list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {verses.map(v => (
              <div
                key={v.verse_id}
                onClick={() => selectVerse(v)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0ece6',
                  cursor: 'pointer',
                  background: selected?.verse_id === v.verse_id ? '#fdf8f0' : 'transparent',
                  borderLeft: selected?.verse_id === v.verse_id ? '3px solid #9C7A3A' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#9C7A3A' }}>
                    BG {v.chapter}.{v.verse}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {v.youtube_url && <Youtube size={13} color="#e53e3e" />}
                    {v.podcast_url && <Mic size={13} color="#805ad5" />}
                    {v.infographic_url && <Image size={13} color="#3182ce" />}
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#666', margin: 0, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {v.simple_meaning}
                </p>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #e2ddd6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#666' }}>
            <span>{total} verses</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => loadVerses(page - 1)} disabled={page <= 1} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: page <= 1 ? 0.3 : 1 }}>
                <ChevronLeft size={16} />
              </button>
              <span>{page} / {pages}</span>
              <button onClick={() => loadVerses(page + 1)} disabled={page >= pages} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: page >= pages ? 0.3 : 1 }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right panel — editor */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          {!selected ? (
            <div style={{ textAlign: 'center', marginTop: 80, color: '#999' }}>
              <p style={{ fontSize: 16 }}>Select a verse from the left to edit its media</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>YouTube videos, podcast episodes, and infographic images</p>
            </div>
          ) : (
            <div style={{ maxWidth: 640 }}>
              {/* Verse header */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, letterSpacing: 2, color: '#9C7A3A', marginBottom: 6 }}>
                  BG {selected.chapter}.{selected.verse}
                </div>
                {selected.sanskrit && (
                  <p style={{ fontSize: 18, lineHeight: 1.7, color: '#1F1814', marginBottom: 8 }}>
                    {selected.sanskrit}
                  </p>
                )}
                <p style={{ fontSize: 14, color: '#666', fontStyle: 'italic', marginBottom: 8 }}>
                  {selected.transliteration}
                </p>
                <p style={{ fontSize: 15, color: '#444', lineHeight: 1.6 }}>
                  {selected.simple_meaning}
                </p>
                {selected.themes?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {selected.themes.map(t => (
                      <span key={t} style={{ fontSize: 11, padding: '2px 8px', background: '#f0ece6', borderRadius: 999, color: '#666' }}>
                        {t.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Media fields */}
              <div style={{ borderTop: '1px solid #e2ddd6', paddingTop: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: '#1F1814' }}>
                  Media Links
                </h3>

                {/* Order matches the public verse view:
                    1. Recitation  2. Infographic  3. Podcast
                    4. Analysis by Shri Shishirendu (analysis_url)
                    5. Modern day Analysis (youtube_url) */}

                <MediaField
                  icon={<Volume2 size={16} color="#2f855a" />}
                  label="Recitation Audio URL (your voice)"
                  placeholder="https://drive.google.com/... or SoundCloud / any audio URL"
                  value={selected.recitation_url || ''}
                  onChange={v => setSelected(s => ({ ...s, recitation_url: v }))}
                />

                <MediaField
                  icon={<Image size={16} color="#3182ce" />}
                  label="Infographic Image URL"
                  placeholder="https://drive.google.com/... or Cloudinary / Imgur URL"
                  value={selected.infographic_url || ''}
                  onChange={v => setSelected(s => ({ ...s, infographic_url: v }))}
                />

                {/* Preview infographic if URL present */}
                {selected.infographic_url && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Preview:</p>
                    <img
                      src={selected.infographic_url}
                      alt="Infographic preview"
                      style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid #e2ddd6', objectFit: 'contain' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}

                <MediaField
                  icon={<Mic size={16} color="#805ad5" />}
                  label="Podcast Episode URL"
                  placeholder="https://open.spotify.com/episode/... or any podcast URL"
                  value={selected.podcast_url || ''}
                  onChange={v => setSelected(s => ({ ...s, podcast_url: v }))}
                />

                <MediaField
                  icon={<Youtube size={16} color="#B6502E" />}
                  label="Analysis by Shri Shishirendu (YouTube)"
                  placeholder="https://www.youtube.com/watch?v=...  (your personal analysis)"
                  value={selected.analysis_url || ''}
                  onChange={v => setSelected(s => ({ ...s, analysis_url: v }))}
                />

                <MediaField
                  icon={<Youtube size={16} color="#e53e3e" />}
                  label="Modern day Analysis (YouTube)"
                  placeholder="https://www.youtube.com/watch?v=...  (applying the verse to modern life)"
                  value={selected.youtube_url || ''}
                  onChange={v => setSelected(s => ({ ...s, youtube_url: v }))}
                />

                {/* Save button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={saveMedia}
                    disabled={saving}
                    style={{
                      padding: '10px 24px',
                      background: '#1F1814',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Save size={15} />
                    {saving ? 'Saving…' : 'Save media'}
                  </button>

                  {saveMsg === 'saved' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38a169', fontSize: 14 }}>
                      <CheckCircle size={16} />
                      Saved successfully
                    </div>
                  )}
                  {saveMsg === 'error' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e53e3e', fontSize: 14 }}>
                      <XCircle size={16} />
                      Save failed — try again
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MediaField({ icon, label, placeholder, value, onChange }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 }}>
        {icon}
        {label}
      </label>
      <input
        type="url"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '9px 12px',
          border: '1px solid #ddd',
          borderRadius: 6,
          fontSize: 13,
          boxSizing: 'border-box',
          color: '#1F1814',
        }}
      />
      {value && (
        <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#9C7A3A', marginTop: 4, display: 'inline-block' }}>
          Open link ↗
        </a>
      )}
    </div>
  );
}
