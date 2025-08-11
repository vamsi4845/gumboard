import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const note = await db.note.findUnique({
      where: { id },
      include: { board: { select: { organizationId: true } } },
    });
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true, isAdmin: true },
    });

    if (!user?.organizationId || user.organizationId !== note.board.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (note.createdBy !== session.user.id && !user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.note.update({
      where: { id },
      data: {
        ...(body.content !== undefined && { content: body.content }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.done !== undefined && { done: body.done }),
        ...(body.checklistItems !== undefined && { checklistItems: body.checklistItems }),
        ...(body.archived === true && { done: true }),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


