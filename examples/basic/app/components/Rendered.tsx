import { connection } from 'next/server'

// Waits for a request, which makes the page render on the server every time.
export async function Rendered() {
  await connection()

  return <p className="rendered">Rendered on the server at {new Date().toISOString().slice(11, 23)}</p>
}
