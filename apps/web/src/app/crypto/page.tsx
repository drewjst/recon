import { CryptoDashboard } from '@/components/crypto';

export const metadata = {
  title: 'Crypto Markets - Crux',
  description: 'Real-time cryptocurrency market data, charts, and analysis',
};

export default function CryptoPage() {
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <CryptoDashboard />
    </div>
  );
}
