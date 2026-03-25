export interface RequestUser {
  id: string;
  email: string;
  provider: 'GOOGLE' | 'EMAIL';
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  provider: 'GOOGLE' | 'EMAIL';
  iat?: number;
  exp?: number;
}
