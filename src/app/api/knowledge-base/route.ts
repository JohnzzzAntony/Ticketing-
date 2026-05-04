import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: Prisma.KnowledgeBaseArticleWhereInput = {
      isPublished: true,
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      db.knowledgeBaseArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.knowledgeBaseArticle.count({ where }),
    ]);

    return NextResponse.json({
      articles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Knowledge base list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "ADMIN" && userRole !== "AGENT") {
      return NextResponse.json(
        { error: "Only admins and agents can create articles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, category, isPublished } = body;

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: "Title, content, and category are required" },
        { status: 400 }
      );
    }

    const article = await db.knowledgeBaseArticle.create({
      data: {
        title,
        content,
        category,
        isPublished: isPublished ?? false,
      },
    });

    // Create audit log
    const userId = (session.user as Record<string, unknown>).id as string;
    await db.auditLog.create({
      data: {
        action: "KB_ARTICLE_CREATED",
        entity: "KnowledgeBaseArticle",
        entityId: article.id,
        details: `Knowledge base article "${title}" created`,
        userId,
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("Knowledge base creation error:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
