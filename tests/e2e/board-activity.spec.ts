import { test, expect } from "../fixtures/test-helpers";

test.describe("Board latest activity on dashboard", () => {
  test("shows Created for new board then Last Updated after create/edit/delete note", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Activity Board"),
        description: testContext.prefix("Board activity flow"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    // 1) Dashboard initially shows Created
    await authenticatedPage.goto("/dashboard");
    const boardCard = authenticatedPage.locator(`[href="/boards/${board.id}"]`);
    await expect(boardCard).toBeVisible();
    await expect(boardCard.getByText("Created:")).toBeVisible();

    // 2) Open board and add two notes via UI (to keep count > 0 after deletion)
    await boardCard.click();
    await expect(authenticatedPage).toHaveURL(`/boards/${board.id}`);

    const waitCreateNote1 = authenticatedPage.waitForResponse(
      (r) =>
        r.url().includes(`/api/boards/${board.id}/notes`) &&
        r.request().method() === "POST" &&
        r.status() === 201
    );
    await authenticatedPage.getByRole("button", { name: "Add note" }).click();
    await waitCreateNote1;

    const waitCreateNote2 = authenticatedPage.waitForResponse(
      (r) =>
        r.url().includes(`/api/boards/${board.id}/notes`) &&
        r.request().method() === "POST" &&
        r.status() === 201
    );
    await authenticatedPage.getByRole("button", { name: "Add note" }).click();
    await waitCreateNote2;

    // Work with the newest note (last card)
    const lastNoteCard = authenticatedPage.locator('[data-testid="note-card"]').last();

    // Add a checklist item to the newest note
    const newItemTextarea = lastNoteCard.getByTestId("new-item").locator("textarea");
    await expect(newItemTextarea).toBeVisible();
    const initialItemText = testContext.prefix("Initial checklist item");
    const addItemResp = authenticatedPage.waitForResponse(
      (r) =>
        r.url().includes(`/api/boards/${board.id}/notes/`) &&
        r.request().method() === "PUT" &&
        r.ok()
    );
    await newItemTextarea.fill(initialItemText);
    await newItemTextarea.blur();
    await addItemResp;

    // Back to dashboard → now should show Last Updated
    await authenticatedPage.goto("/dashboard");
    const boardCardAfterCreate = authenticatedPage.locator(`[href="/boards/${board.id}"]`);
    await expect(boardCardAfterCreate.getByText("Last Updated:")).toBeVisible();

    // Capture updatedAt after create
    const afterCreate = await testPrisma.board.findUnique({ where: { id: board.id } });
    expect(afterCreate).not.toBeNull();
    const updatedAtAfterCreate = new Date(afterCreate!.updatedAt).getTime();

    // Get the created item id to perform a precise edit
    const createdItem = await testPrisma.checklistItem.findFirst({
      where: { content: initialItemText },
    });
    expect(createdItem).not.toBeNull();
    const itemId = createdItem!.id;

    // 3) Edit the checklist item content → should bump updatedAt
    await boardCardAfterCreate.click();
    await expect(authenticatedPage).toHaveURL(`/boards/${board.id}`);

    const saveEditResp = authenticatedPage.waitForResponse(
      (r) =>
        r.url().includes(`/api/boards/${board.id}/notes/`) &&
        r.request().method() === "PUT" &&
        r.ok()
    );
    const editText = testContext.prefix("Edited checklist item");
    const itemContainer = authenticatedPage.getByTestId(itemId);
    await itemContainer.getByRole("textbox").fill(editText);
    await authenticatedPage.locator("body").click();
    await saveEditResp;

    const afterEdit = await testPrisma.board.findUnique({ where: { id: board.id } });
    expect(afterEdit).not.toBeNull();
    expect(new Date(afterEdit!.updatedAt).getTime()).toBeGreaterThan(updatedAtAfterCreate);

    await authenticatedPage.goto("/dashboard");
    await expect(
      authenticatedPage.locator(`[href="/boards/${board.id}"]`).getByText("Last Updated:")
    ).toBeVisible();

    // 4) Delete a note (ensure still ≥1 note remains) → should bump updatedAt
    await authenticatedPage.locator(`[href="/boards/${board.id}"]`).click();
    await expect(authenticatedPage).toHaveURL(`/boards/${board.id}`);

    const waitDelete = authenticatedPage.waitForResponse(
      (r) =>
        r.url().includes(`/api/boards/${board.id}/notes/`) &&
        r.request().method() === "DELETE" &&
        r.ok()
    );
    const deleteButtonInLastCard = lastNoteCard.getByRole("button", { name: /Delete Note/i });
    await lastNoteCard.hover();
    await deleteButtonInLastCard.click();
    await waitDelete;

    const afterDelete = await testPrisma.board.findUnique({ where: { id: board.id } });
    expect(afterDelete).not.toBeNull();
    expect(new Date(afterDelete!.updatedAt).getTime()).toBeGreaterThan(
      new Date(afterEdit!.updatedAt).getTime()
    );

    await authenticatedPage.goto("/dashboard");
    await expect(
      authenticatedPage.locator(`[href="/boards/${board.id}"]`).getByText("Last Updated:")
    ).toBeVisible();
  });
});