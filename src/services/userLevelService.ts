import { backendApi } from './backendApi';

export interface UserLevel {
  level: number;
  exp: number;
  next_level_exp: number;
}

export const userLevelService = {
  async watchEpisode(userId: string): Promise<UserLevel> {
    // Вынесите логику в backendApi и вызывайте отсюда
    throw new Error('watchEpisode реализуйте через backendApi.ts');
  },

  async getUserLevel(): Promise<UserLevel | null> {
    // Вынесите логику в backendApi и вызывайте отсюда
    throw new Error('getUserLevel реализуйте через backendApi.ts');
  },
};
