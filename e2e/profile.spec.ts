import { go, logIn, unique } from "./support/app";
import { expect, test } from "./support/test";

test("a taken handle is turned down next to the field and nothing is saved", async ({ page }) => {
  // Ian's profile, read only: the spec never saves. "jayrome" is Jarret's handle in the seed.
  await go(page, "/profile");
  const handle = page.getByLabel("Handle");
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();

  await handle.fill("jayrome");
  const problem = page.getByRole("alert").filter({ hasText: "That handle is taken" });
  await expect(problem).toBeVisible();
  await expect(handle).toHaveAttribute("aria-invalid", "true");

  // Trying to save keeps the person on the field and asks for nothing to be confirmed.
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(handle).toBeFocused();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await page.reload();
  await expect(handle).toHaveValue("ianczm");
});

test.describe("a new person's own profile", () => {
  // The seeded users keep their names, so this one signs up a fresh person and changes their name.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("Save waits for a change and the new name is still there after a reload", async ({ page, newUser }) => {
    const renamed = `Renamed ${unique()}`;
    await logIn(page, newUser);
    await go(page, "/profile");
    const name = page.getByLabel("Display name");
    const save = page.getByRole("button", { name: "Save changes" });

    await expect(name).toHaveValue(newUser.name);
    await expect(save).toBeDisabled();

    await name.fill(renamed);
    await expect(save).toBeEnabled();
    // Putting the old name back means there is nothing to save again.
    await name.fill(newUser.name);
    await expect(save).toBeDisabled();

    await name.fill(renamed);
    await save.click();
    await expect(page.getByText("Profile saved")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: renamed })).toBeVisible();
    await expect(save).toBeDisabled();

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: renamed })).toBeVisible();
    await expect(page.getByLabel("Display name")).toHaveValue(renamed);
  });
});
