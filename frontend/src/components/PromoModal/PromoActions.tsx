import { Compass, UserPlus } from 'lucide-react'
import Button from '../ui/Button'

interface PromoActionsProps {
  primaryLabel: string
  secondaryLabel: string
  onPrimary: () => void
  onSecondary: () => void
}

export default function PromoActions({ primaryLabel, secondaryLabel, onPrimary, onSecondary }: PromoActionsProps) {
  return (
    <div className="mt-[30px] flex flex-nowrap items-center gap-3.5 max-lg:mt-6 max-lg:flex-wrap max-lg:justify-center">
      {[
        { label: primaryLabel, variant: 'primary' as const, icon: Compass, onClick: onPrimary },
        { label: secondaryLabel, variant: 'secondary' as const, icon: UserPlus, onClick: onSecondary },
      ].map((b) => (
        <div key={b.label} className="w-[194px] max-sm:min-w-[140px] max-sm:flex-1">
          <Button variant={b.variant} icon={b.icon} onClick={b.onClick} aria-label={b.label}>
            {b.label}
          </Button>
        </div>
      ))}
    </div>
  )
}
