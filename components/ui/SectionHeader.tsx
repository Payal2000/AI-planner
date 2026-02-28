import FadeInView from './FadeInView'

interface SectionHeaderProps {
  icon?: string
  iconSrc?: string
  label: string
  title: string
  subtitle?: string
}

export default function SectionHeader({ icon, iconSrc, label, title, subtitle }: SectionHeaderProps) {
  return (
    <FadeInView className="text-center mb-12">
      <div className="flex justify-center mb-3">
        {iconSrc ? (
          <img src={iconSrc} alt="" className="w-14 h-14 object-contain drop-shadow-sm" />
        ) : (
          <span className="text-3xl block">{icon}</span>
        )}
      </div>
      <p className="text-[11px] font-semibold tracking-[4px] uppercase text-petal mb-2.5">
        {label}
      </p>
      <h2 className="font-playfair text-[clamp(28px,4vw,42px)] font-semibold text-ink-dark mb-3">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[15px] text-ink-soft max-w-[500px] mx-auto">{subtitle}</p>
      )}
    </FadeInView>
  )
}
