'use client';

import HealthCheckDashboard from '@/app/components/HealthCheckDashboard';

export default function LibrarianPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📚 Biblioteca de Credenciales</h1>
          <p className="text-lg text-gray-600">
            Monitor the health and status of all credential sources and broker connections
          </p>
        </div>

        <HealthCheckDashboard />
      </div>
    </div>
  );
}
