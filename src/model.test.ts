import { describe, it, expect } from "vitest";
import {
  seed,
  forecasts,
  addDays,
  workingDays,
  complete,
  parseBackup,
  persist,
  storageKey,
  exposure,
  suggestions,
  today,
  type State,
  type Task,
} from "./model";
const fixture = () => {
  const s = seed();
  s.tasks = [];
  s.milestones = [
    { id: "launch", name: "Launch", target: "2026-11-06", dependencies: [] },
    { id: "other", name: "Other", target: "2026-11-20", dependencies: [] },
  ];
  return s;
};
const task = (id: string, changes: Partial<Task> = {}): Task => ({
  id,
  title: id,
  description: "",
  project: "Digital Arts",
  category: "Product",
  priority: 2,
  minutes: 60,
  actualMinutes: 0,
  original: "2026-11-02",
  scheduled: "2026-11-02",
  deadline: "",
  status: "planned",
  completed: "",
  milestone: "launch",
  dependencies: [],
  critical: true,
  revenue: true,
  notes: "",
  recurrence: "none",
  ...changes,
});
describe("calendar and forecasts", () => {
  it("adds calendar dates across DST and year boundaries", () => {
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(today("Europe/Berlin")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("moves weekend work to configured workdays", () => {
    const s = fixture();
    s.tasks = [task("a", { scheduled: "2026-11-07" })];
    expect(forecasts(s, "2026-11-01")[0].forecast).toBe("2026-11-09");
    s.workdays = [0, 6];
    expect(forecasts(s, "2026-11-01")[0].forecast).toBe("2026-11-07");
  });
  it("propagates a prerequisite delay through the critical path", () => {
    const s = fixture();
    s.tasks = [
      task("a", { scheduled: "2026-11-06" }),
      task("b", { dependencies: ["a"] }),
    ];
    const m = forecasts(s, "2026-11-01")[0];
    expect(m.forecast).toBe("2026-11-09");
    expect(m.delay).toBe(3);
    expect(m.workDelay).toBe(1);
  });
  it("does not delay launch for an unrelated non-critical task", () => {
    const s = fixture();
    s.tasks = [
      task("a"),
      task("b", {
        scheduled: "2026-12-01",
        milestone: "other",
        critical: false,
      }),
    ];
    expect(forecasts(s, "2026-11-01")[0].delay).toBe(0);
  });
  it("counts overlapping delays once and calculates honest zero exposure", () => {
    const s = fixture();
    s.tasks = [
      task("a", { scheduled: "2026-11-10" }),
      task("b", { scheduled: "2026-11-10" }),
    ];
    expect(forecasts(s, "2026-11-01")[0].delay).toBe(4);
    expect(exposure(s, "2026-11-01").every((e) => e.launch === 0)).toBe(true);
    s.scenarios.Base = {
      ...s.scenarios.Base,
      enabled: true,
      price: 12,
      fees: 1,
      costs: 1,
      visits: 100,
      conversion: 2,
    };
    expect(
      exposure(s, "2026-11-01").find((e) => e.name === "Base")?.launch,
    ).toBe(80);
    expect(
      exposure(s, "2026-11-01").find((e) => e.name === "Conservative")?.launch,
    ).toBe(0);
  });
  it("rolls unfinished past work forward and honours multi-day duration", () => {
    const s = fixture();
    s.tasks = [task("a", { minutes: 180 })];
    expect(forecasts(s, "2026-11-06")[0].forecast).toBe("2026-11-09");
    expect(workingDays("2026-11-06", "2026-11-09", s.workdays)).toBe(1);
  });
  it("propagates milestone dependencies without summing overlapping windows", () => {
    const s = fixture();
    s.milestones[1].dependencies = ["launch"];
    s.tasks = [task("a", { scheduled: "2026-12-01" })];
    expect(forecasts(s, "2026-11-01")[1].forecast).toBe("2026-12-01");
  });
});
describe("task transitions and planning", () => {
  it("creates weekly recurrence once and supports reopening", () => {
    let s = fixture();
    s.tasks = [task("a", { recurrence: "weekly" })];
    s = complete(s, "a", "2026-11-02");
    expect(s.tasks).toHaveLength(2);
    expect(s.tasks[1].scheduled).toBe("2026-11-09");
    expect(s.tasks[0].completed).toBe("2026-11-02");
    s = complete(s, "a", "2026-11-03");
    expect(s.tasks[0].status).toBe("planned");
    expect(s.tasks[0].completed).toBe("");
    s = complete(s, "a", "2026-11-03");
    expect(s.tasks).toHaveLength(2);
  });
  it("limits priorities and time and excludes blocked tasks without moving dates", () => {
    const s = fixture();
    s.tasks = [
      task("a", { minutes: 15 }),
      task("b", { minutes: 15 }),
      task("c", { minutes: 15 }),
      task("d", { minutes: 15 }),
      task("e", { minutes: 15, dependencies: ["a"] }),
    ];
    const original = JSON.stringify(s);
    expect(suggestions(s, "2026-11-02", 90)).toHaveLength(3);
    expect(suggestions(s, "2026-11-02", 30)).toHaveLength(2);
    expect(suggestions(s, "2026-11-02", 90).some((t) => t.id === "e")).toBe(
      false,
    );
    expect(JSON.stringify(s)).toBe(original);
  });
  it("seeds no more than 90 minutes on any one day", () => {
    const s = seed();
    const dates = [...new Set(s.tasks.map((t) => t.scheduled))];
    expect(
      dates.every(
        (d) =>
          s.tasks
            .filter((t) => t.scheduled === d)
            .reduce((a, t) => a + t.minutes, 0) <= 90,
      ),
    ).toBe(true);
  });
});
describe("backup validation and storage", () => {
  it("round-trips all data and persists using the versioned storage key", () => {
    const s = seed();
    let saved = "";
    persist(s, {
      setItem: (key, value) => {
        expect(key).toBe(storageKey);
        saved = value;
      },
    });
    expect(parseBackup(saved)).toEqual(s);
  });
  it("rejects malformed, unsupported, cyclic and dangling backups", () => {
    expect(() => parseBackup("{}")).toThrow();
    expect(() => parseBackup("no")).toThrow();
    const s = fixture();
    s.tasks = [task("a", { dependencies: ["missing"] })];
    expect(() => parseBackup(JSON.stringify(s))).toThrow();
    s.tasks = [
      task("a", { dependencies: ["b"] }),
      task("b", { dependencies: ["a"] }),
    ];
    expect(() => parseBackup(JSON.stringify(s))).toThrow();
    s.tasks = [task("a", { scheduled: "2026-02-30" })];
    expect(() => parseBackup(JSON.stringify(s))).toThrow();
  });
  it("rejects unsafe capacity, percent and unsupported timezone", () => {
    for (const mutate of [
      (s: State) => (s.capacity = 0),
      (s: State) => (s.workdays = []),
      (s: State) => (s.scenarios.Base.conversion = 200),
      (s: State) => (s.timezone = "invalid"),
    ]) {
      const s = seed();
      mutate(s);
      expect(() => parseBackup(JSON.stringify(s))).toThrow();
    }
  });
});
describe("scenario boundaries", () => {
  it("keeps content opportunity separate from launch and ignores preparation", () => {
    const s = fixture();
    s.tasks = [
      task("write", { category: "Preparation" }),
      task("publish", { category: "Content" }),
    ];
    s.scenarios.Base = {
      ...s.scenarios.Base,
      enabled: true,
      contentVisits: 100,
      conversion: 2,
      price: 10,
    };
    const b = exposure(s, "2026-11-04").find((e) => e.name === "Base")!;
    expect(b.content).toBe(20);
    expect(b.launch).toBe(0);
    s.scenarios.Base.enabled = false;
    expect(
      exposure(s, "2026-11-04").find((e) => e.name === "Base")?.content,
    ).toBe(0);
  });
  it("preserves per-assumption confidence and rejects invalid evidence", () => {
    const s = seed();
    s.scenarios.Base.evidence = {
      visits: { confidence: "Low", source: "No observations yet" },
    };
    expect(
      parseBackup(JSON.stringify(s)).scenarios.Base.evidence?.visits.source,
    ).toBe("No observations yet");
    s.scenarios.Base.evidence.visits.confidence = "Certain";
    expect(() => parseBackup(JSON.stringify(s))).toThrow();
  });
  it("can remove scope without permanently blocking dependent work", () => {
    const s = fixture();
    s.tasks = [
      task("a", { status: "skipped" }),
      task("b", { dependencies: ["a"] }),
    ];
    expect(suggestions(s, "2026-11-02", 90).map((t) => t.id)).toEqual(["b"]);
  });
});
describe("milestone scope and slack", () => {
  it("does not shift a milestone when a rescheduled task still fits its slack", () => {
    const s = fixture();
    s.tasks = [task("a", { scheduled: "2026-11-05", critical: false })];
    expect(forecasts(s, "2026-11-01")[0].delay).toBe(0);
  });
  it("keeps recurring work out of the finite three-carousel milestone", () => {
    const s = seed();
    expect(
      s.tasks
        .filter((t) => t.milestone === "poetry")
        .every((t) => t.recurrence === "none"),
    ).toBe(true);
  });
  it("rejects backups without the required launch milestone", () => {
    const s = fixture();
    s.milestones = [];
    expect(() => parseBackup(JSON.stringify(s))).toThrow();
  });
});
