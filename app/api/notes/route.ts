import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId, title, content } = await request.json();
    if (!boardId) return NextResponse.json({ error: "boardId required" }, { status: 400 });

    // verify access
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });
    const board = await db.board.findUnique({
      where: { id: boardId },
      select: { organizationId: true },
    });
    if (!user?.organizationId || !board || user.organizationId !== board.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const note = await db.note.create({
      data: {
        boardId,
        content: content ?? (title ?? ""),
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


