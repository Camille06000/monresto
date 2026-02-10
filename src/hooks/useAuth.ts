import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';
import { useStore } from '../store/useStore';

const PROFILE_KEY = ['profile'];

export function useAuth() {
  const queryClient = useQueryClient();
  const { profile, setProfile, setLanguage, reset } = useStore();
  const [initializing, setInitializing] = useState(true);

  const profileQuery = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: async (): Promise<Profile | null> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !profile,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
      setLanguage(profileQuery.data.language);
    }
    if (!profileQuery.isLoading) setInitializing(false);
  }, [profileQuery.data, profileQuery.isLoading, setProfile, setLanguage]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        reset();
        queryClient.clear();
      } else {
        await queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
      }
    });
    setInitializing(false);
    return () => listener.subscription.unsubscribe();
  }, [queryClient, reset]);

  const signIn = useMutation({
    mutationFn: async (params: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword(params);
      if (error) throw error;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;
      setProfile(profileData as Profile);
      setLanguage((profileData as Profile).language);
      return profileData as Profile;
    },
  });

  const signUp = useMutation({
    mutationFn: async (params: { email: string; password: string; fullName?: string }) => {
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            full_name: params.fullName,
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error('User creation failed');

      // Create profile for the new user
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: params.fullName || params.email.split('@')[0],
        role: 'admin',
        language: 'fr',
        active: true,
      });
      if (profileError) throw profileError;

      // Fetch the created profile
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (fetchError) throw fetchError;

      setProfile(profileData as Profile);
      setLanguage((profileData as Profile).language);
      return profileData as Profile;
    },
  });

  const signOut = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
      reset();
      queryClient.clear();
    },
  });

  // Renvoyer l'email de confirmation
  const resendConfirmation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
    },
  });

  // Demander un reset de mot de passe
  const requestPasswordReset = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
    },
  });

  // Mettre à jour le mot de passe
  const updatePassword = useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    },
  });

  return {
    profile: profile ?? profileQuery.data ?? null,
    loading: initializing || profileQuery.isFetching,
    signIn: signIn.mutateAsync,
    signingIn: signIn.isPending,
    signUp: signUp.mutateAsync,
    signingUp: signUp.isPending,
    signOut: signOut.mutateAsync,
    signingOut: signOut.isPending,
    resendConfirmation: resendConfirmation.mutateAsync,
    resendingConfirmation: resendConfirmation.isPending,
    requestPasswordReset: requestPasswordReset.mutateAsync,
    requestingPasswordReset: requestPasswordReset.isPending,
    updatePassword: updatePassword.mutateAsync,
    updatingPassword: updatePassword.isPending,
  };
}
