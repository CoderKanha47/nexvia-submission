import { useAppSelector } from '../../app/hooks';
import type { RootState } from '../../app/store';

export function useAuth() {
  return useAppSelector((state: RootState) => state.auth);
}