import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AboutUsPage } from "./AboutUsPage";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "../../components/ui/toast";

// Mock fetch for contact form
global.fetch = vi.fn();

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://api.ofsl.ca');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

// Mock supabase module
vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("AboutUsPage - Contact Form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send contact form successfully when invoke works", async () => {
    const { supabase } = await import("../../lib/supabase");
    
    // Mock supabase.functions.invoke to succeed
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { message: "Email sent successfully" },
      error: null
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

    // Wait for the form submission - should call invoke
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-contact-email', {
        body: {
          name: "Test User",
          email: "test@example.com",
          subject: "Test Subject",
          message: "Test message content",
        }
      });
    });

    // Should NOT call fetch since invoke succeeded
    expect(global.fetch).not.toHaveBeenCalled();

    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/thank you for your message/i)).toBeInTheDocument();
    });
  });

  it("should send contact form successfully with fallback to direct fetch", async () => {
    const { supabase } = await import("../../lib/supabase");
    
    // Mock supabase.functions.invoke to return an error (simulating JWT error)
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: new Error("Invalid JWT")
    });
    
    // Mock successful direct fetch response
    (global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
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

    // Wait for the form submission - should try invoke first, then fall back to fetch
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-contact-email', {
        body: {
          name: "Test User",
          email: "test@example.com",
          subject: "Test Subject",
          message: "Test message content",
        }
      });
    });

    // Check that fallback fetch was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.ofsl.ca/functions/v1/send-contact-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": "test-anon-key",
            "Authorization": "Bearer test-anon-key",
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

  it("should show error message when contact form submission fails", async () => {
    const { supabase } = await import("../../lib/supabase");
    
    // Mock supabase.functions.invoke to return an error
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: new Error("Invalid JWT")
    });
    
    // Mock failed fetch response
    (global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed to send email" }),
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

    // Wait for the form submission
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/there was an error sending your message/i)).toBeInTheDocument();
    });
  });

  it("should handle network errors gracefully", async () => {
    const { supabase } = await import("../../lib/supabase");
    
    // Mock invoke to return error and fetch to also fail
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: new Error("Network error")
    });
    (global.fetch as unknown as vi.Mock).mockRejectedValueOnce(new Error("Network error"));

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

    // Wait for the form submission
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/there was an error sending your message/i)).toBeInTheDocument();
    });
  });
});