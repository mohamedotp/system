import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const { path: filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: 'مسار الملف مطلوب' }, { status: 400 });
    }

    // تأكد من أن المسار آمن ولا يسمح بالوصول خارج المجلد المسموح به
    // يمكنك إضافة validation هنا

    // قراءة الملف
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    // إرجاع الملف
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': 'application/octet-stream',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'فشل تحميل الملف' }, { status: 500 });
  }
}