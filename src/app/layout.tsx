import type { Metadata } from "next";
import { Inter, Manrope, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["600", "700", "800"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Studio Nexis — Studio Management",
  description: "The operating system for pilates & yoga studios.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("nx2-theme");if(t==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
