
// export default function Loading() {
//   return (
//     <main className="p-6" aria-live="polite">
//       <h1 className="text-2xl font-bold">
//         Admin Dashboard
//       </h1>
//       <p>Loading dashboard data...</p>
//     </main>
//   );
// }


export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-lg bg-gray-200"
          />
        ))}
      </div>

      <p className="text-sm text-gray-500">
        Loading dashboard data...
      </p>
    </div>
  );
}
