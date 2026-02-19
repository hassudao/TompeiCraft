import "./globals.css";

export const metadata = {
  title: 'TompeiCraft',
  description: 'Online Voxel Game',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="overflow-hidden m-0 p-0">{children}</body>
    </html>
  )
}
