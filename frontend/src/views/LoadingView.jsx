import { useEffect, useState } from 'react';
import { C } from '../lib/colors';

const MESSAGES = [
  'Listening…',
  "Looking through karma's lens…",
  'Finding the verse that meets you here…',
  'Translating wisdom into action…',
];

export default function LoadingView() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % MESSAGES.length), 1700);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center px-6 pt-32 pb-32 min-h-[70vh]">
      <div className="relative w-20 h-20 mb-10">
        <div
          className="absolute inset-0 rounded-full breathe"
          style={{
            background: `radial-gradient(circle, ${C.saffron}66 0%, ${C.saffron}11 60%, transparent 80%)`,
          }}
        />
        <div className="absolute inset-6 rounded-full" style={{ background: C.saffron }} />
      </div>
      <p
        key={i}
        className="font-display italic text-[19px] text-center fade-up"
        style={{ color: C.inkSoft, fontWeight: 350 }}
      >
        {MESSAGES[i]}
      </p>
    </div>
  );
}
