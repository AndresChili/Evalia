import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FriendRequestList } from "@/components/friends/friend-request-list";
import { FriendSearch } from "@/components/friends/friend-search";
import { FriendsList } from "@/components/friends/friends-list";
import { SentRequestList } from "@/components/friends/sent-request-list";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Amigos" };

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [friendships, receivedRequests, sentRequests] = await Promise.all([
    db.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: { include: { profile: true } },
        userB: { include: { profile: true } },
      },
    }),
    db.friendshipRequest.findMany({
      where: { toUserId: userId, status: "PENDING" },
      include: { fromUser: { include: { profile: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.friendshipRequest.findMany({
      where: { fromUserId: userId, status: "PENDING" },
      include: { toUser: { include: { profile: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const friends = friendships.map((f) => {
    const other = f.userAId === userId ? f.userB : f.userA;
    return { id: other.id, displayName: other.profile?.displayName ?? other.email };
  });

  const received = receivedRequests.map((r) => ({
    id: r.id,
    displayName: r.fromUser.profile?.displayName ?? r.fromUser.email,
  }));

  const sent = sentRequests.map((r) => ({
    id: r.id,
    displayName: r.toUser.profile?.displayName ?? r.toUser.email,
  }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Amigos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Añade amigos para poder compartir tests con ellos.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Buscar</h2>
        <FriendSearch />
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">
          Solicitudes recibidas {received.length > 0 && `(${received.length})`}
        </h2>
        <FriendRequestList requests={received} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Solicitudes enviadas</h2>
        <SentRequestList requests={sent} />
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">
          Tus amigos {friends.length > 0 && `(${friends.length})`}
        </h2>
        <FriendsList friends={friends} />
      </section>
    </div>
  );
}
