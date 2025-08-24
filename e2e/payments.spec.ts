import { test, expect } from './fixtures/auth.fixture';

test.describe('Payment Workflows', () => {
  test('should display payment page for team registration', async ({ authenticatedPage: page }) => {
    await page.goto('/#/my-account/teams/1/payment');
    
    // Should show payment details
    await expect(page.locator('h1:has-text("Team Payment")')).toBeVisible();
    await expect(page.locator('text=Amount Due: $500.00')).toBeVisible();
    await expect(page.locator('text=Amount Paid: $0.00')).toBeVisible();
    
    // Should show payment options
    await expect(page.locator('button:has-text("Pay Full Amount")')).toBeVisible();
    await expect(page.locator('button:has-text("Pay Deposit")')).toBeVisible();
  });

  test('should process full payment with Stripe', async ({ authenticatedPage: page }) => {
    await page.goto('/#/my-account/teams/1/payment');
    
    // Click pay full amount
    await page.locator('button:has-text("Pay Full Amount")').click();
    
    // Mock Stripe checkout session
    await page.route('**/create-checkout-session', async route => {
      await route.fulfill({
        status: 200,
        json: {
          sessionId: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123'
        }
      });
    });
    
    // Should redirect to Stripe (mocked)
    await expect(page.locator('text=Redirecting to payment...')).toBeVisible();
  });

  test('should process deposit payment', async ({ authenticatedPage: page }) => {
    await page.goto('/#/my-account/teams/1/payment');
    
    // Click pay deposit
    await page.locator('button:has-text("Pay Deposit ($100)")').click();
    
    // Mock Stripe checkout for deposit
    await page.route('**/create-checkout-session', async route => {
      const body = route.request().postDataJSON();
      expect(body.amount).toBe(10000); // $100 in cents
      
      await route.fulfill({
        status: 200,
        json: {
          sessionId: 'cs_test_deposit',
          url: 'https://checkout.stripe.com/pay/cs_test_deposit'
        }
      });
    });
    
    // Should process deposit
    await expect(page.locator('text=Processing deposit payment...')).toBeVisible();
  });

  test('should handle payment success callback', async ({ authenticatedPage: page }) => {
    // Simulate returning from Stripe with success
    await page.goto('/#/payment/success?session_id=cs_test_123');
    
    // Mock payment verification
    await page.route('**/verify-payment*', async route => {
      await route.fulfill({
        status: 200,
        json: {
          payment_status: 'paid',
          amount_paid: 50000 // $500 in cents
        }
      });
    });
    
    // Should show success message
    await expect(page.locator('h1:has-text("Payment Successful")')).toBeVisible();
    await expect(page.locator('text=Thank you for your payment')).toBeVisible();
    await expect(page.locator('text=$500.00')).toBeVisible();
  });

  test('should handle payment cancellation', async ({ authenticatedPage: page }) => {
    // Simulate returning from Stripe with cancellation
    await page.goto('/#/payment/cancelled');
    
    // Should show cancellation message
    await expect(page.locator('h1:has-text("Payment Cancelled")')).toBeVisible();
    await expect(page.locator('text=Your payment was not processed')).toBeVisible();
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
  });

  test('should show payment history', async ({ authenticatedPage: page }) => {
    // Mock payment history
    await page.route('**/rest/v1/payment_history*', async route => {
      await route.fulfill({
        status: 200,
        json: [
          {
            id: 1,
            amount: 10000,
            payment_method: 'card',
            date: '2024-01-15T10:00:00Z',
            status: 'completed'
          },
          {
            id: 2,
            amount: 40000,
            payment_method: 'card',
            date: '2024-02-01T14:30:00Z',
            status: 'completed'
          }
        ]
      });
    });
    
    await page.goto('/#/my-account/teams/1/payment');
    
    // Should show payment history section
    await expect(page.locator('h2:has-text("Payment History")')).toBeVisible();
    
    // Should display past payments
    await expect(page.locator('text=$100.00 - Jan 15, 2024')).toBeVisible();
    await expect(page.locator('text=$400.00 - Feb 1, 2024')).toBeVisible();
    
    // Should show remaining balance
    await expect(page.locator('text=Balance: $0.00')).toBeVisible();
  });

  test('should handle admin payment recording', async ({ adminPage: page }) => {
    await page.goto('/#/admin/teams/1/payment');
    
    // Admin should see record payment option
    await expect(page.locator('button:has-text("Record Manual Payment")')).toBeVisible();
    
    // Click to record payment
    await page.locator('button:has-text("Record Manual Payment")').click();
    
    // Fill in payment details
    await page.fill('input[name="amount"]', '250');
    await page.selectOption('select[name="paymentMethod"]', 'cash');
    await page.fill('textarea[name="notes"]', 'Paid in person at facility');
    
    // Mock payment recording
    await page.route('**/rest/v1/league_payments*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          json: {
            id: 3,
            amount: 25000,
            payment_method: 'cash'
          }
        });
      }
    });
    
    await page.locator('button:has-text("Record Payment")').click();
    
    // Should show success
    await expect(page.locator('text=Payment recorded successfully')).toBeVisible();
  });

  test('should generate and download receipts', async ({ authenticatedPage: page }) => {
    await page.goto('/#/my-account/teams/1/payment');
    
    // Mock receipt generation
    const downloadPromise = page.waitForEvent('download');
    
    await page.route('**/generate-receipt*', async route => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="receipt-2024-001.pdf"'
        },
        body: Buffer.from('Mock PDF content')
      });
    });
    
    // Click download receipt
    await page.locator('button:has-text("Download Receipt")').click();
    
    // Should trigger download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('receipt-2024-001.pdf');
  });
});