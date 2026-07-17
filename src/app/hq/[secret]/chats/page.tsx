import { assertHq } from "@/lib/hq";
import { HqChatInbox } from "@/components/hq/chat-inbox";

export const dynamic = "force-dynamic";

export default async function HqChatsPage({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  await assertHq(secret);
  return (
    <div>
      <h1 className="font-display text-[26px] font-extrabold tracking-tight text-ink">Live Chat</h1>
      <p className="mt-1 text-sm text-muted">Real-time support chats with studio owners — they message you from Help &amp; Support.</p>
      <div className="mt-5"><HqChatInbox /></div>
    </div>
  );
}
