import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PATCH /api/memories/[id] - Update a memory (status, level/category, content, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const { status, category, content, target_date, metadata } = body;

    // Check if memory exists
    const existing = await prisma.memoryNode.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (status) updateData.status = status;
    if (category) updateData.level = category; // Map category to level
    if (content !== undefined) updateData.content = content;
    if (target_date !== undefined) updateData.targetDate = target_date ? new Date(target_date) : null;
    if (metadata !== undefined) updateData.metadata = metadata ? JSON.stringify(metadata) : null;

    const updated = await prisma.memoryNode.update({
      where: { id },
      data: updateData,
    });

    const mapped = {
      id: updated.id,
      content: updated.content,
      category: updated.level,
      created_at: updated.createdAt.toISOString(),
      target_date: updated.targetDate ? updated.targetDate.toISOString() : undefined,
      status: updated.status,
      metadata: updated.metadata ? JSON.parse(updated.metadata) : undefined
    };

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error('Error updating memory:', error);
    return NextResponse.json(
      { error: 'Failed to update memory in SQLite', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/memories/[id] - Delete a memory
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const existing = await prisma.memoryNode.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    await prisma.memoryNode.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: `Memory ${id} deleted successfully` });
  } catch (error: any) {
    console.error('Error deleting memory:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory from SQLite', details: error.message },
      { status: 500 }
    );
  }
}
