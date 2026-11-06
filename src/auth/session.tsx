import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { api, type SessionUser } from '../data';
import type { Profile } from '../data/types';
import { unregisterDevice } from '../lib/push';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface SessionValue {
  status: Status;
  user: SessionUser | null;
  profile: Profile | undefined;
  onboarded: boolean;
  auth: Pick<typeof api, 'signIn' | 'signUp' | 'confirmSignUp' | 'resendSignUpCode' | 'requestPasswordReset' | 'resetPassword' | 'requestCode' | 'verifyCode'>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    let alive = true;
    api.getSessionUser().then((u) => alive && setUser(u)).catch(() => alive && setUser(null));
    const off = api.onAuthChange((u) => {
      setUser((prev) => {
        // Troca de usuário: limpa os dados em cache do anterior.
        if (prev?.id !== u?.id) queryClient.clear();
        return u;
      });
    });
    return () => {
      alive = false;
      off();
    };
  }, [queryClient]);

  const profile = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => api.getProfile(),
    enabled: Boolean(user),
  });

  const value = useMemo<SessionValue>(() => {
    const status: Status =
      user === undefined || (user && profile.isPending && !profile.isError) ? 'loading' : user ? 'signedIn' : 'signedOut';
    return {
      status,
      user: user ?? null,
      profile: profile.data,
      onboarded: Boolean(profile.data?.onboardedAt),
      auth: api,
      signOut: async () => {
        // Este celular deixa de receber os avisos da conta que saiu.
        await unregisterDevice();
        await api.signOut();
      },
    };
  }, [user, profile.data, profile.isPending, profile.isError]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession fora do SessionProvider');
  return ctx;
}
