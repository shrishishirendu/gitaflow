import { C } from '../lib/colors';

export default function Chip({ label, active, onClick }) {
  const base = 'px-3.5 py-1.5 rounded-full text-[13px] font-body tracking-wide transition border';
  const styles = active
    ? { background: C.ink, color: C.paper, borderColor: C.ink }
    : { background: 'transparent', color: C.inkSoft, borderColor: 'rgba(31,24,20,0.18)' };

  return (
    <button onClick={onClick} className={base} style={styles}>
      {label}
    </button>
  );
}
