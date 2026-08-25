import { currentAccount } from "@/lib/auth/session";
import { getBankStore } from "@/lib/db/store";
import { readExhibit } from "@/lib/evidence/store";

/**
 * Serves an exhibit to members, and to nobody else.
 *
 * Not `public/`: a file under the public directory is on the open internet the
 * moment its name is known, and the point of an exhibit is that it is on the
 * record inside the bank, not published. Every response here is 404 rather
 * than 403 — a signed-out visitor should not be able to confirm that a
 * particular exhibit exists.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const missing = new Response("Not found", { status: 404 });

  if (!(await currentAccount())) return missing;

  const { filename } = await params;
  const exhibit = getBankStore().exhibits.byFilename(filename);
  if (!exhibit) return missing;

  let body: ArrayBuffer;
  try {
    const file = await readExhibit(exhibit.filename);
    // A fresh ArrayBuffer: Node's Buffer is a view into a shared pool, and
    // handing that to Response would expose whatever else is in the pool.
    body = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  } catch {
    return missing;
  }

  return new Response(body, {
    headers: {
      "content-type": exhibit.mime,
      "content-length": String(body.byteLength),
      // Generated filenames never change contents, so this can be cached hard
      // — but privately, never by a shared cache in front of the app.
      "cache-control": "private, max-age=31536000, immutable",
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
      // Belt and braces: an image that turns out to be something scriptable
      // still executes nothing.
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}
