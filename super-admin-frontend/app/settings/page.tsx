'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { notify } from '@/lib/toast';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Server,
  Database,
  Globe,
  Lock,
  Bell,
  Mail,
  Smartphone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SettingsPage() {
  const { admin, refreshAdmin } = useAuth();

  // ── Enable 2FA flow ──────────────────────────────────────
  const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'verify'>('idle');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  // ── Disable 2FA flow ─────────────────────────────────────
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');

  const handleComingSoon = (feature: string) => {
    notify.info(`${feature} coming soon`, {
      description: 'This feature will be available in a future update.',
    });
  };

  const handleSetup2fa = async () => {
    setSetupLoading(true);
    setSetupError('');
    try {
      const result = await apiClient.setup2fa();
      setQrCodeDataUrl(result.qrCodeDataUrl);
      setSecret(result.secret);
      setSetupStep('qr');
    } catch (err: any) {
      setSetupError(err.response?.data?.error?.message || 'Failed to initiate 2FA setup');
      notify.error('Setup failed', { description: 'Could not initiate 2FA setup. Please try again.' });
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupLoading(true);
    setSetupError('');
    try {
      await apiClient.enable2fa(setupCode);
      await refreshAdmin();
      setSetupStep('idle');
      setSetupCode('');
      setQrCodeDataUrl(null);
      setSecret(null);
      notify.success('Two-factor authentication enabled', {
        description: 'Your account is now protected with 2FA.',
      });
    } catch (err: any) {
      setSetupError(err.response?.data?.error?.message || 'Invalid code. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleCancelSetup = () => {
    setSetupStep('idle');
    setSetupCode('');
    setQrCodeDataUrl(null);
    setSecret(null);
    setSetupError('');
  };

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      notify.success('Secret copied to clipboard');
    }
  };

  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisableLoading(true);
    setDisableError('');
    try {
      await apiClient.disable2fa(disablePassword, disableCode);
      await refreshAdmin();
      setDisableOpen(false);
      setDisablePassword('');
      setDisableCode('');
      notify.success('Two-factor authentication disabled', {
        description: 'Your account no longer requires 2FA on login.',
      });
    } catch (err: any) {
      setDisableError(err.response?.data?.error?.message || 'Invalid credentials. Please try again.');
    } finally {
      setDisableLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 sm:space-y-6"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Manage your super admin preferences
        </p>
      </motion.div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* ── Security Card ── */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl">Security</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Manage your account security settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* ── Two-Factor Authentication (functional) ── */}
              <div className="py-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Lock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base">Two-factor authentication</p>
                      <p className="text-xs text-muted-foreground">
                        {admin?.totp_enabled
                          ? 'Active — your account is protected'
                          : 'Add an extra layer of security'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {admin?.totp_enabled ? (
                      <>
                        <Badge className="bg-green-500 hover:bg-green-600 text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Enabled
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/40 hover:bg-destructive/10 text-xs"
                          onClick={() => { setDisableOpen(true); setDisableError(''); }}
                        >
                          Disable
                        </Button>
                      </>
                    ) : setupStep === 'idle' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={handleSetup2fa}
                        disabled={setupLoading}
                      >
                        {setupLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        Set up
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                        In progress
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Step: QR code */}
                {setupStep === 'qr' && qrCodeDataUrl && (
                  <div className="mt-4 space-y-4 rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm font-medium">Scan with your authenticator app</p>
                    {setupError && (
                      <Alert variant="destructive" className="py-2 text-xs">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <AlertDescription>{setupError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrCodeDataUrl}
                        alt="2FA QR code"
                        className="w-44 h-44 rounded-lg border bg-white p-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Can't scan? Enter this key manually in your app:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all select-all">
                        {secret}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 h-8 w-8"
                        onClick={handleCopySecret}
                        title="Copy secret"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => { setSetupStep('verify'); setSetupError(''); }}
                    >
                      I've scanned it — Next
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={handleCancelSetup}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Step: Verify code */}
                {setupStep === 'verify' && (
                  <form onSubmit={handleVerify2fa} className="mt-4 space-y-4 rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm font-medium">Enter the 6-digit code from your app</p>
                    {setupError && (
                      <Alert variant="destructive" className="py-2 text-xs">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <AlertDescription>{setupError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="setup-code" className="text-xs">Verification Code</Label>
                      <Input
                        id="setup-code"
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        value={setupCode}
                        onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        required
                        className="h-10 text-center text-xl font-mono tracking-[0.5em]"
                        autoFocus
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full"
                      disabled={setupLoading || setupCode.length !== 6}
                    >
                      {setupLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                      Confirm &amp; Enable
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => setSetupStep('qr')}
                    >
                      Back
                    </Button>
                  </form>
                )}
              </div>

              {/* IP Allowlist — coming soon */}
              <div
                className="flex items-center justify-between py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                onClick={() => handleComingSoon('IP Allowlist')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">IP Allowlist</p>
                    <p className="text-xs text-muted-foreground truncate">Restrict access by IP address</p>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">Coming soon</Badge>
              </div>

              {/* Active Sessions — coming soon */}
              <div
                className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                onClick={() => handleComingSoon('Active Sessions')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Smartphone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">Active Sessions</p>
                    <p className="text-xs text-muted-foreground truncate">Manage your active sessions</p>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">Coming soon</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── System Status Card ── */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Server className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl">System</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    View system information and status
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: Database, title: 'Database Status', desc: 'PostgreSQL connection', status: 'Healthy' },
                { icon: Server, title: 'API Status', desc: 'Backend service health', status: 'Operational' },
                { icon: Bell, title: 'Notifications', desc: 'Push notification service', status: 'Active' },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500 hover:bg-green-600 shrink-0 text-xs">{item.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Notifications Card ── */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl">Notifications</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure your notification preferences
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                onClick={() => handleComingSoon('Email notifications')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">Email Notifications</p>
                    <p className="text-xs text-muted-foreground truncate">Receive updates via email</p>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">Coming soon</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Billing Card ── */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl">Billing</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Manage billing and subscription settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                onClick={() => handleComingSoon('Billing settings')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">Subscription</p>
                    <p className="text-xs text-muted-foreground truncate">Manage your plan</p>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">Coming soon</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Disable 2FA Dialog ── */}
      <Dialog
        open={disableOpen}
        onOpenChange={(open) => {
          setDisableOpen(open);
          if (!open) { setDisablePassword(''); setDisableCode(''); setDisableError(''); }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password and current authenticator code to confirm.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDisable2fa} className="space-y-4">
            {disableError && (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                <AlertDescription>{disableError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="disable-password" className="text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="disable-password"
                  type={showDisablePassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  required
                  className="h-10 pr-10"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10 text-muted-foreground"
                  onClick={() => setShowDisablePassword(!showDisablePassword)}
                >
                  {showDisablePassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disable-code" className="text-sm">Authenticator Code</Label>
              <Input
                id="disable-code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                className="h-10 text-center text-lg font-mono tracking-[0.4em]"
                autoComplete="one-time-code"
              />
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisableOpen(false)}
                disabled={disableLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={disableLoading || !disablePassword || disableCode.length !== 6}
              >
                {disableLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Disable 2FA
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
