import { beforeEach, describe, expect, it, vi } from "vitest";

type Sent = { to: string[]; subject: string; html: string };

// lib/email.ts 在載入時讀 RESEND_API_KEY 並建立 client，所以要在 import 之前設好、換成假的 Resend
const sent = vi.hoisted(() => {
  process.env.RESEND_API_KEY = "test";
  return [] as Sent[];
});

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (mail: Sent) => {
        sent.push(mail);
        return { error: null };
      },
    };
    batch = {
      send: async (mails: Sent[]) => {
        sent.push(...mails);
        return { error: null };
      },
    };
  },
}));

const {
  sendNewRegistrationNotificationEmail,
  sendPaymentConfirmedEmail,
  sendRefundedEmail,
  sendRegistrationSuccessEmail,
  sendTeamInvitationEmail,
} = await import("./email");

beforeEach(() => {
  sent.length = 0;
});

describe("registrant emails follow the registration's locale", () => {
  it("writes the registration email in English and escapes the event title", async () => {
    await sendRegistrationSuccessEmail({
      to: "a@example.com",
      registrationKey: "key1",
      eventTitle: "Salsa <Night>",
      locale: "en",
    });
    expect(sent[0].subject).toBe("[Pending] Registration received: Salsa <Night>");
    expect(sent[0].html).toContain("Thanks for registering for “Salsa &lt;Night&gt;”!");
    expect(sent[0].html).toContain("/registration-success/key1");
    expect(sent[0].html).not.toMatch(/[一-鿿]/);
  });

  it("keeps the original Chinese wording", async () => {
    await sendRegistrationSuccessEmail({ to: "a@example.com", registrationKey: "key1", locale: "zh-TW" });
    expect(sent[0].subject).toBe("[確認中] 您已成功報名活動");
    expect(sent[0].html).toContain("感謝您報名活動！");
  });

  it("formats the event date in the recipient's language", async () => {
    const event = {
      to: "a@example.com",
      registrationKey: "key1",
      eventTitle: "Bachata Party",
      eventStartAt: "2026-04-03T12:00:00.000Z",
      eventEndAt: "2026-04-03T15:00:00.000Z",
      eventLocation: { name: "Studio & Bar", googleMapUrl: null },
    };
    await sendPaymentConfirmedEmail({ ...event, locale: "en" });
    await sendPaymentConfirmedEmail({ ...event, locale: "zh-TW" });
    expect(sent[0].html).toContain("Time: Fri, Apr 3");
    expect(sent[0].html).toContain("Venue: Studio &amp; Bar");
    expect(sent[1].html).toContain("時間：4月3日 (五)");
    expect(sent[1].html).toContain("地點：Studio &amp; Bar");
  });

  it("bolds the refunded amount", async () => {
    await sendRefundedEmail({
      to: "a@example.com",
      registrationKey: "key1",
      amount: 1200,
      eventTitle: "Zouk Weekend",
      locale: "en",
    });
    expect(sent[0].html).toContain(
      "refunded your payment of <strong>NT$ 1,200</strong> for “Zouk Weekend”."
    );
  });
});

describe("team emails follow each recipient's locale", () => {
  it("renders each organizer's notification in their own language", async () => {
    await sendNewRegistrationNotificationEmail(
      [
        { email: "zh@example.com", locale: "zh-TW" },
        { email: "en@example.com", locale: "en" },
      ],
      {
        eventId: 9,
        eventTitle: "Salsa Night",
        contactName: "Ana",
        contactPhone: null,
        contactEmail: "ana@example.com",
        attendees: [
          { name: "Ana", role: "Follower" },
          { name: "Ben", role: "Not sure" },
        ],
        itemNames: ["Full Pass", "Party"],
        tierName: "Early bird",
        paymentMethod: "Bank Transfer",
        totalAmount: 2400,
        couponCode: "VIP",
        discountAmount: 200,
      }
    );
    const [zh, en] = sent;
    expect(zh.subject).toBe("[新報名] Salsa Night — Ana");
    expect(zh.html).toContain("票種：Full Pass、Party（Early bird）");
    expect(zh.html).toContain("Ben（不確定）");
    expect(en.subject).toBe("[New registration] Salsa Night — Ana");
    expect(en.html).toContain("Tickets: Full Pass, Party (Early bird)");
    expect(en.html).toContain("Amount: NT$ 2,400 (coupon VIP, NT$ 200 off)");
    expect(en.html).toContain("Attendees (2):");
    expect(en.html).not.toMatch(/[一-鿿]/);
  });

  it("falls back to a generic inviter name and shows the role", async () => {
    await sendTeamInvitationEmail(
      "new@example.com",
      { teamName: "Salsa Crew", inviterName: null, role: "staff" },
      "en"
    );
    expect(sent[0].subject).toBe("[Team invite] A team admin invited you to join “Salsa Crew”");
    expect(sent[0].html).toContain("Role: <strong>Check-in staff</strong>");
  });
});
