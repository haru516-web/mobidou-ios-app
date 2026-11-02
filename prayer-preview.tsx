import './src/polyfills';
import React from 'react';
import {registerRootComponent} from 'expo';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {FirstPersonPrayer} from './src/components/FirstPersonPrayer';
function Preview(){return <SafeAreaProvider><FirstPersonPrayer name="木漏れ日の社" haptics={false} onComplete={()=>alert('参拝完了・御朱印へ')} /></SafeAreaProvider>};
registerRootComponent(Preview);
