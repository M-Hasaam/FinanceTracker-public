export interface GoogleUser {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export type AuthProvider = 'GOOGLE' | 'EMAIL';

export interface UserRecord {
  id: string;
  googleId: string | null;
  email: string;
  name: string | null;
  picture: string | null;
  provider: AuthProvider;
  createdAt: number;
}
