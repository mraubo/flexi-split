/**
 * Test data generator utilities for E2E tests
 */

export function generateEmail(prefix = "test"): string {
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${Date.now()}-${random}@example.com`;
}

export function generatePassword(): string {
  return "TestPass123!";
}

export function generateSettlementTitle(): string {
  const titles = [
    "Wycieczka do Warszawy",
    "Weekend w Krakowie",
    "Wspólny urlop",
    "Rodzinne święta",
    "Obóz letni",
    "Konferencja biznesowa",
  ];
  const random = Math.floor(Math.random() * titles.length);
  return titles[random];
}

export function generateNickname(prefix = "user"): string {
  const random = Math.random().toString(36).substring(7).substring(0, 5);
  return `${prefix}_${random}`.toLowerCase();
}

export function generateExpenseDescription(): string {
  const descriptions = [
    "Paliwo",
    "Noclegi",
    "Posiłki",
    "Transport",
    "Bilety wstępu",
    "Napoje",
    "Obiad",
    "Śniadanie",
    "Kolacja",
    "Pamiątki",
  ];
  const random = Math.floor(Math.random() * descriptions.length);
  return descriptions[random];
}

export function generateAmount(min = 10, max = 500): string {
  const amount = Math.floor(Math.random() * (max - min + 1) + min);
  const cents = Math.floor(Math.random() * 100);
  return `${amount},${cents.toString().padStart(2, "0")}`;
}

export function generateDate(daysOffset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function generateParticipants(count: number): string[] {
  const baseNames = [
    "jan_kowalski",
    "anna_nowak",
    "piotr_wisniewski",
    "maria_lewandowska",
    "tomasz_kaminski",
    "magdalena_zielinska",
    "robert_kucharski",
    "katarzyna_wolska",
    "michal_sarnowski",
    "beata_grzegorz",
  ];

  return baseNames.slice(0, count);
}
