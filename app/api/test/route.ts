import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Test API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ 
      message: 'Test POST is working',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Invalid JSON',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
