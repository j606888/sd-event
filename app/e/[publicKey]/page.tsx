import { Metadata } from "next";
import { db } from "@/db";
import { events, eventLocations, organizers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getEventDateLabel, getEventTimeRange } from "@/lib/format-event-date";
import { PublicEventPageClient } from "@/app/e/[publicKey]/PublicEventPageClient";

type Props = {
  params: Promise<{ publicKey: string }>;
};

async function getEventByPublicKey(publicKey: string) {
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.publicKey, publicKey))
    .limit(1);

  const event = rows[0];
  if (!event) return null;

  // Fetch location and organizer for OG tags
  const [location, organizer] = await Promise.all([
    event.locationId
      ? db
        .select()
        .from(eventLocations)
        .where(eq(eventLocations.id, event.locationId))
        .limit(1)
        .then((rows) => rows[0] || null)
      : Promise.resolve(null),
    event.organizerId
      ? db
        .select()
        .from(organizers)
        .where(eq(organizers.id, event.organizerId))
        .limit(1)
        .then((rows) => rows[0] || null)
      : Promise.resolve(null),
  ]);

  return {
    ...event,
    location,
    organizer,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicKey } = await params;
  const event = await getEventByPublicKey(publicKey);

  if (!event) {
    return {
      title: "活動不存在",
      description: "連結可能已失效或活動已刪除",
    };
  }

  // Get site URL from environment variables
  const siteUrl =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "https://sd-event.vercel.app";

  const pageUrl = `${siteUrl}/e/${publicKey}`;
  const title = `${event.title}`;

  // Build description with event period and location
  const period = `${getEventDateLabel(event.startAt.toISOString(), event.endAt.toISOString())} ${getEventTimeRange(event.startAt.toISOString(), event.endAt.toISOString())}`;
  const location = event.location ? `${event.location.name}` : "";

  const description = [period, location].filter(Boolean).join(" | ");

  const imageUrl = event.coverUrl || `${siteUrl}/og-default.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "SD Event",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
      locale: "zh_TW",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default async function PublicEventPage({ params }: Props) {
  const { publicKey } = await params;
  return <PublicEventPageClient publicKey={publicKey} />;
}
