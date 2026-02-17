import { usePostLogin } from '@/hooks/use-post-login';
import { AuthLayoutSkeleton } from '@/components/ui/skeleton';

export default function PostLoginPage() {
  const { loading } = usePostLogin();

  if (loading) {
    return <AuthLayoutSkeleton />;
  }

  // The hook handles navigation, so this should never be visible
  return null;
}
