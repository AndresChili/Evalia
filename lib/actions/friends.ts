"use server";

import type { FriendshipRequestModel as FriendshipRequest } from "@/lib/generated/prisma/models";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { friendRequestRateLimiter, isRateLimited, userSearchRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export type UserSearchResult = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  relation: "friends" | "request_sent" | "request_received" | "none";
};

/** Fila normalizada Friendship: userAId siempre el id menor alfabéticamente. */
function sortedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function createFriendshipFromRequest(request: FriendshipRequest): Promise<void> {
  const [userAId, userBId] = sortedPair(request.fromUserId, request.toUserId);
  await db.$transaction([
    db.friendshipRequest.update({
      where: { id: request.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
    db.friendship.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
    }),
  ]);
}

export async function searchUsersAction(
  query: string,
): Promise<{ error?: string; results?: UserSearchResult[] }> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const ip = await getClientIp();
  if (await isRateLimited(userSearchRateLimiter, `search:${session.user.id}:${ip}`)) {
    return { error: "Demasiadas búsquedas en poco tiempo. Prueba de nuevo en un momento." };
  }

  const trimmed = query.trim();
  if (trimmed.length < 2) return { results: [] };

  // Búsqueda por nombre (parcial) o email exacto — nunca se devuelve el email de otro usuario
  // en el resultado, para no convertir esto en una herramienta de fisgoneo de emails ajenos.
  const profiles = await db.profile.findMany({
    where: {
      userId: { not: session.user.id },
      OR: [
        { displayName: { contains: trimmed, mode: "insensitive" } },
        { user: { email: trimmed.toLowerCase() } },
      ],
    },
    take: 20,
    select: { userId: true, displayName: true, avatarPathname: true },
  });

  if (profiles.length === 0) return { results: [] };

  const otherIds = profiles.map((p) => p.userId);

  const [friendships, sentRequests, receivedRequests] = await Promise.all([
    db.friendship.findMany({
      where: {
        OR: [
          { userAId: session.user.id, userBId: { in: otherIds } },
          { userBId: session.user.id, userAId: { in: otherIds } },
        ],
      },
    }),
    db.friendshipRequest.findMany({
      where: { fromUserId: session.user.id, toUserId: { in: otherIds }, status: "PENDING" },
    }),
    db.friendshipRequest.findMany({
      where: { toUserId: session.user.id, fromUserId: { in: otherIds }, status: "PENDING" },
    }),
  ]);

  const friendIds = new Set(
    friendships.map((f) => (f.userAId === session.user.id ? f.userBId : f.userAId)),
  );
  const sentIds = new Set(sentRequests.map((r) => r.toUserId));
  const receivedIds = new Set(receivedRequests.map((r) => r.fromUserId));

  const results: UserSearchResult[] = profiles.map((p) => ({
    id: p.userId,
    displayName: p.displayName,
    avatarUrl: p.avatarPathname ? `/api/avatars/${p.userId}` : null,
    relation: friendIds.has(p.userId)
      ? "friends"
      : sentIds.has(p.userId)
        ? "request_sent"
        : receivedIds.has(p.userId)
          ? "request_received"
          : "none",
  }));

  return { results };
}

export async function sendFriendRequestAction(toUserId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };
  if (toUserId === session.user.id)
    return { error: "No puedes enviarte una solicitud a ti mismo." };

  const ip = await getClientIp();
  if (await isRateLimited(friendRequestRateLimiter, `friend-req:${session.user.id}:${ip}`)) {
    return { error: "Demasiadas solicitudes enviadas en poco tiempo. Prueba de nuevo en un rato." };
  }

  const toUser = await db.user.findUnique({ where: { id: toUserId } });
  if (!toUser) return { error: "Usuario no encontrado." };

  const [userAId, userBId] = sortedPair(session.user.id, toUserId);
  const existingFriendship = await db.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (existingFriendship) return { error: "Ya sois amigos." };

  // Si la otra persona ya te había enviado una solicitud, aceptarla directamente en vez de
  // crear una segunda solicitud cruzada.
  const reverseRequest = await db.friendshipRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: session.user.id } },
  });
  if (reverseRequest?.status === "PENDING") {
    await createFriendshipFromRequest(reverseRequest);
    await db.notification.create({
      data: {
        userId: toUserId,
        type: "FRIEND_REQUEST_ACCEPTED",
        payload: { byUserId: session.user.id },
      },
    });
    return {};
  }

  const existing = await db.friendshipRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId: session.user.id, toUserId } },
  });
  if (existing?.status === "PENDING") return { error: "Ya le has enviado una solicitud." };

  if (existing) {
    await db.friendshipRequest.update({
      where: { id: existing.id },
      data: { status: "PENDING", respondedAt: null, createdAt: new Date() },
    });
  } else {
    await db.friendshipRequest.create({ data: { fromUserId: session.user.id, toUserId } });
  }

  await db.notification.create({
    data: {
      userId: toUserId,
      type: "FRIEND_REQUEST_RECEIVED",
      payload: { fromUserId: session.user.id },
    },
  });

  return {};
}

export async function respondToFriendRequestAction(
  requestId: string,
  accept: boolean,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const request = await db.friendshipRequest.findUnique({ where: { id: requestId } });
  if (!request || request.toUserId !== session.user.id)
    return { error: "Solicitud no encontrada." };
  if (request.status !== "PENDING") return { error: "Esta solicitud ya no está pendiente." };

  if (accept) {
    await createFriendshipFromRequest(request);
    await db.notification.create({
      data: {
        userId: request.fromUserId,
        type: "FRIEND_REQUEST_ACCEPTED",
        payload: { byUserId: session.user.id },
      },
    });
  } else {
    await db.friendshipRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", respondedAt: new Date() },
    });
  }

  return {};
}

export async function cancelFriendRequestAction(requestId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const request = await db.friendshipRequest.findUnique({ where: { id: requestId } });
  if (!request || request.fromUserId !== session.user.id)
    return { error: "Solicitud no encontrada." };
  if (request.status !== "PENDING") return { error: "Esta solicitud ya no está pendiente." };

  await db.friendshipRequest.update({
    where: { id: request.id },
    data: { status: "CANCELLED", respondedAt: new Date() },
  });

  return {};
}

export async function removeFriendAction(otherUserId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const [userAId, userBId] = sortedPair(session.user.id, otherUserId);
  const friendship = await db.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (!friendship) return { error: "No sois amigos." };

  await db.friendship.delete({ where: { id: friendship.id } });
  return {};
}
