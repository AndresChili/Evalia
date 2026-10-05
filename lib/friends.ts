import { db } from "@/lib/db";

export type ShareableFriend = { id: string; displayName: string };

export async function getFriendsForShare(userId: string): Promise<ShareableFriend[]> {
  const friendships = await db.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: { userA: { include: { profile: true } }, userB: { include: { profile: true } } },
  });

  return friendships.map((f) => {
    const other = f.userAId === userId ? f.userB : f.userA;
    return { id: other.id, displayName: other.profile?.displayName ?? other.email };
  });
}
