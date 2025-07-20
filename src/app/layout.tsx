import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import IframeResizer from "./components/IframeResizer"; // Import the new component

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Craftons Curves Calculator",
  description: "Create custom curves for your next project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <IframeResizer /> {/* Add the resizer component here */}
      </body>
    </html>
  );
}
