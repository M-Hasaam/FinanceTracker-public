import { AuthPage } from '@/features/auth/components/AuthPage';

interface PageProps {
  searchParams?: Promise<{
    tab?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const initialTab =
    resolvedSearchParams?.tab === 'signup' ? 'signup' : 'login';

  return <AuthPage key={initialTab} initialTab={initialTab} />;
}
