// Feature: photorealistic-avatar
// Requirements: 11.7
// This route is intentionally not linked from any public navigation.

import AdminAuthGate from '@/components/AdminAuthGate';

export const metadata = {
  title: 'Avatar Admin',
  robots: 'noindex, nofollow',
};

export default function AdminAvatarPage() {
  return <AdminAuthGate />;
}
