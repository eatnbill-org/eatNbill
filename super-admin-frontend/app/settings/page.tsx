'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';

export default function SettingsPage() {
  const handleComingSoon = (feature: string) => {
    notify.info(`${feature} coming soon`, {
      description: 'This feature will be available in a future update.',
    });
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
              {[
                { icon: Lock, title: 'Two-factor authentication', desc: 'Add an extra layer of security' },
                { icon: Globe, title: 'IP Allowlist', desc: 'Restrict access by IP address' },
                { icon: Smartphone, title: 'Active Sessions', desc: 'Manage your active sessions' },
              ].map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                  onClick={() => handleComingSoon(item.title)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">Coming soon</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

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
    </motion.div>
  );
}
