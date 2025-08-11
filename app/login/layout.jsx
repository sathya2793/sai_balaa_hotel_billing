export default function LoginLayout({ children }) {
  return (
    <html lang="en">
      <body className="login-layout-body">
        <main className="login-layout-main">
          {children}
        </main>
      </body>
    </html>
  );
}
