import * as migration001 from './001-add-country-aliases';
import * as migration002 from './002-add-nigerian-words';
import * as migration003 from './003-add-nigerian-native-words';

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
  {
    id: '002',
    name: 'add-nigerian-words',
    up: migration002.up,
    down: migration002.down,
  },
  {
    id: '003',
    name: 'add-nigerian-native-words',
    up: migration003.up,
    down: migration003.down,
  },
];
