import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { isMobileDevice } from "@/lib/isMobileDevice";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "文本审核系统",
  description: "审核系统",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isMobile = await isMobileDevice();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="text/javascript"
          src="http://192.168.73.73:8888/web-apps/apps/api/documents/api.js"
          async
        />
      </head>
      <body className={inter.className}>
        {isMobile && (
          <div className="h-screen flex flex-col items-center justify-center">
            <p>
              <strong>文本审核系统</strong>
            </p>
          </div>
        )}
        {!isMobile && (
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        )}
      </body>
    </html>
  );
}
