// @vitest-environment jsdom
// The trip's shared photo album: grouped by day, opens full size, and only offers editing or
// deleting to the people allowed to (the server enforces it too: server/tripPhotos.test.js)
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({
  getTripPhotos: vi.fn(),
  addTripPhoto: vi.fn(),
  updateTripPhoto: vi.fn(),
  deleteTripPhoto: vi.fn(),
}));
vi.mock("../../../utils/photos", async (importOriginal) => ({ ...(await importOriginal()), ...api }));
const prep = vi.hoisted(() => ({ preparePhoto: vi.fn() }));
vi.mock("../../../utils/photoFile", async (importOriginal) => ({ ...(await importOriginal()), ...prep }));

import PhotosPanel from "../PhotosPanel";
import { groupByDay } from "../../../utils/photos";

const DAYS = [
  { n: 1, iso: "2030-04-01", longDate: "Mon, Apr 1", city: "Tokyo" },
  { n: 2, iso: "2030-04-02", longDate: "Tue, Apr 2", city: "Kyoto" },
];
const photo = (id, extra = {}) => ({
  id,
  day: null,
  caption: null,
  uploader: { name: "Max Member", avatarUrl: null },
  mine: false,
  canDelete: false,
  createdAt: "2030-04-02T10:00:00Z",
  url: `https://x/${id}.jpg`,
  thumbUrl: `https://x/${id}-thumb.jpg`,
  ...extra,
});

const renderPanel = (props = { tripId: "t1" }) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PhotosPanel days={DAYS} {...props} />
    </QueryClientProvider>
  );

beforeEach(() => vi.clearAllMocks());

test("groupByDay: trip order, untagged last", () => {
  const groups = groupByDay([photo("a"), photo("b", { day: 2 }), photo("c", { day: 1 })], DAYS);
  expect(groups.map((g) => g.title)).toEqual(["Day 1 · Mon, Apr 1 · Tokyo", "Day 2 · Tue, Apr 2 · Kyoto", "Other photos"]);
  expect(groupByDay([photo("a")], DAYS)[0].title).toBe("");
});

describe("PhotosPanel", () => {
  test("empty album", async () => {
    api.getTripPhotos.mockResolvedValue({ photos: [], maxPhotos: 500 });
    renderPanel();
    expect(await screen.findByText("No photos yet")).toBeInTheDocument();
    expect(api.getTripPhotos).toHaveBeenCalledWith({ tripId: "t1" });
  });

  test("guests load the album by their link", async () => {
    api.getTripPhotos.mockResolvedValue({ photos: [], maxPhotos: 500 });
    renderPanel({ tripId: "t1", guestToken: "g-1" });
    await screen.findByText("No photos yet");
    expect(api.getTripPhotos).toHaveBeenCalledWith({ guestToken: "g-1" });
  });

  test("someone else's photo: view only", async () => {
    api.getTripPhotos.mockResolvedValue({ photos: [photo("a", { day: 2, caption: "Bamboo forest" })] });
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Photo: Bamboo forest" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Max Member")).toBeInTheDocument();
    expect(dialog.getByText(/Day 2 · Tue, Apr 2 · Kyoto/)).toBeInTheDocument();
    expect(dialog.queryByRole("button", { name: "Edit caption and day" })).toBeNull();
    expect(dialog.queryByRole("button", { name: "Delete photo" })).toBeNull();
  });

  test("your own photo: change its caption and day", async () => {
    api.getTripPhotos.mockResolvedValue({ photos: [photo("a", { mine: true, canDelete: true })] });
    api.updateTripPhoto.mockResolvedValue({ photos: [photo("a", { mine: true, canDelete: true, caption: "Ramen!", day: 1 })] });
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Photo by Max Member" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit caption and day" }));
    fireEvent.change(screen.getByLabelText("Caption"), { target: { value: "Ramen!" } });
    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.updateTripPhoto).toHaveBeenCalledWith({ tripId: "t1" }, "a", { caption: "Ramen!", day: 1 }));
    expect(await screen.findByText("Ramen!")).toBeInTheDocument();
  });

  test("delete asks first", async () => {
    api.getTripPhotos.mockResolvedValue({ photos: [photo("a", { canDelete: true })] });
    api.deleteTripPhoto.mockResolvedValue({ photos: [] });
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Photo by Max Member" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete photo" }));
    expect(api.deleteTripPhoto).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(api.deleteTripPhoto).toHaveBeenCalledWith({ tripId: "t1" }, "a"));
    expect(await screen.findByText("No photos yet")).toBeInTheDocument();
  });

  test("adding photos tags them by the day they were taken and reports failures", async () => {
    api.getTripPhotos.mockResolvedValue({ photos: [] });
    api.addTripPhoto.mockResolvedValue({ photos: [photo("new")] });
    prep.preparePhoto.mockImplementation(async (file) => {
      if (file.name === "bad.heic") throw new Error("This photo format isn't supported here.");
      return { photo: new Blob(["p"]), thumbnail: new Blob(["t"]) };
    });
    renderPanel();
    await screen.findByText("No photos yet");

    const onDay2 = new File(["x"], "kyoto.jpg", { type: "image/jpeg", lastModified: new Date(2030, 3, 2, 15).getTime() });
    const bad = new File(["x"], "bad.heic", { type: "image/heic" });
    fireEvent.change(screen.getByLabelText("Choose photos"), { target: { files: [onDay2, bad] } });

    expect(await screen.findByText("One photo couldn't be added")).toBeInTheDocument();
    expect(screen.getByText(/bad\.heic: This photo format/)).toBeInTheDocument();
    expect(api.addTripPhoto).toHaveBeenCalledTimes(1);
    expect(api.addTripPhoto.mock.calls[0][2]).toBe(2);
  });
});
