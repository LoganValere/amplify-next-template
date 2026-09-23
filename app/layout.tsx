import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConfigureAmplify } from "@/components/configure-amplify";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Valere Portal",
  description: "Valere time tracking and client portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConfigureAmplify />
        {children}
      </body>
    </html>
  );
}
