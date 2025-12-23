import * as migration001 from './001-add-country-aliases';

export interface Migration {
  id: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export const migrations: Migration[] = [
  {
    id: '001',
    name: 'add-country-aliases',
    up: migration001.up,
    down: migration001.down,
  },
];
