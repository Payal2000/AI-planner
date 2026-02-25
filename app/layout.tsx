import type { Metadata } from 'next'
import { Playfair_Display, Cormorant_Garamond, DM_Sans } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Glow-Up Life Planner 2026',
  description: 'Your research-backed daily planner for an intentional 2026 glow-up.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${cormorant.variable} ${dmSans.variable} font-dm bg-warm-white text-ink-dark overflow-hidden`}
      >
        {children}
      </body>
    </html>
  )
}
