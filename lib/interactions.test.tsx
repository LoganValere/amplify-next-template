import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost",
  });
  Object.assign(globalThis, {
    React,
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    HTMLDialogElement: dom.window.HTMLDialogElement,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperties(dom.window.HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) { this.setAttribute("open", ""); },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) { this.removeAttribute("open"); },
    },
  });
  return dom;
}

async function render(element: React.ReactElement) {
  const { createRoot } = await import("react-dom/client");
  const container = document.querySelector("#root")!;
  const root = createRoot(container);
  await act(async () => { root.render(element); });
  return { container, root };
}

async function cleanup(root: Root, dom: JSDOM) {
  await act(async () => { root.unmount(); });
  dom.window.close();
}

function setValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = element instanceof window.HTMLSelectElement
    ? window.HTMLSelectElement.prototype
    : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
  element.dispatchEvent(new window.Event("change", { bubbles: true }));
  element.dispatchEvent(new window.Event("input", { bubbles: true }));
}

async function flush() {
  await act(async () => { await Promise.resolve(); });
}

test("manual entry validates locally and disables submission while saving", async () => {
  const dom = installDom();
  const { ManualEntryForm } = await import("../components/time/manual-entry-form");
  const save = deferred<Response>();
  const requests: RequestInit[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    requests.push(init ?? {});
    return save.promise;
  };
  const saved = deferred<void>();
  const view = await render(
    <ManualEntryForm
      accounts={[{ id: "account-1", name: "Acme", status: "Active", trackable: true, balances: [] }]}
      categories={[{ id: "category-1", name: "Development", active: true }]}
      user={{ id: "user-1", name: "Admin", role: "ADMIN", hourCategoryId: null }}
      onSaved={() => saved.promise}
    />,
  );
  try {
    await flush();
    const form = view.container.querySelector("form")!;
    const hours = view.container.querySelector("#manual-hours") as HTMLInputElement;
    await act(async () => { setValue(hours, "0"); });
    await act(async () => { form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })); });
    assert.match(view.container.textContent ?? "", /Hours must be greater than zero/);
    assert.equal(requests.length, 0);

    await act(async () => { setValue(hours, "1.5"); });
    await act(async () => {
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    const submit = view.container.querySelector("button[type='submit']") as HTMLButtonElement;
    assert.equal(requests.length, 1);
    assert.equal(submit.disabled, true);
    assert.match(String(requests[0]?.body), /"durationHours":1.5/);

    await act(async () => {
      save.resolve(new Response("{}", { status: 200 }));
      await Promise.resolve();
      saved.resolve();
      await Promise.resolve();
    });
    assert.equal(submit.disabled, false);
    assert.match(view.container.textContent ?? "", /Time entry saved/);
  } finally {
    globalThis.fetch = originalFetch;
    await cleanup(view.root, dom);
  }
});

test("Monday wizard serializes actions and clears submitted tokens", async () => {
  const dom = installDom();
  const { MondayConnectionWizard } = await import("../components/monday/connection-wizard");
  const boards = deferred<Response>();
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === "/api/monday/settings" && !init?.method) {
      return new Response(JSON.stringify({
        connected: false,
        boardId: null,
        boardName: null,
        status: "DISCONNECTED",
        lastTestedAt: null,
        lastSyncedAt: null,
        lastErrorAt: null,
        lastErrorMessage: null,
      }), { status: 200 });
    }
    if (url === "/api/monday/boards") return boards.promise;
    throw new Error(`Unexpected request: ${url}`);
  };
  const view = await render(<MondayConnectionWizard />);
  try {
    await flush();
    const token = view.container.querySelector("#monday-token") as HTMLInputElement;
    const form = token.closest("form")!;
    await act(async () => { setValue(token, "super-secret-token"); });
    await act(async () => {
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    assert.equal(calls.filter((call) => call.url === "/api/monday/boards").length, 1);
    assert.equal(token.disabled, true);
    assert.match(String(calls.at(-1)?.init?.body), /super-secret-token/);

    boards.resolve(new Response(JSON.stringify({
      boards: [{ id: "4476095209", name: "Accounts", state: "active" }],
    }), { status: 200 }));
    await flush();
    const cancel = [...view.container.querySelectorAll("button")]
      .find((button) => button.textContent === "Cancel")!;
    await act(async () => { cancel.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); });
    const clearedToken = view.container.querySelector("#monday-token") as HTMLInputElement;
    assert.equal(clearedToken.value, "");
    assert.doesNotMatch(view.container.textContent ?? "", /super-secret-token/);
  } finally {
    globalThis.fetch = originalFetch;
    await cleanup(view.root, dom);
  }
});

test("pending confirmation dialog ignores Escape and backdrop dismissal", async () => {
  const dom = installDom();
  const { ConfirmationDialog } = await import("../components/ui/dialog");
  let closes = 0;
  const view = await render(
    <ConfirmationDialog
      open
      title="Delete entry?"
      pending
      onConfirm={() => undefined}
      onClose={() => { closes += 1; }}
    />,
  );
  try {
    const dialog = view.container.querySelector("dialog")!;
    const cancel = new window.Event("cancel", { bubbles: false, cancelable: true });
    await act(async () => {
      dialog.dispatchEvent(cancel);
      dialog.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    assert.equal(cancel.defaultPrevented, true);
    assert.equal(closes, 0);
    assert.equal(dialog.hasAttribute("open"), true);
  } finally {
    await cleanup(view.root, dom);
  }
});
