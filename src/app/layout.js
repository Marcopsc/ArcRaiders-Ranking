import "./globals.css";

export const metadata = {
  title: "RANKING PvP — ARC RAIDERS BR",
  description:
    "Tier list colaborativa para a comunidade votar nos melhores streamers brasileiros de PvP em ARC Raiders.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏆</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
