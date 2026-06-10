import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/memories - Fetch all memories
export async function GET() {
  try {
    const memories = await prisma.memoryNode.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    const mapped = memories.map(m => ({
      id: m.id,
      content: m.content,
      category: m.level, // Map level to category
      created_at: m.createdAt.toISOString(),
      target_date: m.targetDate ? m.targetDate.toISOString() : undefined,
      status: m.status,
      metadata: m.metadata ? JSON.parse(m.metadata) : undefined,
      
      // New fields mapping
      importance: m.importance,
      tags: m.tags ? m.tags.split(',').filter(Boolean) : [], // Array of tags
      source: m.source,
      notes: m.notes || undefined,
      linkedIds: m.linkedIds ? JSON.parse(m.linkedIds) : [] // Array of linked IDs
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error('Error fetching memories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories from SQLite', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/memories - Create a new memory
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, category, target_date, metadata, importance, tags, source, notes, linkedIds } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (!category || !['SHORT', 'MEDIUM', 'LONG'].includes(category)) {
      return NextResponse.json({ error: 'Valid category (level) is required' }, { status: 400 });
    }

    // Convert tags array to comma-separated string
    const tagsString = Array.isArray(tags) ? tags.join(',') : (tags || '');

    const memory = await prisma.memoryNode.create({
      data: {
        content,
        level: category,
        targetDate: target_date ? new Date(target_date) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        importance: importance || 'MEDIUM',
        tags: tagsString,
        source: source || 'WEB',
        notes: notes || null,
        linkedIds: linkedIds ? JSON.stringify(linkedIds) : '[]',
      },
    });

    const mapped = {
      id: memory.id,
      content: memory.content,
      category: memory.level,
      created_at: memory.createdAt.toISOString(),
      target_date: memory.targetDate ? memory.targetDate.toISOString() : undefined,
      status: memory.status,
      metadata: memory.metadata ? JSON.parse(memory.metadata) : undefined,
      importance: memory.importance,
      tags: memory.tags ? memory.tags.split(',').filter(Boolean) : [],
      source: memory.source,
      notes: memory.notes || undefined,
      linkedIds: memory.linkedIds ? JSON.parse(memory.linkedIds) : []
    };

    return NextResponse.json(mapped, { status: 201 });
  } catch (error: any) {
    console.error('Error creating memory:', error);
    return NextResponse.json(
      { error: 'Failed to create memory in SQLite', details: error.message },
      { status: 500 }
    );
  }
}
