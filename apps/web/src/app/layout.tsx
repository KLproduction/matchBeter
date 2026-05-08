import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Matched Betting",
  description: "Workflow-first matched betting tracker with offer steps, bets, and lay matching.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
