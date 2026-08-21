/**
 * Normalize a raw phone field that may contain ONE or TWO numbers.
 *
 * A customer often has two contact numbers. In source spreadsheets these are
 * written many ways: "9999999999 / 8888888888", "9999999999, 8888888888",
 * "9999999999 8888888888", "9999999999 and 8888888888". Older importers
 * stripped spaces and slashes, which glued two 10-digit numbers into one bare
 * 20-digit run. This helper keeps the numbers distinct and stores them in a
 * single, consistent format: two numbers joined by ", ".
 *
 * Rules:
 *  - Split on separators that mean "another number": , / ; & newline, "and".
 *  - Within each segment keep only digits and a leading + (drop spaces/dashes).
 *  - A bare 20-digit segment = two 10-digit numbers stuck together → split it.
 *  - Multiple numbers are re-joined with ", "; a single number is returned as-is.
 *
 * @example normalizePhone("9999999999/8888888888") // "9999999999, 8888888888"
 * @example normalizePhone("99999999998888888888")  // "9999999999, 8888888888"
 * @example normalizePhone("9999999999")            // "9999999999"
 */
export function normalizePhone(raw?: string | null): string | undefined {
	if (raw == null) return undefined;
	const s = String(raw).trim();
	if (!s) return undefined;

	const segments = s
		.split(/\s*(?:[,/;&]|\band\b|\n)\s*/i)
		.flatMap((seg) => {
			const cleaned = seg.replace(/[^\d+]/g, "");
			// A bare 20-digit run is two 10-digit numbers written with no (or a
			// stripped) separator — split it back into two.
			if (/^\d{20}$/.test(cleaned)) {
				return [cleaned.slice(0, 10), cleaned.slice(10)];
			}
			return [cleaned];
		})
		.filter(Boolean);

	if (segments.length === 0) return undefined;
	return segments.join(", ");
}
