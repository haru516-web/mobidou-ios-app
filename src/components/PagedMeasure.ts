import { createContext } from 'react';

/** True inside PagedBody's invisible measuring copy, where nothing may report positions. */
export const PagedMeasureContext = createContext(false);
