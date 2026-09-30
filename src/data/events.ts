export type PilgrimageEvent = {
  id: string;
  name: string;
  status: 'locked' | 'open' | 'ended';
  startsAt?: string;
  endsAt?: string;
};

/** Unannounced event paths. Do not add dates or route details until decided. */
export const EVENTS: PilgrimageEvent[] = [
  {
    id: 'unopened-path',
    name: 'まだ開かれていない道',
    status: 'locked',
  },
];
