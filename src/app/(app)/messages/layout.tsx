
import { ConversationList } from "./conversation-list";

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid h-[calc(100vh-theme(spacing.14)*2)] grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[380px_1fr]">
      <aside className="hidden md:block border-r">
          <ConversationList />
      </aside>
      <main>
          {children}
      </main>
    </div>
  );
}
