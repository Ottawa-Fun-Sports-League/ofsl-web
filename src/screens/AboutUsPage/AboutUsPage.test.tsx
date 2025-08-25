import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { AboutUsPage } from "./AboutUsPage";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "../../components/ui/toast";

// Mock fetch for contact form
global.fetch = vi.fn();

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://api.ofsl.ca');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

describe("AboutUsPage - Contact Form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send contact form successfully via direct fetch", async () => {
    // Mock successful fetch response
    (global.fetch as unknown as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Email sent successfully" }),
    });

    render(
      <BrowserRouter>
        <ToastProvider>
          <AboutUsPage />
        </ToastProvider>
      </BrowserRouter>
    );

    // Find and fill contact form fields
    const nameInput = screen.getByLabelText(/your name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const subjectInput = screen.getByLabelText(/subject/i);
    const messageInput = screen.getByLabelText(/message/i);

    fireEvent.change(nameInput, { target: { value: "Test User" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(subjectInput, { target: { value: "Test Subject" } });
    fireEvent.change(messageInput, { target: { value: "Test message content" } });

    // Find and click submit button
    const submitButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submitButton);

    // Wait for the form submission - should call fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.ofsl.ca/functions/v1/send-contact-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'test-anon-key',
            'Authorization': 'Bearer test-anon-key',
          },
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
            subject: "Test Subject",
            message: "Test message content",
          }),
        }
      );
    });

    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/thank you for your message/i)).toBeInTheDocument();
    });
  });

  it("should handle fetch error gracefully", async () => {
    // Mock fetch to return an error
    (global.fetch as unknown as Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });

    render(
      <BrowserRouter>
        <ToastProvider>
          <AboutUsPage />
        </ToastProvider>
      </BrowserRouter>
    );

    // Find and fill contact form fields
    const nameInput = screen.getByLabelText(/your name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const subjectInput = screen.getByLabelText(/subject/i);
    const messageInput = screen.getByLabelText(/message/i);

    fireEvent.change(nameInput, { target: { value: "Test User" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(subjectInput, { target: { value: "Test Subject" } });
    fireEvent.change(messageInput, { target: { value: "Test message content" } });

    // Find and click submit button
    const submitButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submitButton);

    // Wait for the form submission - should call fetch and handle error
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/there was an error sending your message/i)).toBeInTheDocument();
    });
  });

  it("should handle network errors gracefully", async () => {
    // Mock fetch to reject with network error
    (global.fetch as unknown as Mock).mockRejectedValueOnce(new Error("Network error"));

    render(
      <BrowserRouter>
        <ToastProvider>
          <AboutUsPage />
        </ToastProvider>
      </BrowserRouter>
    );

    // Find and fill contact form fields
    const nameInput = screen.getByLabelText(/your name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const subjectInput = screen.getByLabelText(/subject/i);
    const messageInput = screen.getByLabelText(/message/i);

    fireEvent.change(nameInput, { target: { value: "Test User" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(subjectInput, { target: { value: "Test Subject" } });
    fireEvent.change(messageInput, { target: { value: "Test message content" } });

    // Find and click submit button
    const submitButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submitButton);

    // Wait for the form submission - should call fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/there was an error sending your message/i)).toBeInTheDocument();
    });
  });
});