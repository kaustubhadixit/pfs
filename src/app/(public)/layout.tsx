// Public site shell: sticky navbar + sticky-to-bottom footer.
// `min-h-screen flex flex-col` on the wrapper with `mt-auto` footer guarantees
// the footer sticks to the viewport bottom on short pages and is pushed down
// naturally on long pages (no overlap, no floating gap).
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
