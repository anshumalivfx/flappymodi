import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Flappy Modi - Flappy Bird Game',
  description: 'Play Flappy Bird with Modi!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

