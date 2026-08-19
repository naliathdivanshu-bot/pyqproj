import './globals.css';

export const metadata = {
  title: 'PYQ Predictor',
  description: 'Paste previous year questions and get an AI-predicted paper, topic-wise breakdown, and highly-predicted questions.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bitter:ital,wght@0,500;0,600;0,700;1,600&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
