
export type Role = 'admin' | 'super' | 'view';

export interface User {
  name: string;
  role: Role;
}

export interface Specification {
  id: number;
  num: string;
  name: string;
}

export interface Item {
  id: number;
  name: string;
  brd: string;
  w: number;
  specId?: number; // Optional link to specification
}

export interface ShiftData {
  [itemId: number]: number[];
}

export interface ArchivedShift {
  id: number;
  date: string;
  ts: number;
  user: string;
  data: ShiftData;
  total: number;
  count: number;
}

export interface AppSettings {
  comp: string;
  brds: string[];
  sigs: string;
  specs: Specification[]; // Store managed specifications
}

export type TabId = 'dash' | 'prod' | 'items' | 'arch' | 'sets';
