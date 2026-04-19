import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { generateGrandLivre } from "@/server/services/fec-export"

export async function GET() {
  const { organization } = await requireUser()
  const { content, filename } = await generateGrandLivre(organization.id)
  return new NextResponse(content, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  })
}
