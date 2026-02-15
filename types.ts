
export type Role = 'admin' | 'supervisor' | 'operator' | 'view';
export type ShiftType = 'morning' | 'evening' | 'night';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
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
  specId?: number; 
}

export interface ItemProduction {
  hours: number[];
  specNote: string;
}

export interface ShiftData {
  [itemId: number]: ItemProduction;
}

export interface ArchivedShift {
  id: number;
  date: string;
  ts: number;
  createdBy: string;
  supervisor: string;
  shiftType: ShiftType;
  data: ShiftData;
  total: number;
  count: number;
}

export interface AppSettings {
  comp: string;
  brds: string[];
  sigs: string;
  users: User[];
}

export type TabId = 'dash' | 'prod' | 'items' | 'arch' | 'sets';
