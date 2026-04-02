export const metadata = {
  title: "Wave Expense Bot — TY2025",
  description: "AI-powered expense categorization and Wave sync",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: "#08090e" }}>{children}</body>
    </html>
  );
}
