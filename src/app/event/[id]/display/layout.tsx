export default function DisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Public layout — no auth required for TV displays
  return <>{children}</>;
}
