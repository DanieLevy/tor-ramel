'use client'

import { Flame, Calendar, Clock, Eye, Bell, Info } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface NotificationTypesProps {
  values: {
    hot_alerts_enabled: boolean
    weekly_digest_enabled: boolean
    expiry_reminders_enabled: boolean
    inactivity_alerts_enabled: boolean
    proactive_notifications_enabled: boolean
  }
  onChange: (key: string, value: boolean) => void
  disabled?: boolean
}

const notificationTypes = [
  {
    key: 'hot_alerts_enabled',
    icon: Flame,
    label: 'התראות חמות',
    description: 'תורים ב-1-3 ימים הקרובים',
    details: 'קבל התראה כשיש תור פנוי בימים הקרובים מאוד - הזדמנות שלא כדאי לפספס!',
    color: 'text-red-500'
  },
  {
    key: 'weekly_digest_enabled',
    icon: Calendar,
    label: 'סיכום שבועי',
    description: 'סיכום התורים הזמינים בשבוע',
    details: 'כל יום ראשון תקבל סיכום של כל התורים הזמינים בשבוע הקרוב.',
    color: 'text-blue-500'
  },
  {
    key: 'expiry_reminders_enabled',
    icon: Clock,
    label: 'תזכורת לפני סיום התראה',
    description: 'כשההתראה שלך עומדת להסתיים',
    details: 'נזכיר לך יום לפני שההתראה על תאריכים מסוימים תסתיים.',
    color: 'text-orange-500'
  },
  {
    key: 'proactive_notifications_enabled',
    icon: Eye,
    label: 'הזדמנויות',
    description: 'תורים פנויים גם בלי התראה פעילה',
    details: 'גם אם אין לך התראה פעילה, נעדכן אותך כשיש הרבה תורים פנויים.',
    color: 'text-green-500'
  },
  {
    key: 'inactivity_alerts_enabled',
    icon: Bell,
    label: 'תזכורת חזרה',
    description: 'אם לא נכנסת זמן רב',
    details: 'נזכיר לך לבדוק אם יש תורים אם לא נכנסת לאפליקציה תקופה ארוכה.',
    color: 'text-purple-500'
  }
]

export function NotificationTypesTogles({
  values,
  onChange,
  disabled = false
}: NotificationTypesProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">סוגי התראות</h3>
        <p className="text-xs text-muted-foreground">בחר אילו סוגי התראות תרצה לקבל</p>
      </div>
      
      <div className="space-y-2">
        {notificationTypes.map((type) => {
          const Icon = type.icon
          const isEnabled = values[type.key as keyof typeof values]
          
          return (
            <div
              key={type.key}
              className={cn(
                "p-4 rounded-xl border transition-all",
                isEnabled 
                  ? "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10" 
                  : "bg-transparent border-transparent"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                  isEnabled ? "bg-black/10 dark:bg-white/10" : "bg-black/5 dark:bg-white/5"
                )}>
                  <Icon className={cn("h-5 w-5", type.color)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm text-foreground">
                        {type.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {type.description}
                      </div>
                    </div>
                    
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => onChange(type.key, checked)}
                      disabled={disabled}
                      aria-label={type.label}
                    />
                  </div>
                  
                  {isEnabled && (
                    <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{type.details}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}



