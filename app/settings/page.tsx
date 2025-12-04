"use client"

import { useEffect, useState } from 'react'
import { useHeader } from '@/components/header-context'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  Flame, 
  Calendar, 
  UserX, 
  Clock, 
  Moon, 
  Sun,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, pwaFetch } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useHaptics } from '@/hooks/use-haptics'
import Link from 'next/link'

interface UserPreferences {
  proactive_notifications_enabled: boolean
  hot_alerts_enabled: boolean
  weekly_digest_enabled: boolean
  inactivity_alerts_enabled: boolean
  expiry_reminders_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  preferred_times: Array<{ start: string; end: string }>
  notification_cooldown_hours: number
}

interface TimeRange {
  id: string
  label: string
  start: string
  end: string
}

const DEFAULT_TIME_RANGES: TimeRange[] = [
  { id: 'morning', label: 'בוקר', start: '08:00', end: '12:00' },
  { id: 'afternoon', label: 'צהריים', start: '12:00', end: '16:00' },
  { id: 'evening', label: 'ערב', start: '16:00', end: '20:00' },
]

export default function SettingsPage() {
  const updateHeader = useHeader()
  const { user, isLoading: authLoading } = useAuth()
  const haptics = useHaptics()
  
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    updateHeader({
      title: 'הגדרות',
      showBackButton: true
    })
  }, [updateHeader])

  useEffect(() => {
    if (user) {
      fetchPreferences()
    }
  }, [user])

  const fetchPreferences = async () => {
    try {
      setLoading(true)
      const response = await pwaFetch('/api/user/preferences')
      
      if (response.ok) {
        const data = await response.json()
        setPreferences(data)
      } else {
        toast.error('שגיאה בטעינת ההגדרות')
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
      toast.error('שגיאה בטעינת ההגדרות')
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!preferences) return
    
    haptics.medium()
    setSaving(true)
    
    try {
      const response = await pwaFetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      })
      
      if (response.ok) {
        haptics.success()
        toast.success('ההגדרות נשמרו בהצלחה')
        setHasChanges(false)
      } else {
        haptics.error()
        toast.error('שגיאה בשמירת ההגדרות')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      haptics.error()
      toast.error('שגיאה בשמירת ההגדרות')
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    haptics.light()
    setPreferences(prev => prev ? { ...prev, [key]: value } : null)
    setHasChanges(true)
  }

  const toggleTimeRange = (range: TimeRange) => {
    if (!preferences) return
    
    haptics.light()
    const currentTimes = preferences.preferred_times || []
    const exists = currentTimes.some(
      t => t.start === range.start && t.end === range.end
    )
    
    let newTimes: Array<{ start: string; end: string }>
    if (exists) {
      newTimes = currentTimes.filter(
        t => !(t.start === range.start && t.end === range.end)
      )
    } else {
      newTimes = [...currentTimes, { start: range.start, end: range.end }]
    }
    
    setPreferences(prev => prev ? { ...prev, preferred_times: newTimes } : null)
    setHasChanges(true)
  }

  const isTimeRangeSelected = (range: TimeRange) => {
    if (!preferences?.preferred_times) return false
    return preferences.preferred_times.some(
      t => t.start === range.start && t.end === range.end
    )
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-6 pb-24 max-w-2xl space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6 pb-24 max-w-2xl">
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">יש להתחבר כדי לגשת להגדרות</p>
            <Button asChild>
              <Link href="/login">התחבר</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24 max-w-2xl space-y-4">
      {/* Smart Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card variant="glass">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">התראות חכמות</CardTitle>
                <CardDescription>קבל התראות אוטומטיות על הזדמנויות</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Proactive Notifications */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-violet-500" />
                <div>
                  <Label className="font-medium">גילוי הזדמנויות</Label>
                  <p className="text-xs text-muted-foreground">התראה כשיש תור פנוי גם בלי מנוי פעיל</p>
                </div>
              </div>
              <Switch
                checked={preferences?.proactive_notifications_enabled ?? true}
                onCheckedChange={(checked) => updatePreference('proactive_notifications_enabled', checked)}
              />
            </div>

            {/* Hot Alerts */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <Flame className="h-5 w-5 text-orange-500" />
                <div>
                  <Label className="font-medium">התראות דחופות</Label>
                  <p className="text-xs text-muted-foreground">התראה על תורים ב-1-3 הימים הקרובים</p>
                </div>
              </div>
              <Switch
                checked={preferences?.hot_alerts_enabled ?? true}
                onCheckedChange={(checked) => updatePreference('hot_alerts_enabled', checked)}
              />
            </div>

            {/* Weekly Digest */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <Label className="font-medium">סיכום שבועי</Label>
                  <p className="text-xs text-muted-foreground">קבל סיכום כל יום ראשון בבוקר</p>
                </div>
              </div>
              <Switch
                checked={preferences?.weekly_digest_enabled ?? true}
                onCheckedChange={(checked) => updatePreference('weekly_digest_enabled', checked)}
              />
            </div>

            {/* Expiry Reminders */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-500" />
                <div>
                  <Label className="font-medium">תזכורת פקיעה</Label>
                  <p className="text-xs text-muted-foreground">התראה כשמנוי עומד לפוג</p>
                </div>
              </div>
              <Switch
                checked={preferences?.expiry_reminders_enabled ?? true}
                onCheckedChange={(checked) => updatePreference('expiry_reminders_enabled', checked)}
              />
            </div>

            {/* Inactivity Alerts */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <UserX className="h-5 w-5 text-rose-500" />
                <div>
                  <Label className="font-medium">תזכורת חזרה</Label>
                  <p className="text-xs text-muted-foreground">התראה אם לא פתחת את האפליקציה זמן רב</p>
                </div>
              </div>
              <Switch
                checked={preferences?.inactivity_alerts_enabled ?? true}
                onCheckedChange={(checked) => updatePreference('inactivity_alerts_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quiet Hours Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="glass">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg">
                <Moon className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">שעות שקט</CardTitle>
                <CardDescription>לא נשלח התראות בזמנים אלו</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-3 rounded-xl bg-white/50 dark:bg-white/5">
              <div className="flex items-center gap-2 flex-1">
                <Moon className="h-4 w-4 text-indigo-400" />
                <input
                  type="time"
                  value={preferences?.quiet_hours_start ?? '22:00'}
                  onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
                  className="flex-1 bg-transparent border rounded-lg px-2 py-1 text-sm"
                  dir="ltr"
                />
              </div>
              <span className="text-muted-foreground">עד</span>
              <div className="flex items-center gap-2 flex-1">
                <Sun className="h-4 w-4 text-amber-400" />
                <input
                  type="time"
                  value={preferences?.quiet_hours_end ?? '07:00'}
                  onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
                  className="flex-1 bg-transparent border rounded-lg px-2 py-1 text-sm"
                  dir="ltr"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Preferred Times Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card variant="glass">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">שעות מועדפות</CardTitle>
                <CardDescription>קבל התראות רק על שעות אלו</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {DEFAULT_TIME_RANGES.map((range) => (
                <button
                  key={range.id}
                  onClick={() => toggleTimeRange(range)}
                  className={cn(
                    "p-3 rounded-xl border-2 transition-all touch-manipulation",
                    "flex flex-col items-center gap-1",
                    isTimeRangeSelected(range)
                      ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                      : "bg-white/50 dark:bg-white/5 border-transparent hover:border-emerald-300"
                  )}
                >
                  <span className="font-medium text-sm">{range.label}</span>
                  <span className="text-[10px] text-muted-foreground" dir="ltr">
                    {range.start}-{range.end}
                  </span>
                  {isTimeRangeSelected(range) && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {preferences?.preferred_times?.length === 0 
                ? 'לא נבחרו שעות - תקבל התראות על כל השעות'
                : `נבחרו ${preferences?.preferred_times?.length} טווחי זמן`}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Cooldown Setting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card variant="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">תדירות התראות</CardTitle>
            <CardDescription>מינימום שעות בין התראות חכמות</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="24"
                value={preferences?.notification_cooldown_hours ?? 4}
                onChange={(e) => updatePreference('notification_cooldown_hours', parseInt(e.target.value))}
                className="flex-1"
              />
              <Badge variant="secondary" className="min-w-[60px] justify-center">
                {preferences?.notification_cooldown_hours ?? 4} שעות
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Button */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-4 right-4 max-w-2xl mx-auto"
        >
          <Button
            onClick={savePreferences}
            disabled={saving}
            className="w-full h-12 rounded-xl shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 ml-2" />
                שמור שינויים
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  )
}

