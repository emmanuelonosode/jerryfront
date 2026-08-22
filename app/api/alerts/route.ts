import { NextResponse, type NextRequest } from 'next/server';
import { sendAlert } from '@/lib/mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type === 'tour_booked') {
      const { listingSlug, name, email, phone, preferredDate, preferredTime } = data;
      await sendAlert(
        'Tour Booked',
        `A new tour was booked for ${listingSlug || 'a property'}.\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nDate: ${preferredDate}\nTime: ${preferredTime}`
      );
    } else {
      await sendAlert('System Alert', `An alert of type ${type} was triggered.\n\nData: ${JSON.stringify(data, null, 2)}`);
    }

    return new NextResponse(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Failed to process alert webhook', error);
    return new NextResponse(JSON.stringify({ success: false }), { status: 500 });
  }
}
