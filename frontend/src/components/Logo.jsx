import logoUrl from '../assets/logo.png';

/**
 * GitaFlow brand logo — a single-line peacock feather crossed with
 * Krishna's flute, terracotta line art.
 *
 * Single source of truth for the logo asset across the app (header,
 * onboarding hero, admin panel). Change the import here and every
 * placement updates.
 *
 * logo.png is transparent and cropped tight to the artwork (derived from
 * the original feather.jpg), so it sits directly on parchment or the dark
 * admin bar with no visible background tile. `size` sets the rendered
 * HEIGHT in px; width scales to preserve the ~0.87 aspect ratio.
 *
 * NOTE: for the browser favicon and mobile app icon we still want a
 * feather-only crop (the flute is illegible below ~48px).
 */
export default function Logo({ size = 40, className = '', style = {}, alt = 'GitaFlow' }) {
  return (
    <img
      src={logoUrl}
      alt={alt}
      className={className}
      style={{ display: 'block', height: size, width: 'auto', ...style }}
    />
  );
}
