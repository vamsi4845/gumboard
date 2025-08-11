import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getBoardNoteCounts } from "@/lib/helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const [user, boards] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, isAdmin: true, organizationId: true },
    }),
    // Get boards first without expensive _count
    null // We'll fetch this conditionally below
  ]);

  if (!user?.organizationId) {
    return NextResponse.json({ user, boards: [] });
  }

  // Fetch boards without _count - much faster
  const boardsData = await db.board.findMany({
    where: { organizationId: user.organizationId },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      isPublic: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Get note counts in one efficient query
  const noteCounts = await getBoardNoteCounts(boardsData.map(b => b.id), db);

  // Combine data
  const boardsWithCounts = boardsData.map(board => ({
    ...board,
    _count: { notes: noteCounts[board.id] || 0 }
  }));

  const res = NextResponse.json({ user, boards: boardsWithCounts });
  // Private user data; allow short-lived caching on the client
  res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
  return res;
}
export const runtime = "nodejs";


