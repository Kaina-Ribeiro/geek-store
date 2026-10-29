import * as migration_20261029_123522_inicial from './20261029_123522_inicial';

export const migrations = [
  {
    up: migration_20261029_123522_inicial.up,
    down: migration_20261029_123522_inicial.down,
    name: '20261029_123522_inicial'
  },
];
