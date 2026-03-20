// app/dashboard/page.tsx
import { Card } from "@/components/Card";

export default function Dashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-2 text-lg text-gray-600">Welcome back. Here is what&apos;s happening with your projects.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card title="Projects" value="12" />
        <Card title="Total Builds" value="48" />
        <Card title="Monthly Usage" value="75%" />
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
        <div className="bg-white border rounded-2xl p-6 text-gray-500 italic">
          No recent activity to show.
        </div>
      </section>
    </div>
  );
}
