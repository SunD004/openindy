import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { generateFec } from "@/server/services/fec-export"

export async function GET() {
  const { organization } = await requireUser()
  const { content, filename } = await generateFec(organization.id)
  return new NextResponse(content, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  })
}
