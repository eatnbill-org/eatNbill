import { usePostLogin } from '@/hooks/use-post-login';
import { Loader2 } from 'lucide-react';

export default function PostLoginPage() {
  const { loading } = usePostLogin();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // The hook handles navigation, so this should never be visible
  return null;
}
