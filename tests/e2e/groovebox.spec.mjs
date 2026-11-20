import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("hardware pads, real step playback, real WAV and project reload", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const grid = page.getByRole("group", { name: "8×8 performans padleri" });
  await expect(grid.getByRole("button")).toHaveCount(64);
  await expect(page.getByLabel("Canlı aranje ekranı")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/hardware-desktop.png",
    fullPage: true,
  });
  const reverb = page.getByRole("slider", { name: "REVERB", exact: true });
  await reverb.focus();
  await reverb.press("ArrowRight");
  await reverb.press("ArrowRight");
  await expect(reverb).toHaveValue("0.06");
  await page.getByRole("button", { name: "ADIMLAR", exact: true }).click();
  const steps = page.getByRole("group", { name: "8×16 adım düzenleyici" });
  await expect(steps.getByRole("button")).toHaveCount(64);
  await steps.getByRole("button").first().click();
  await expect(steps.getByRole("button").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByRole("button", { name: "Adım düzenlemesini geri al", exact: true })
    .click();
  await expect(steps.getByRole("button").first()).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page
    .getByRole("button", { name: "Adım düzenlemesini yinele", exact: true })
    .click();
  await expect(steps.getByRole("button").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "9–16", exact: true }).click();
  await steps.getByRole("button").first().click();
  await page.getByRole("button", { name: "Çal", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Durdur", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".screen-step-strip > i.current")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/hardware-steps.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  await page
    .getByRole("button", { name: "Ses kaydını başlat", exact: true })
    .click();
  await expect(page.locator(".record-time")).toHaveText(/00:0[1-9]/, {
    timeout: 10000,
  });
  await page.getByRole("button", { name: "Kaydı durdur", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "WAV indir", exact: true }),
  ).toBeVisible();
  const wavPromise = page.waitForEvent("download", { timeout: 10000 });
  await page.getByRole("button", { name: "WAV indir", exact: true }).click();
  const wavDownload = await wavPromise;
  const wav = await readFile(await wavDownload.path());
  expect(wav.subarray(0, 4).toString()).toBe("RIFF");
  expect(wav.length).toBeGreaterThan(10000);
  let power = 0;
  for (let i = 44; i + 1 < wav.length; i += 2)
    power += (wav.readInt16LE(i) / 32768) ** 2;
  expect(Math.sqrt(power / ((wav.length - 44) / 2))).toBeGreaterThan(0.00001);
  await wavDownload.saveAs("test-results/real-mix.wav");
  await page.getByRole("button", { name: "Durdur", exact: true }).click();
  const jsonPromise = page.waitForEvent("download", { timeout: 10000 });
  await page.getByRole("button", { name: "Proje indir", exact: true }).click();
  const json = JSON.parse(
    await readFile(await (await jsonPromise).path(), "utf8"),
  );
  expect(
    json.notes.filter((note) => note.gridLane === 0).map((note) => note.step),
  ).toEqual([0, 8]);
  expect(json.mix.reverbWet).toBe(0.06);
  await page.reload();
  await expect(
    page
      .getByRole("group", { name: "8×8 performans padleri" })
      .getByRole("button"),
  ).toHaveCount(64);
  await page.getByRole("button", { name: "ADIMLAR", exact: true }).click();
  await expect(
    page
      .getByRole("group", { name: "8×16 adım düzenleyici" })
      .getByRole("button")
      .first(),
  ).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("metronome and count-in stay out of the recorded mix", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Metronom", exact: true }).click();
  await page
    .getByRole("button", { name: "Bir ölçü ön sayım", exact: true })
    .click();
  for (const name of ["RIFF", "DAVUL", "SOLO"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  await page
    .getByRole("button", { name: "Ses kaydını başlat", exact: true })
    .click();
  await expect(page.locator(".record-time")).toHaveText(/00:0[1-9]/, {
    timeout: 10000,
  });
  await page.getByRole("button", { name: "Kaydı durdur", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "WAV indir", exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "WAV indir", exact: true }).click();
  const wav = await readFile(await (await downloadPromise).path());
  expect(wav.subarray(0, 4).toString()).toBe("RIFF");
  let peak = 0;
  for (let i = 44; i + 1 < wav.length; i += 2)
    peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
  expect(peak).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Durdur", exact: true }).click();
});

test("mobile hardware remains usable without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page
      .getByRole("group", { name: "8×8 performans padleri" })
      .getByRole("button"),
  ).toHaveCount(64);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "PRESET", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nereden başlayalım?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "PRESET", exact: true }).click();
  await page.screenshot({
    path: "test-results/hardware-mobile.png",
    fullPage: true,
  });
});

test("MIDI note velocity, sustain and disconnect release the live pads", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const input = new EventTarget();
    Object.assign(input, {
      id: "test-keyboard",
      name: "Test keyboard",
      state: "connected",
    });
    const access = new EventTarget();
    access.inputs = new Map([[input.id, input]]);
    Object.defineProperty(navigator, "requestMIDIAccess", {
      value: async (options) => {
        if (options.sysex !== false)
          throw new Error("sysex must not be requested");
        return access;
      },
    });
    window.testMidi = {
      send(data) {
        const event = new Event("midimessage");
        event.data = new Uint8Array(data);
        input.dispatchEvent(event);
      },
      disconnect() {
        input.state = "disconnected";
        access.dispatchEvent(new Event("statechange"));
      },
    };
  });
  await page.goto("/");
  await page
    .getByLabel("Nota yardımı", { exact: true })
    .selectOption("chromatic");
  await page
    .getByLabel("Solo enstrümanı", { exact: true })
    .selectOption("piano");
  await page.getByRole("button", { name: "MIDI bağla", exact: true }).click();
  await expect(page.getByLabel("MIDI giriş cihazı")).toHaveValue(
    "test-keyboard",
  );
  await page
    .getByRole("button", { name: "Solo döngüsü kaydet", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Solo kaydını bitir", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.testMidi.send([0x90, 61, 127]));
  await expect(page.locator(".hardware-pad.pad-lit").first()).toBeVisible();
  await expect(page.locator(".console-foot")).toContainText("1 OLAY");
  await page.evaluate(() => {
    window.testMidi.send([0xb0, 64, 127]);
    window.testMidi.send([0x80, 61, 0]);
  });
  await expect(page.locator(".hardware-pad.pad-lit").first()).toBeVisible();
  await page.evaluate(() => window.testMidi.send([0xb0, 64, 0]));
  // Stop playback so recorded-note flashes cannot be confused with a held MIDI note.
  await page.getByRole("button", { name: "Durdur", exact: true }).click();
  await expect(page.locator(".hardware-pad.pad-lit")).toHaveCount(0);
  await page.evaluate(() => window.testMidi.send([0x90, 64, 80]));
  await expect(page.locator(".hardware-pad.pad-lit").first()).toBeVisible();
  await page.evaluate(() => window.testMidi.disconnect());
  await expect(page.locator(".hardware-pad.pad-lit")).toHaveCount(0);
  await expect(page.getByLabel("MIDI giriş cihazı")).toHaveValue("");
  await page.getByRole("button", { name: "PROJE", exact: true }).click();
  const jsonPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Proje indir", exact: true }).click();
  const project = JSON.parse(
    await readFile(await (await jsonPromise).path(), "utf8"),
  );
  expect(
    project.notes.some(
      (note) =>
        note.midi === 61 &&
        note.instrument === "piano" &&
        note.velocity === 0.9,
    ),
  ).toBe(true);
});
