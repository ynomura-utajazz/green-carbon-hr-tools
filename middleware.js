export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};

export default function middleware(request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Basic ')) {
    const encoded = authHeader.slice(6);
    try {
      const decoded = atob(encoded);
      const colonIndex = decoded.indexOf(':');
      const user = decoded.slice(0, colonIndex);
      const pass = decoded.slice(colonIndex + 1);
      if (user === 'greencarbon' && pass === 'GC-HR-2024') {
        return;
      }
    } catch (e) {
      // Invalid base64
    }
  }

  return new Response('Green Carbon HR Tools\n社内専用システムです。\n\nID: greencarbon\nPW: 管理者にお問い合わせください', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Green Carbon HR Tools 社内専用"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
