export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="max-w-3xl text-center">
        <h1 className="text-5xl font-extrabold tracking-tight">
          BlackVaultDocs
        </h1>
        <p className="mt-2 text-sm uppercase tracking-widest text-gray-400">
          Declassified. Structured. Searchable.
        </p>
        <p className="mt-6 text-lg text-gray-300">
          A machine-readable archive of declassified US government documents,
          FOIA releases, and open intelligence disclosures &mdash; with
          thematic analysis surfaced across the full corpus.
        </p>
        <p className="mt-10 text-sm text-gray-500 font-mono">
          Status: archive bootstrapping
        </p>
      </div>
    </main>
  );
}
