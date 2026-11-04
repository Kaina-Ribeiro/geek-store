import * as migration_20261029_123522_inicial from './20261029_123522_inicial';
import * as migration_20261104_073846_rate_limits from './20261104_073846_rate_limits';
import * as migration_20261104_081413_home_hero from './20261104_081413_home_hero';

export const migrations = [
  {
    up: migration_20261029_123522_inicial.up,
    down: migration_20261029_123522_inicial.down,
    name: '20261029_123522_inicial',
  },
  {
    up: migration_20261104_073846_rate_limits.up,
    down: migration_20261104_073846_rate_limits.down,
    name: '20261104_073846_rate_limits',
  },
  {
    up: migration_20261104_081413_home_hero.up,
    down: migration_20261104_081413_home_hero.down,
    name: '20261104_081413_home_hero'
  },
];
