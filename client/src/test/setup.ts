import "@testing-library/jest-dom/vitest"; // adds matchers like toBeDisabled()
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import i18n from "../i18n";

// Tests run in English unless they switch language themselves.
await i18n.changeLanguage("en");

afterEach(() => {
  cleanup();
  localStorage.clear();
});
