import { registerRootComponent } from 'expo';
import App from './App';

// SDK 54 entry point. registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// and also ensures the environment is set up appropriately whether running in Expo Go or a native build.
registerRootComponent(App);
