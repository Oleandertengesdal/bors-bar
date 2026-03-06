export default function EventPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Public layout — no auth required
  return <>{children}</>;
}
