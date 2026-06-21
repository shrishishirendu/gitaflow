import { Image } from 'react-native';

const LOGO = require('../../assets/logo.png');

/**
 * GitaMoment brand logo — peacock feather crossed with Krishna's flute.
 * Mirrors the web Logo component so both clients render the same artwork.
 * `size` sets the rendered HEIGHT; width auto-scales to preserve aspect ratio.
 */
export default function Logo({ size = 40, style }) {
  return (
    <Image
      source={LOGO}
      style={[{ height: size, width: size * 0.87, resizeMode: 'contain' }, style]}
      accessibilityLabel="GitaMoment"
    />
  );
}
