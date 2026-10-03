import { useEffect, useRef } from 'react';
import { initAudio, playSfx, useSceneBgm } from './audio';

type Cues = {
  /** firstRunStage; the tutorial owns the opening BGM from route to floatingDrag and during presentBox. */
  firstRunStage: string | null;
  openingVisible: boolean;
  mobbyMenuOpen: boolean;
  homeEditing: boolean;
  milestoneToast: string | null;
  error: string | null;
  weeklyOpen: boolean;
  pet: string;
};

const TUTORIAL_BGM_STAGES = ['route', 'homeCompanion', 'floatingMenu', 'floatingDrag', 'presentBox'];

/** Plays a cue when `value` changes after the first render. */
function useChangeCue<T>(value: T, onChange: (next: T, prev: T) => void) {
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    const before = prev.current;
    prev.current = value;
    onChange(value, before);
  }); // eslint-disable-line react-hooks/exhaustive-deps
}

/** App-level audio: tutorial BGM and the sound cues for state App owns. Scenes with their own BGM (gacha, award, omikuji, opening) keep it themselves. */
export function useAppAudioCues(c: Cues) {
  useEffect(() => { void initAudio(); }, []);
  useSceneBgm('bgm_opening', c.firstRunStage !== null && TUTORIAL_BGM_STAGES.includes(c.firstRunStage) && !c.openingVisible, 50);
  useChangeCue(c.firstRunStage, next => { if (next !== null) playSfx('sfx_tutorial_next'); });
  useChangeCue(c.mobbyMenuOpen, next => playSfx(next ? 'sfx_menu_open' : 'sfx_menu_close'));
  useChangeCue(c.homeEditing, next => { if (next) playSfx('sfx_home_card_edit'); });
  useChangeCue(c.milestoneToast?.split('\n')[0] ?? null, next => { if (next) playSfx('sfx_arrive_point'); });
  useChangeCue(c.error, next => { if (next) playSfx('sfx_error'); });
  useChangeCue(c.weeklyOpen, next => { if (next) playSfx('sfx_open'); });
  useChangeCue(c.pet, () => playSfx('sfx_pet_select'));
}
