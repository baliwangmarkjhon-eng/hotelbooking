import PreviewCallback from './PreviewCallback'

export const dynamic = 'force-dynamic'

export default async function PreviewCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (Object.keys(await searchParams).length > 0) {
    return <main className="p-8 text-center">Invalid callback.</main>
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7f5] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-[#dce7e2] bg-white p-8 shadow-xl">
        <h1 className="text-center font-serif text-3xl text-[#15322b]">Red 5 Star Hotel</h1>
        <div className="mt-4">
          <PreviewCallback />
        </div>
      </div>
    </main>
  )
}
