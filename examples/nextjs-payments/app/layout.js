import Link from 'next/link'

export const metadata = {
  title: 'Next.js',
  description: 'Generated by Next.js',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">Home</Link>
          <br />
          <Link href="/login">login</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
