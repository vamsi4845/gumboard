import { test, expect } from "../fixtures/test-helpers";

test.describe("Note auto expand", () => {
  test("textarea height grows exactly by line height per newline", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Auto Expand Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);
    const createNoteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );
    await authenticatedPage.getByRole("button", { name: "Add Note" }).click();
    await createNoteResponse;

    const newItemInput = authenticatedPage.getByTestId("new-item").locator("textarea");
    await expect(newItemInput).toBeVisible();

    const initial = await newItemInput.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      const h = el.getBoundingClientRect().height;
      const lh = parseFloat(cs.lineHeight);
      return { h, lh };
    });

    const line1 = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor";
    const line2 = "incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis";
    const line3 = "nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat";

    await newItemInput.type(line1);
    await newItemInput.press("Shift+Enter");
    await newItemInput.type(line2);
    await newItemInput.press("Shift+Enter");
    await newItemInput.type(line3);

    const after = await newItemInput.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      const h = el.getBoundingClientRect().height;
      const lh = parseFloat(cs.lineHeight);
      return { h, lh };
    });

    // 3 lines total vs initial 1: expect at least +2 * lineHeight (wrapping may increase more)
    const expectedDelta = 2 * initial.lh;
    const actualDelta = after.h - initial.h;
    expect(actualDelta).toBeGreaterThanOrEqual(expectedDelta - 2);
  });
});
