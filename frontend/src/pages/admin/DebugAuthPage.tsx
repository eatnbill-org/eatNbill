import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function DebugAuthPage() {
  const { user } = useAuth();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [localStorageData, setLocalStorageData] = useState<any>({});

  useEffect(() => {
    // Get restaurant ID from API client
    const id = apiClient.getRestaurantId();
    setRestaurantId(id);

    // Get all relevant localStorage data
    setLocalStorageData({
      accessToken: localStorage.getItem('accessToken') ? '✓ Set' : '✗ Missing',
      refreshToken: localStorage.getItem('refreshToken') ? '✓ Set' : '✗ Missing',
      restaurantId: localStorage.getItem('restaurantId') || '✗ Not set',
    });
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Authentication Debug Page</h1>
        <p className="text-muted-foreground mt-1">
          Check if restaurant ID and auth tokens are properly set
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Authenticated</span>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>ID:</strong> {user.id}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Role:</strong> <Badge>{user.role}</Badge></p>
                  <p><strong>Tenant ID:</strong> {user.tenant_id}</p>
                  <p><strong>Allowed Restaurants:</strong></p>
                  {user.allowed_restaurant_ids && user.allowed_restaurant_ids.length > 0 ? (
                    <ul className="list-disc list-inside ml-4">
                      {user.allowed_restaurant_ids.map((id) => (
                        <li key={id} className="text-xs font-mono">{id}</li>
                      ))}
                    </ul>
                  ) : (
                    <Badge variant="destructive">No restaurants</Badge>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>Not authenticated</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Client State */}
        <Card>
          <CardHeader>
            <CardTitle>API Client State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Restaurant ID:</span>
                {restaurantId ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <code className="text-xs">{restaurantId}</code>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-xs">Not set</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LocalStorage State */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>LocalStorage State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Access Token</div>
                <div className="text-sm text-muted-foreground">
                  {localStorageData.accessToken}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Refresh Token</div>
                <div className="text-sm text-muted-foreground">
                  {localStorageData.refreshToken}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Restaurant ID</div>
                <div className="text-sm text-muted-foreground">
                  {localStorageData.restaurantId}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Summary */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {user && restaurantId ? (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Everything looks good!</p>
                  <p className="text-sm text-green-700">
                    User is authenticated and restaurant ID is set. All API requests should work.
                  </p>
                </div>
              </div>
            ) : !user ? (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Not authenticated</p>
                  <p className="text-sm text-red-700">
                    Please log in to continue.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Restaurant ID missing</p>
                  <p className="text-sm text-yellow-700">
                    User is authenticated but restaurant ID is not set. You may get 403 errors.
                    {user.allowed_restaurant_ids && user.allowed_restaurant_ids.length > 0 ? (
                      <span className="block mt-1">Try logging out and logging back in.</span>
                    ) : (
                      <span className="block mt-1">Please complete restaurant setup.</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Console Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Console</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Open browser console (F12) and check for these messages:
          </p>
          <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
            <li>[API Client] Initialized with restaurant ID: ...</li>
            <li>[Auth] Setting restaurant ID on login: ...</li>
            <li>[API Client] Setting restaurant ID: ...</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
