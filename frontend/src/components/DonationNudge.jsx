import { Heart } from 'lucide-react';
import { C } from '../lib/colors';

// Live Buy Me a Coffee page (confirmed 2026-05-28).
const DONATION_URL = 'https://buymeacoffee.com/gitaflow';

/**
 * DonationNudge — appears quietly after every 5th saved reflection.
 *
 * Props:
 *   reflectionCount — total number of saved reflections for this user
 *
 * Logic: show when reflectionCount > 0 && reflectionCount % 5 === 0
 * That means: after 5th, 10th, 15th reflection etc.
 * Never intrudes on the first 4 reflections.
 */
export default function DonationNudge({ reflectionCount }) {
  if (!reflectionCount || reflectionCount === 0) return null;
  if (reflectionCount % 5 !== 0) return null;

  return (
    <div
      className="mt-8 pt-6 text-center"
      style={{ borderTop: '1px solid rgba(31,24,20,0.08)' }}
    >
      <div
        className="flex items-center justify-center gap-1.5 mb-3"
        style={{ color: C.inkMute }}
      >
        <Heart size={12} />
        <span className="font-body text-[10px] tracking-[0.18em]">
          SUSTAIN THIS WORK
        </span>
      </div>
      <p
        className="font-display italic text-[15px] leading-[1.55] mb-4 mx-auto max-w-[280px]"
        style={{ color: C.inkSoft, fontWeight: 350 }}
      >
        GitaMoment is built freely, sustained by those who find it useful.
      </p>
      <a
        href={DONATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md px-6 py-3 font-body text-[13px] transition"
        style={{
          background: 'transparent',
          color: C.saffron,
          border: `1px solid ${C.saffron}55`,
        }}
      >
        <Heart size={13} />
        <span>Support GitaMoment</span>
      </a>
      <p
        className="font-body text-[11px] mt-3"
        style={{ color: C.inkMute }}
      >
        Every contribution keeps this running. No pressure, ever.
      </p>
    </div>
  );
}
