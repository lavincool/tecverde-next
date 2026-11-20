export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid gap-2 rounded-card border border-line bg-panel p-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-pixel text-4xl leading-none tracking-tight">{value}</dd>
    </div>
  );
}
