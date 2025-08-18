import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Footer } from "./Footer";
import { BrowserRouter } from "react-router-dom";

// Mock the AuthContext
vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: null,
  })),
}));

describe("Footer", () => {
  it("should render email and phone links with proper underline styling", () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );

    // Check that email link exists and has correct structure
    const emailLink = screen.getByRole("link", { name: /email/i });
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute("href", "mailto:info@ofsl.ca");
    expect(emailLink).toHaveClass("inline-flex");
    
    // Check that the Email text has the footer-link class for underline
    const emailText = screen.getByText("Email");
    expect(emailText).toHaveClass("footer-link");
    expect(emailText.tagName).toBe("SPAN");

    // Check that phone link exists and has correct structure
    const phoneLink = screen.getByRole("link", { name: /phone/i });
    expect(phoneLink).toBeInTheDocument();
    expect(phoneLink).toHaveAttribute("href", "tel:6137986375");
    expect(phoneLink).toHaveClass("inline-flex");
    
    // Check that the Phone text has the footer-link class for underline
    const phoneText = screen.getByText("Phone");
    expect(phoneText).toHaveClass("footer-link");
    expect(phoneText.tagName).toBe("SPAN");
  });

  it("should render all footer sections", () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );

    // Check main section headers exist using role heading
    expect(screen.getByRole("heading", { name: "Leagues" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Get involved" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Useful links" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Site info" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument();

    // Check specific links
    expect(screen.getByRole("link", { name: /volleyball/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /badminton/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /newsletter/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /about us/i })).toBeInTheDocument();
  });

  it("should render social media links", () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );

    const facebookLink = screen.getByLabelText("Facebook");
    expect(facebookLink).toHaveAttribute("href", "https://www.facebook.com/OttawaFunSportsLeague");
    expect(facebookLink).toHaveAttribute("target", "_blank");

    const instagramLink = screen.getByLabelText("Instagram");
    expect(instagramLink).toHaveAttribute("href", "https://www.instagram.com/ottawafunsports/");
    expect(instagramLink).toHaveAttribute("target", "_blank");

    const tiktokLink = screen.getByLabelText("TikTok");
    expect(tiktokLink).toHaveAttribute("href", "https://www.tiktok.com/@ottawafunsports");
    expect(tiktokLink).toHaveAttribute("target", "_blank");
  });
});