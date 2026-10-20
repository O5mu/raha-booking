import { afterEach, describe, expect, it } from "vitest";
import i18n from ".";
import en from "./en.json";
import ar from "./ar.json";

// Every key path in a nested translation object, e.g. "details.book".
function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}
// Plural forms differ by language (Arabic has six), so compare base keys only.
const base = (list: string[]) => new Set(list.map((k) => k.replace(/_(zero|one|two|few|many|other)$/, "")));

describe("i18n", () => {
  afterEach(() => i18n.changeLanguage("en"));

  it("has an Arabic translation for every English key", () => {
    const arabic = base(keys(ar));
    const missing = [...base(keys(en))].filter((k) => !arabic.has(k));
    expect(missing).toEqual([]);
  });

  it("switches the whole page to right-to-left for Arabic", async () => {
    await i18n.changeLanguage("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    await i18n.changeLanguage("en");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("uses Arabic plural forms", async () => {
    await i18n.changeLanguage("ar");
    expect(i18n.t("details.nights", { count: 1 })).toBe("ليلة واحدة");
    expect(i18n.t("details.nights", { count: 2 })).toBe("ليلتان");
    expect(i18n.t("details.nights", { count: 3 })).toBe("3 ليالٍ");
    expect(i18n.t("details.nights", { count: 11 })).toBe("11 ليلة");
  });
});
