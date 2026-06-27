import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Owner Portal | Arka Villa Platform',
  description: 'Mobile owner dashboard for managing villas on the go.',
};

export default function OwnerMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
