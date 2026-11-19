const home = {
  title: "TecVerde",
  description: "Reportes y adopciones del Tec campus Matamoros.",
} as const;

export default function HomePage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center gap-4 px-6">
      <h1 className="text-5xl font-semibold tracking-tight">{home.title}</h1>
      <p className="text-lg">{home.description}</p>
    </main>
  );
}
