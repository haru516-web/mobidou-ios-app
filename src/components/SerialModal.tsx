import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, type ModalProps } from 'react-native';

/**
 * A drop-in `Modal` that never lets two native presentations overlap on iOS.
 *
 * React Native's iOS Modal can be left with an invisible full-screen controller that swallows every touch when
 * one modal is shown while another is still presenting or dismissing (or when the same one is reopened during its
 * own fade-out). This app changes many modals from state, so overlaps happen. Here a show waits until no other
 * modal is mid-transition, and a hide waits until its own presentation has finished.
 * https://github.com/facebook/react-native/issues/50152
 */
type Phase = 'idle' | 'presenting' | 'shown' | 'dismissing';

const FALLBACK_MS = 900; // onShow / onDismiss do not always arrive (for example after a swipe-down dismissal).
let transitions = 0;
const listeners = new Set<() => void>();
const changed = () => { listeners.forEach(listener => listener()); };

export function SerialModal({ visible, onShow, onDismiss, children, ...rest }: ModalProps) {
  const [nativeVisible, setNativeVisible] = useState(false);
  const phase = useRef<Phase>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wanted = useRef(!!visible);
  wanted.current = !!visible;

  const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const settle = useCallback((next: Phase) => {
    clearTimer();
    const wasMoving = phase.current === 'presenting' || phase.current === 'dismissing';
    phase.current = next;
    if (wasMoving) { transitions = Math.max(0, transitions - 1); }
    changed();
  }, []);
  const reconcile = useCallback(() => {
    if (wanted.current && phase.current === 'idle' && transitions === 0) {
      phase.current = 'presenting';
      transitions += 1;
      setNativeVisible(true);
      timer.current = setTimeout(() => { if (phase.current === 'presenting') settle('shown'); }, FALLBACK_MS);
      changed();
    } else if (!wanted.current && phase.current === 'shown') {
      phase.current = 'dismissing';
      transitions += 1;
      setNativeVisible(false);
      timer.current = setTimeout(() => { if (phase.current === 'dismissing') settle('idle'); }, FALLBACK_MS);
      changed();
    }
  }, [settle]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    listeners.add(reconcile);
    return () => { listeners.delete(reconcile); };
  }, [reconcile]);
  useEffect(() => { if (Platform.OS === 'ios') reconcile(); }, [visible, reconcile]);
  useEffect(() => () => {
    clearTimer();
    if (phase.current === 'presenting' || phase.current === 'dismissing') { transitions = Math.max(0, transitions - 1); changed(); }
    phase.current = 'idle';
  }, []);

  if (Platform.OS !== 'ios') return <Modal visible={visible} onShow={onShow} onDismiss={onDismiss} {...rest}>{children}</Modal>;
  return <Modal
    {...rest}
    visible={nativeVisible}
    onShow={event => {
      if (phase.current === 'presenting') settle('shown');
      // A request to close that arrived mid-presentation is carried out now.
      reconcile();
      onShow?.(event);
    }}
    onDismiss={() => {
      if (phase.current === 'dismissing') settle('idle');
      reconcile();
      onDismiss?.();
    }}
  >{children}</Modal>;
}
