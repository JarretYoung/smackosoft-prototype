/** The primary action stays in reach however long the page is, as in the match editor. */
export function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md flex-col gap-1 bg-gradient-to-t from-background from-70% to-transparent px-4 pt-6 pb-4">
      {children}
    </div>
  );
}
