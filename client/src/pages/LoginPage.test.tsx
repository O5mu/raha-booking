import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import { renderApp } from "../test/render";

// Fake the API: no real server runs during frontend tests.
function mockFetch(handler: (url: string, init?: RequestInit) => { status: number; body: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const { status, body } = handler(url, init);
      return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    })
  );
}

const routes = (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/istirahas/:id" element={<p>Details page</p>} />
    <Route path="/owner" element={<p>Owner dashboard</p>} />
  </Routes>
);

describe("LoginPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("logs in with a demo button and lands on the role's home", async () => {
    mockFetch((_url, init) => {
      const { role } = JSON.parse(String(init?.body));
      return { status: 200, body: { token: "t0ken", user: { id: 2, name: "Demo Owner", email: "owner@raha.demo", role } } };
    });
    renderApp(routes, { route: "/login" });

    await userEvent.click(screen.getByRole("button", { name: "Try as owner" }));
    expect(await screen.findByText("Owner dashboard")).toBeInTheDocument();
    expect(localStorage.getItem("raha.token")).toBe("t0ken");
  });

  it("returns to the page that sent you to log in", async () => {
    mockFetch(() => ({ status: 200, body: { token: "t", user: { id: 1, name: "G", email: "g@x.com", role: "guest" } } }));
    renderApp(routes, { route: "/login?next=%2Fistirahas%2F3%3FcheckIn%3D2026-11-04" });

    await userEvent.click(screen.getByRole("button", { name: "Try as guest" }));
    expect(await screen.findByText("Details page")).toBeInTheDocument();
  });

  it("ignores an outside 'next' link (open redirect protection)", async () => {
    mockFetch(() => ({ status: 200, body: { token: "t", user: { id: 2, name: "O", email: "o@x.com", role: "owner" } } }));
    renderApp(routes, { route: "/login?next=%2F%2Fevil.example.com" });

    await userEvent.click(screen.getByRole("button", { name: "Try as owner" }));
    expect(await screen.findByText("Owner dashboard")).toBeInTheDocument();
  });

  it("shows the server's error for a wrong password", async () => {
    mockFetch(() => ({ status: 401, body: { error: "Invalid email or password" } }));
    renderApp(routes, { route: "/login" });

    await userEvent.type(screen.getByLabelText("Email"), "guest@raha.demo");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
  });
});
