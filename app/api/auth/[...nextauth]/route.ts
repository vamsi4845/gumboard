import { handlers } from "@/auth"

export const { GET, POST } = handlers

// Force Node.js runtime to avoid Prisma Edge issues
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
