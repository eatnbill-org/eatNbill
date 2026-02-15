/**
 * Temporary Debug Page
 * Shows the actual restaurant slug from the profile
 */

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RestaurantSlugDebugPage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/restaurant/profile');
        
        if (response.error) {
          setError(response.error.message);
          return;
        }

        if (response.data) {
          setSlug(response.data.slug);
          setRestaurantName(response.data.name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const menuUrl = slug ? `/${slug}/menu` : '';
  const fullUrl = slug ? `${window.location.origin}/${slug}/menu` : '';

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p>Loading restaurant info...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Public Menu URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Restaurant Name:</p>
            <p className="text-lg font-semibold">{restaurantName}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Restaurant Slug:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                {slug}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => slug && copyToClipboard(slug)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Menu Route (relative):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                {menuUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => menuUrl && copyToClipboard(menuUrl)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Full Menu URL:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono break-all">
                {fullUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fullUrl && copyToClipboard(fullUrl)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => menuUrl && navigate(menuUrl)}
              disabled={!menuUrl}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Menu
            </Button>
            <Button
              variant="outline"
              onClick={() => fullUrl && window.open(fullUrl, '_blank')}
              disabled={!fullUrl}
            >
              Open in New Tab
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slug Format Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>• Lowercase letters and numbers only</li>
            <li>• Spaces replaced with hyphens (-)</li>
            <li>• Special characters removed</li>
            <li>• Example: "Behroz Biryani" → "behroz-biryani"</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
