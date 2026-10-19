export type Status = "planned" | "in progress" | "completed" | "skipped";
export type Task = {
  id: string;
  title: string;
  description: string;
  project: string;
  category: string;
  priority: number;
  minutes: number;
  actualMinutes: number;
  original: string;
  scheduled: string;
  deadline: string;
  status: Status;
  completed: string;
  milestone: string;
  dependencies: string[];
  critical: boolean;
  revenue: boolean;
  notes: string;
  recurrence: "none" | "weekly";
  parent?: string;
};
export type Milestone = {
  id: string;
  name: string;
  target: string;
  dependencies: string[];
};
export type Assumption = {
  enabled: boolean;
  price: number;
  fees: number;
  costs: number;
  visits: number;
  conversion: number;
  monthlyOrders: number;
  growth: number;
  clickRate: number;
  contentVisits: number;
  confidence: string;
  source: string;
  evidence?: Record<string, { confidence: string; source: string }>;
};
export type State = {
  version: 1;
  tasks: Task[];
  milestones: Milestone[];
  start: string;
  timezone: string;
  currency: string;
  workdays: number[];
  capacity: number;
  dayCapacity: Record<string, number>;
  ideas: { id: string; text: string }[];
  logs: { date: string; text: string }[];
  sales: { id: string; date: string; orders: number; contribution: number }[];
  scenarios: Record<string, Assumption>;
  active: string[];
};
export const projects = [
  "Digital Arts",
  "Motherhood Poetry",
  "Pinterest",
  "Business Review",
];
export const uid = () => crypto.randomUUID();
export const today = (zone = "Europe/Berlin") =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const addDays = (s: string, n: number) => {
  const d = new Date(s + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const days = (a: string, b: string) =>
  Math.round(
    (Date.parse(b + "T12:00Z") - Date.parse(a + "T12:00Z")) / 86400000,
  );
export const weekday = (s: string) => new Date(s + "T12:00Z").getUTCDay();
export function workingDate(s: string, workdays: number[]) {
  if (!workdays.length) throw Error("Select at least one workday");
  while (!workdays.includes(weekday(s))) s = addDays(s, 1);
  return s;
}
export function workingDays(a: string, b: string, w: number[]) {
  let n = 0;
  for (let d = addDays(a, 1); d <= b; d = addDays(d, 1))
    if (w.includes(weekday(d))) n++;
  return n;
}
export function forecasts(state: State, now = today(state.timezone)) {
  const cache = new Map<string, string>();
  const visiting = new Set<string>();
  const end = (id: string): string => {
    if (cache.has(id)) return cache.get(id)!;
    if (visiting.has(id)) throw Error("Task dependency cycle");
    const t = state.tasks.find((t) => t.id === id);
    if (!t) throw Error("Missing dependency");
    visiting.add(id);
    let date =
      t.status === "completed"
        ? t.completed
        : t.status === "skipped"
          ? t.original
          : [t.scheduled, now, ...t.dependencies.map((d) => addDays(end(d), 1))]
              .sort()
              .at(-1)!;
    if (t.status !== "completed" && t.status !== "skipped") {
      date = workingDate(date, state.workdays);
      let remaining = t.minutes;
      while (remaining > (state.dayCapacity[date] ?? state.capacity)) {
        remaining -= state.dayCapacity[date] ?? state.capacity;
        date = workingDate(addDays(date, 1), state.workdays);
      }
    }
    visiting.delete(id);
    cache.set(id, date);
    return date;
  };
  state.tasks.forEach((t) => end(t.id));
  const mc = new Map<string, string>();
  const mv = new Set<string>();
  const milestoneEnd = (id: string): string => {
    if (mc.has(id)) return mc.get(id)!;
    if (mv.has(id)) throw Error("Milestone dependency cycle");
    mv.add(id);
    const m = state.milestones.find((m) => m.id === id)!;
    const dates = state.tasks
      .filter((t) => t.milestone === id)
      .map((t) => end(t.id));
    const result = [m.target, ...dates, ...m.dependencies.map(milestoneEnd)]
      .sort()
      .at(-1)!;
    mc.set(id, result);
    mv.delete(id);
    return result;
  };
  return state.milestones.map((m) => {
    const linked = state.tasks.filter((t) => t.milestone === m.id);
    const forecast = milestoneEnd(m.id);
    return {
      ...m,
      forecast,
      delay: Math.max(0, days(m.target, forecast)),
      workDelay: workingDays(m.target, forecast, state.workdays),
      progress: linked.length
        ? linked.filter((t) => t.status === "completed").length / linked.length
        : 0,
      actual:
        linked.length && linked.every((t) => t.status === "completed")
          ? linked
              .map((t) => t.completed)
              .sort()
              .at(-1)
          : undefined,
    };
  });
}
export const net = (a: Assumption) => Math.max(0, a.price - a.fees - a.costs);
export const daily = (a: Assumption) =>
  a.enabled ? ((a.visits * a.conversion) / 100) * net(a) : 0;
export function exposure(s: State, now = today(s.timezone)) {
  const launch = forecasts(s, now).find((m) => m.id === "launch");
  return Object.entries(s.scenarios).map(([name, a]) => ({
    name,
    launch: (launch?.delay ?? 0) * daily(a),
    content: a.enabled
      ? ((s.tasks.filter(
          (t) =>
            t.category === "Content" &&
            t.scheduled < now &&
            t.status !== "completed" &&
            t.status !== "skipped",
        ).length *
          a.contentVisits *
          a.conversion) /
          100) *
        net(a)
      : 0,
  }));
}
export function suggestions(s: State, date: string, capacity: number) {
  const eligible = s.tasks
    .filter(
      (t) =>
        t.status !== "completed" &&
        t.status !== "skipped" &&
        t.scheduled <= date &&
        s.active.includes(t.project) &&
        t.dependencies.every((id) =>
          s.tasks.some(
            (d) =>
              d.id === id &&
              (d.status === "completed" || d.status === "skipped"),
          ),
        ),
    )
    .sort(
      (a, b) =>
        (a.deadline || "9999").localeCompare(b.deadline || "9999") ||
        Number(b.critical) - Number(a.critical) ||
        Number(b.revenue) - Number(a.revenue) ||
        b.priority - a.priority ||
        a.minutes - b.minutes,
    );
  const picked: Task[] = [];
  let left = capacity;
  for (const t of eligible)
    if (t.minutes <= left && picked.length < 3) {
      picked.push(t);
      left -= t.minutes;
    }
  return picked;
}
export function complete(s: State, id: string, date: string): State {
  const task = s.tasks.find((t) => t.id === id)!;
  const reopening = task.status === "completed";
  let tasks = s.tasks.map((t) =>
    t.id === id
      ? {
          ...t,
          status: (reopening ? "planned" : "completed") as Status,
          completed: reopening ? "" : date,
        }
      : t,
  );
  if (
    !reopening &&
    task.recurrence === "weekly" &&
    !tasks.some((t) => t.parent === id)
  ) {
    const next = addDays(task.scheduled, 7);
    tasks = [
      ...tasks,
      {
        ...task,
        id: uid(),
        parent: id,
        scheduled: next,
        original: next,
        status: "planned",
        completed: "",
        dependencies: [],
        actualMinutes: 0,
      },
    ];
  }
  return { ...s, tasks };
}
export function seed(start = "2026-11-01"): State {
  const milestones: Milestone[] = [
    {
      id: "launch",
      name: "First two Etsy listings live",
      target: addDays(start, 30),
      dependencies: [],
    },
    {
      id: "poetry",
      name: "First three carousels published",
      target: addDays(start, 38),
      dependencies: [],
    },
    {
      id: "pinterest",
      name: "Pinterest launch",
      target: addDays(start, 70),
      dependencies: ["launch"],
    },
    {
      id: "review",
      name: "Six-month business review",
      target: "2027-04-30",
      dependencies: [],
    },
  ];
  const groups = [
    [
      "Create original Letters to My Child journal",
      "Export and quality-check journal PDFs",
      "Create journal listing images",
      "Write journal Etsy listing",
      "Create original Christmas activity cards",
      "Export and quality-check card PDFs",
      "Create Christmas listing images",
      "Write Christmas Etsy listing",
      "Check commercial licenses and Etsy requirements",
      "Complete shop setup",
      "Publish first two Etsy listings",
    ],
    [
      "Finalize Instagram profile",
      "Create first carousel template",
      "Write carousel: The Nights Were So Long",
      "Publish first carousel",
      "Write carousel: An Ordinary Tuesday",
      "Publish second carousel",
      "Write carousel: What Children Remember",
      "Publish third carousel",
      "Create weekly poetry carousels",
      "Review content results weekly",
    ],
    [
      "Create Pinterest business account",
      "Design one reusable pin template",
      "Create pins for existing Etsy products",
      "Begin publishing after Etsy listings are live",
    ],
    [
      "Weekly 15-minute progress review",
      "Monthly review of visits, conversion, sales and Instagram",
      "Product improvement based on real feedback",
    ],
  ];
  let date = start;
  const tasks: Task[] = [];
  groups.forEach((titles, g) => {
    let previous = "";
    titles.forEach((title, i) => {
      date = workingDate(date, [1, 2, 3, 4, 5]);
      const id = uid();
      tasks.push({
        id,
        title,
        description:
          "Editable starter task. Reduce the scope to a useful next action when needed.",
        project: projects[g],
        category:
          g === 1 || g === 2
            ? /^(Publish|Begin publishing|Create weekly)/.test(title)
              ? "Content"
              : title === "Review content results weekly"
                ? "Review"
                : "Preparation"
            : g === 3
              ? "Review"
              : "Product",
        priority: i === 0 ? 3 : 2,
        minutes: g === 3 ? 15 : 60,
        actualMinutes: 0,
        original: date,
        scheduled: date,
        deadline: "",
        status: "planned",
        completed: "",
        milestone: g === 1 && i >= 8 ? "review" : milestones[g].id,
        dependencies: previous
          ? [previous]
          : g === 2
            ? [
                tasks.find(
                  (t) => t.title === "Publish first two Etsy listings",
                )!.id,
              ]
            : [],
        critical: g === 0,
        revenue: g === 0,
        notes: "",
        recurrence:
          title.startsWith("Weekly") ||
          title.startsWith("Create weekly") ||
          title === "Review content results weekly"
            ? "weekly"
            : "none",
      });
      previous = id;
      date = addDays(date, 1);
    });
  });
  const a: Assumption = {
    enabled: false,
    price: 0,
    fees: 0,
    costs: 0,
    visits: 0,
    conversion: 0,
    monthlyOrders: 0,
    growth: 0,
    clickRate: 0,
    contentVisits: 0,
    confidence: "Low",
    source: "",
    evidence: {},
  };
  return {
    version: 1,
    tasks,
    milestones,
    start,
    timezone: "Europe/Berlin",
    currency: "EUR",
    workdays: [1, 2, 3, 4, 5],
    capacity: 90,
    dayCapacity: {},
    ideas: [],
    logs: [],
    sales: [],
    scenarios: { Conservative: { ...a }, Base: { ...a }, Optimistic: { ...a } },
    active: projects.slice(0, 2),
  };
}
const validDate = (v: unknown) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v + "T12:00Z")) &&
  new Date(v + "T12:00Z").toISOString().slice(0, 10) === v;
