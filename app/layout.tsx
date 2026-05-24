import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Runlab AI Clinic',
  description: 'วิเคราะห์ฟอร์มวิ่ง',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="th">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}