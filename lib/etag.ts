import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export function handleEtagResponse(
  request: NextRequest,
  data: any,
  additionalHeaders?: HeadersInit
) {
  const etag = crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex')
  
  const clientEtag = request.headers.get('if-none-match')
  if (clientEtag === etag) {
    return new Response(null, { 
      status: 304,
      headers: { 
        'ETag': etag,
        ...additionalHeaders 
      }
    })
  }

  return NextResponse.json(data, { 
    headers: { 
      'ETag': etag,
      ...additionalHeaders 
    } 
  })
}