export function parseBackup(raw: string): State {
  const s = JSON.parse(raw) as State;
  const fail = () => {
    throw Error("Invalid backup. Your current data has not been changed.");
  };
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.tasks) ||
    !Array.isArray(s.milestones) ||
    !validDate(s.start) ||
    !Array.isArray(s.workdays) ||
    !s.workdays.length ||
    s.workdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
    !Number.isFinite(s.capacity) ||
    s.capacity < 1 ||
    s.capacity > 1440 ||
    s.tasks.length > 5000 ||
    !s.dayCapacity ||
    !Array.isArray(s.ideas) ||
    !Array.isArray(s.logs) ||
    !Array.isArray(s.sales) ||
    !Array.isArray(s.active) ||
    s.active.some((p) => !projects.includes(p))
  )
    fail();
  try {
    new Intl.DateTimeFormat("en", { timeZone: s.timezone });
    new Intl.NumberFormat("en", { style: "currency", currency: s.currency });
  } catch {
    fail();
  }
  const ids = new Set(s.tasks.map((t) => t.id));
  const mids = new Set(s.milestones.map((m) => m.id));
  if (
    !mids.has("launch") ||
    ids.size !== s.tasks.length ||
    mids.size !== s.milestones.length
  )
    fail();
  for (const m of s.milestones)
    if (
      typeof m.id !== "string" ||
      typeof m.name !== "string" ||
      !validDate(m.target) ||
      !Array.isArray(m.dependencies) ||
      m.dependencies.some((id) => !mids.has(id))
    )
      fail();
  for (const t of s.tasks)
    if (
      !t ||
      typeof t.id !== "string" ||
      !t.id ||
      [
        "title",
        "description",
        "category",
        "notes",
        "completed",
        "deadline",
      ].some((k) => typeof t[k as keyof Task] !== "string") ||
      !projects.includes(t.project) ||
      !validDate(t.original) ||
      !validDate(t.scheduled) ||
      (t.deadline && !validDate(t.deadline)) ||
      (t.completed && !validDate(t.completed)) ||
      (t.status === "completed" && !validDate(t.completed)) ||
      !["planned", "in progress", "completed", "skipped"].includes(t.status) ||
      !["none", "weekly"].includes(t.recurrence) ||
      !Number.isFinite(t.minutes) ||
      t.minutes < 1 ||
      t.minutes > 525600 ||
      !Number.isFinite(t.actualMinutes) ||
      t.actualMinutes < 0 ||
      !Number.isFinite(t.priority) ||
      !mids.has(t.milestone) ||
      typeof t.critical !== "boolean" ||
      typeof t.revenue !== "boolean" ||
      !Array.isArray(t.dependencies) ||
      t.dependencies.some((id) => !ids.has(id) || id === t.id)
    )
      fail();
  for (const [d, n] of Object.entries(s.dayCapacity))
    if (!validDate(d) || !Number.isFinite(n) || n < 1 || n > 1440) fail();
  for (const i of s.ideas)
    if (typeof i.id !== "string" || typeof i.text !== "string") fail();
  for (const l of s.logs)
    if (!validDate(l.date) || typeof l.text !== "string") fail();
  for (const sale of s.sales)
    if (
      typeof sale.id !== "string" ||
      !validDate(sale.date) ||
      !Number.isInteger(sale.orders) ||
      sale.orders < 0 ||
      !Number.isFinite(sale.contribution)
    )
      fail();
  for (const name of ["Conservative", "Base", "Optimistic"]) {
    const a = s.scenarios?.[name];
    if (
      !a ||
      typeof a.enabled !== "boolean" ||
      !["Low", "Medium", "High"].includes(a.confidence) ||
      typeof a.source !== "string" ||
      [
        "price",
        "fees",
        "costs",
        "visits",
        "conversion",
        "monthlyOrders",
        "growth",
        "clickRate",
        "contentVisits",
      ].some(
        (k) =>
          typeof a[k as keyof Assumption] !== "number" ||
          !Number.isFinite(a[k as keyof Assumption]) ||
          Number(a[k as keyof Assumption]) < 0,
      ) ||
      a.conversion > 100 ||
      a.clickRate > 100
    )
      fail();
  }
  for (const a of Object.values(s.scenarios))
    if (a.evidence) {
      if (typeof a.evidence !== "object" || Array.isArray(a.evidence)) fail();
      for (const e of Object.values(a.evidence))
        if (
          !e ||
          !["Low", "Medium", "High"].includes(e.confidence) ||
          typeof e.source !== "string"
        )
          fail();
    }
  forecasts(s, s.start);
  return s;
}
export const storageKey = "lily-dashboard-v1";
export function persist(
  s: State,
  storage: Pick<Storage, "setItem"> = localStorage,
) {
  storage.setItem(storageKey, JSON.stringify(s));
}
