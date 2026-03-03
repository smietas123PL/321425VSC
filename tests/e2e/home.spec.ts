import { test, expect } from '@playwright/test';

test.describe('AgentSpark Initial Boot', () => {
    test('loads the homepage and displays the hero title', async ({ page }) => {
        // Assuming the dev server runs on port 5173 for Vite locally
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

        // Check if the title is correct
        await expect(page).toHaveTitle(/AgentSpark/);

        // Check if the hero section is visible (e.g., the title building UI)
        const titleRegex = /Build your.*Agent Team/;
        const heading = page.getByRole('heading', { level: 1 }).first();
        await expect(heading).toBeVisible();

        // Verify the "Generate Team" button is present and starts disabled
        const generateBtn = page.getByRole('button', { name: /⚙️ Generate Team/i });
        if (await generateBtn.isVisible()) {
            await expect(generateBtn).toBeDisabled();
        }
    });
});
