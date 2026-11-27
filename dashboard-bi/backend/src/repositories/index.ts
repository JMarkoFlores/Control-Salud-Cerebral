import { DashboardRepository } from '../types';
import { env } from '../config/env';
import { MockRepository } from './mock';
import { SqlServerRepository } from './sqlserver';

export function createRepository(): DashboardRepository {
  return env.DATA_SOURCE === 'sqlserver'
    ? new SqlServerRepository()
    : new MockRepository();
}
