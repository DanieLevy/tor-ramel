'use client'

import { Mail, Smartphone, Bell, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type NotificationMethod = 'email' | 'push' | 'both'

interface NotificationMethodSelectorProps {
  value: NotificationMethod
  onChange: (method: NotificationMethod) => void
  disabled?: boolean
  pushAvailable?: boolean
  status?: 'idle' | 'saving' | 'saved' | 'error'
}

const methodOptions: {
  value: NotificationMethod
  icon: typeof Mail
  label: string
  description: string
  details: string
}[] = [
  {
    value: 'email',
    icon: Mail,
    label: 'מייל בלבד',
    description: 'קבל התראות בדוא"ל',
    details: 'התראות יישלחו לכתובת המייל שלך. מתאים למי שמעדיף לבדוק מייל או לא יכול להתקין PWA.'
  },
  {
    value: 'push',
    icon: Smartphone,
    label: 'Push בלבד',
    description: 'התראות למכשיר',
    details: 'התראות יופיעו ישירות על המכשיר שלך - גם כשהאפליקציה סגורה. מהיר ונוח!'
  },
  {
    value: 'both',
    icon: Bell,
    label: 'שניהם',
    description: 'מייל + Push',
    details: 'קבל התראות גם במייל וגם במכשיר. הכי מקיף - לא תפספס שום תור!'
  }
]

export function NotificationMethodSelector({
  value,
  onChange,
  disabled = false,
  pushAvailable = true,
  status = 'idle'
}: NotificationMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          אופן קבלת התראות
          {status === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {status === 'saved' && <CheckCircle className="h-3 w-3 text-green-500" />}
          {status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
        </h3>
        <p className="text-xs text-muted-foreground">בחר איך תרצה לקבל עדכונים על תורים פנויים</p>
      </div>
      
      <div className="grid gap-3">
        {methodOptions.map((option) => {
          const isSelected = value === option.value
          const Icon = option.icon
          const isPushOption = option.value === 'push' || option.value === 'both'
          const isAvailable = !isPushOption || pushAvailable
          
          return (
            <button
              key={option.value}
              onClick={() => isAvailable && onChange(option.value)}
              disabled={disabled || !isAvailable}
              className={cn(
                "relative p-4 rounded-xl transition-all text-right border",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black dark:focus-visible:ring-white",
                isSelected 
                  ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-lg" 
                  : "bg-black/5 dark:bg-white/5 border-transparent hover:bg-black/10 dark:hover:bg-white/10",
                (!isAvailable || disabled) && "opacity-40 cursor-not-allowed"
              )}
              aria-pressed={isSelected}
              aria-label={`${option.label}: ${option.description}`}
            >
              {isSelected && (
                <div className="absolute top-3 left-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 text-white" />
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                  isSelected 
                    ? "bg-white/20 dark:bg-black/20" 
                    : "bg-black/10 dark:bg-white/10"
                )}>
                  <Icon className={cn(
                    "h-5 w-5",
                    isSelected ? "text-white dark:text-black" : "text-foreground"
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-semibold text-base mb-0.5",
                    isSelected ? "text-white dark:text-black" : "text-foreground"
                  )}>
                    {option.label}
                  </div>
                  <div className={cn(
                    "text-sm",
                    isSelected ? "text-white/80 dark:text-black/80" : "text-muted-foreground"
                  )}>
                    {option.description}
                  </div>
                  {isSelected && (
                    <div className={cn(
                      "text-xs mt-2 pt-2 border-t",
                      isSelected ? "text-white/70 dark:text-black/70 border-white/20 dark:border-black/20" : ""
                    )}>
                      {option.details}
                    </div>
                  )}
                </div>
              </div>
              
              {!isAvailable && (
                <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                  דורש התקנת האפליקציה והפעלת Push
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}



