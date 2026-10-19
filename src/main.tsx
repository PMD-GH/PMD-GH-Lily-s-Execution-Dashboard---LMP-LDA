import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Sun,
  CheckSquare,
  Flag,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Settings,
  ArrowUpRight,
  Plus,
  ChevronRight,
  Download,
  Upload,
  Menu,
  Leaf,
  Clock,
  Check,
  ArrowRight,
  X,
} from "lucide-react";
import {
  seed,
  today,
  uid,
  addDays,
  days,
  forecasts,
  suggestions,
  complete,
  exposure,
  net,
  daily,
  parseBackup,
  persist,
  storageKey,
  projects,
  type State,
  type Task,
  type Assumption,
} from "./model";
import "./style.css";
import {
  Progress,
  Assumptions,
  Sales,
  TaskEditor,
  DayCapacity,
} from "./components";
const pages = [
  "Today",
  "Tasks",
  "Milestones",
  "Revenue Impact",
  "Progress",
  "Idea Parking Lot",
  "Settings",
];
const icons = [
  Sun,
  CheckSquare,
  Flag,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Settings,
];
function App() {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return { data: raw ? parseBackup(raw) : seed(), error: "", fresh: !raw };
    } catch {
      return {
        data: seed(),
        error:
          "Stored data could not be read. Automatic saving is paused. Import a valid backup before continuing.",
        fresh: false,
      };
    }
  });
  const [loadError, setLoadError] = useState(initial.error);
  const [s, setS] = useState<State>(initial.data);
  const [page, setPage] = useState("Today");
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [plan, setPlan] = useState<string[] | null>(null);
  const [idea, setIdea] = useState("");
  const [scenario, setScenario] = useState("Base");
  const [newUser, setNewUser] = useState(initial.fresh);
  useEffect(() => {
    if (loadError) return;
    try {
      persist(s);
    } catch {
      setNotice(
        "Storage is unavailable or full. Export a backup to keep your changes.",
      );
    }
  }, [s, loadError]);
  const now = today(s.timezone),
    capacity = s.dayCapacity[now] ?? s.capacity;
  const milestones = forecasts(s, now);
  const launch = milestones.find((m) => m.id === "launch")!;
  const due = s.tasks.filter(
    (t) =>
      t.scheduled <= now &&
      t.status !== "skipped" &&
      (t.status !== "completed" || t.scheduled === now),
  );
  const recommended = suggestions(s, now, capacity);
  const primary = plan
    ? s.tasks.filter((t) => plan.includes(t.id))
    : recommended;
  const dueToday = s.tasks.filter((t) => t.scheduled === now);
  const percent = (ts: Task[]) =>
    ts.length
      ? Math.round(
          (ts.filter((t) => t.status === "completed").length / ts.length) * 100,
        )
      : 0;
  const weekStart = addDays(
    now,
    -((new Date(now + "T12:00Z").getUTCDay() + 6) % 7),
  );
  const week = s.tasks.filter(
    (t) => t.scheduled >= weekStart && t.scheduled <= addDays(weekStart, 6),
  );
  const overdue = due.filter(
    (t) => t.scheduled < now && t.status !== "completed",
  );
  const plannedMinutes = due
    .filter((t) => t.status !== "completed")
    .reduce((a, t) => a + t.minutes, 0);
  const exp = exposure(s, now);
  const money = (n: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: s.currency,
    }).format(n);
  const date = (d: string) =>
    new Date(d + "T12:00Z").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  const log = (text: string) => ({ date: now, text });
  function saveTask(t: Task) {
    try {
      const old = s.tasks.find((x) => x.id === t.id);
      if (
        t.status === "completed" &&
        t.dependencies.some(
          (id) =>
            !["completed", "skipped"].includes(
              s.tasks.find((d) => d.id === id)?.status || "",
            ),
        )
      )
        throw Error("Complete the prerequisite tasks first.");
      let next = {
        ...s,
        tasks: old
          ? s.tasks.map((x) => (x.id === t.id ? t : x))
          : [...s.tasks, t],
        logs: [
          ...s.logs,
          log(
            old && old.scheduled !== t.scheduled
              ? `Rescheduled “${t.title}” from ${old.scheduled} to ${t.scheduled}; original ${old.original}`
              : `Saved “${t.title}”`,
          ),
        ],
      };
      if (t.status === "completed" && old?.status !== "completed") {
        next = complete(
          {
            ...next,
            tasks: next.tasks.map((x) =>
              x.id === t.id ? { ...x, status: "planned" } : x,
            ),
          },
          t.id,
          now,
        );
      }
      parseBackup(JSON.stringify(next));
      setS(next);
      setEditor(null);
      setPlan(null);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function toggle(t: Task) {
    if (
      t.status !== "completed" &&
      t.dependencies.some(
        (id) =>
          !["completed", "skipped"].includes(
            s.tasks.find((d) => d.id === id)?.status || "",
          ),
      )
    ) {
      setNotice(
        "Complete the prerequisite tasks first, or edit the dependencies.",
      );
      return;
    }
    setS({
      ...complete(s, t.id, now),
      logs: [
        ...s.logs,
        log(
          `${t.status === "completed" ? "Reopened" : "Completed"} “${t.title}”`,
        ),
      ],
    });
  }
  function move(t: Task) {
    saveTask({
      ...t,
      scheduled: addDays(t.scheduled < now ? now : t.scheduled, 1),
    });
  }
  function addTask() {
    setEditor({
      id: uid(),
      title: "",
      description: "",
      project: projects[0],
      category: "Product",
      priority: 2,
      minutes: 30,
      actualMinutes: 0,
      scheduled: now,
      original: now,
      deadline: "",
      status: "planned",
      completed: "",
      milestone: "launch",
      dependencies: [],
      critical: false,
      revenue: false,
      notes: "",
      recurrence: "none",
    });
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `lily-backup-${now}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importData(file: File) {
    try {
      const next = parseBackup(await file.text());
      if (
        !confirm(
          "Replace current data with this backup? Export your current data first if you need it.",
        )
      )
        return;
      setLoadError("");
      setS(next);
      setPlan(null);
      setNotice("Backup restored successfully.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  const taskRow = (t: Task, index?: number) => (
    <div
      className={`task-row ${t.status === "completed" ? "done" : ""}`}
      key={t.id}
    >
      <button
        className="checkbox"
        aria-label={`${t.status === "completed" ? "Reopen" : "Complete"} ${t.title}`}
        onClick={() => toggle(t)}
      >
        {t.status === "completed" && <Check size={14} />}
      </button>
      <div className="task-content">
        <button className="task-title" onClick={() => setEditor({ ...t })}>
          {t.title}
        </button>
        <div className="task-meta">
          <span
            className={t.project === "Digital Arts" ? "tag blush" : "tag sage"}
          >
            {t.project}
          </span>
          <span>
            <Clock size={12} />
            {t.minutes} min
          </span>
          {t.critical && <span className="critical">Critical path</span>}
          {t.scheduled < now && t.status !== "completed" && (
            <span>Overdue · {date(t.scheduled)}</span>
          )}
        </div>
      </div>
      {index !== undefined && <span className="rank">0{index + 1}</span>}
      <button
        className="icon-button"
        title="Postpone one calendar day"
        aria-label={`Postpone ${t.title}`}
        onClick={() => move(t)}
      >
        <ArrowRight size={16} />
      </button>
    </div>
  );
  return (
    <div className="app">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("Today");
          }}
        >
          lily’s<span>EXECUTION DASHBOARD</span>
        </a>
        <div className="sidebar-divider" />
        <span className="eyebrow navigation-label">YOUR WORKSPACE</span>
        <nav>
          {pages.map((p, i) => {
            const Icon = icons[i];
            return (
              <button
                key={p}
                className={page === p ? "nav-link selected" : "nav-link"}
                onClick={() => {
                  setPage(p);
                  setMenu(false);
                }}
              >
                <Icon size={18} />
                {p}
                {p === "Today" && <span className="nav-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="focus-note">
            <Leaf size={21} />
            <p>
              A little progress,
              <br />
              made consistently.
            </p>
            <span>
              Build something meaningful.
              <br />
              One small step at a time.
            </span>
          </div>
          <div className="profile">
            <div className="avatar">L</div>
            <div>
              Lily’s workspace<small>Small business. Meaningful work.</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Toggle menu"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            My workspace <ChevronRight size={13} />
            <span>{page}</span>
          </div>
          <div className="topbar-right">
            <span className="saved-dot" />
            {loadError ? "Saving paused" : "Saved on this device"}
            <div className="avatar small">L</div>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "Today"
                  ? new Date(now + "T12:00Z").toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "LILY’S EXECUTION DASHBOARD"}
              </div>
              <h1>{page === "Today" ? "Make room for what matters." : page}</h1>
              <p>
                {page === "Today"
                  ? "A clear plan. A little focus. One meaningful step forward."
                  : (
                      {
                        Tasks:
                          "Small actions turn your ideas into something real.",
                        Milestones:
                          "Keep the destination in sight, and the next step manageable.",
                        "Revenue Impact":
                          "Understand the possibilities. Keep the numbers honest.",
                        Progress:
                          "Notice the work you have done. Learn what helps you move.",
                        "Idea Parking Lot":
                          "A home for good ideas that don’t need your attention today.",
                        Settings:
                          "A simple workspace, shaped around your real life.",
                      } as Record<string, string>
                    )[page]}
              </p>
            </div>
            <button className="button secondary" onClick={addTask}>
              <Plus size={16} />
              Add task
            </button>
          </div>
          {loadError && (
            <div className="alert">
              {loadError}
              <button onClick={exportData}>Export current workspace</button>
            </div>
          )}
          {notice && (
            <div className="alert" role="status">
              {notice}
              <button
                className="icon-button"
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {newUser && (
            <div className="onboarding">
              <div>
                <strong>Welcome, Lily. Let’s start small.</strong>
                <p>
                  Your editable starter plan begins {date(s.start)}{" "}
                  {s.start.slice(0, 4)}. No sales or revenue have been invented.
                </p>
              </div>
              <label>
                Planning start
                <input
                  type="date"
                  value={s.start}
                  onChange={(e) => {
                    if (e.target.value) {
                      const next = e.target.value;
                      const delta = days(s.start, next);
                      setS({
                        ...s,
                        start: next,
                        tasks: s.tasks.map((t) =>
                          t.status === "completed"
                            ? t
                            : {
                                ...t,
                                scheduled: addDays(t.scheduled, delta),
                                original: addDays(t.original, delta),
                              },
                        ),
                        milestones: s.milestones.map((m) => ({
                          ...m,
                          target: addDays(m.target, delta),
                        })),
                      });
                    }
                  }}
                />
              </label>
              <button className="button" onClick={() => setNewUser(false)}>
                Use this plan <ArrowRight size={15} />
              </button>
            </div>
          )}
          {page === "Today" && (
            <>
              <div className="overview-grid">
                <section className="stat-card">
                  <div className="stat-label">
                    <Clock size={16} />
                    YOUR TIME TODAY
                  </div>
                  <div className="stat-value">
                    <input
                      aria-label="Available minutes today"
                      type="number"
                      min="1"
                      max="1440"
                      value={capacity}
                      onChange={(e) => {
                        if (+e.target.value > 0 && +e.target.value <= 1440)
                          setS({
                            ...s,
                            dayCapacity: {
                              ...s.dayCapacity,
                              [now]: +e.target.value,
                            },
                          });
                      }}
                    />
                    <span>minutes</span>
                  </div>
                  <small>A little space for meaningful work.</small>
                </section>
                <section className="stat-card">
                  <div className="stat-label">
                    <CheckSquare size={16} />
                    TODAY’S PROGRESS
                  </div>
                  <div className="stat-value">
                    {percent(dueToday)}
                    <span>%</span>
                    <small>
                      {dueToday.filter((t) => t.status === "completed").length}{" "}
                      of {dueToday.length} tasks
                    </small>
                  </div>
                  <Progress value={percent(dueToday)} />
                </section>
                <section className="stat-card">
                  <div className="stat-label">
                    <BarChart3 size={16} />
                    THIS WEEK
                  </div>
                  <div className="stat-value">
                    {percent(week)}
                    <span>%</span>
                    <small>
                      {week.filter((t) => t.status === "completed").length} of{" "}
                      {week.length} tasks
                    </small>
                  </div>
                  <Progress value={percent(week)} />
                </section>
                <section className="stat-card exposure-stat">
                  <div className="stat-label">
                    <TrendingUp size={16} />
                    SCENARIO EXPOSURE
                  </div>
                  <div className="stat-value">
                    {money(Math.min(...exp.map((x) => x.launch)))}
                    <span>
                      – {money(Math.max(...exp.map((x) => x.launch)))}
                    </span>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => setPage("Revenue Impact")}
                  >
                    Scenario estimate, not verified loss{" "}
                    <ArrowUpRight size={13} />
                  </button>
                </section>
              </div>
              <div className="today-grid">
                <div>
                  <section className="card priorities">
                    <div className="card-heading">
                      <div>
                        <div className="eyebrow">LESS, BUT BETTER</div>
                        <h2>Today’s three priorities</h2>
                        <p>The most useful things to move forward.</p>
                      </div>
                      <span className="sun-icon">
                        <Sun size={23} />
                      </span>
                    </div>
                    <div className="plan-toolbar">
                      <span>
                        <Clock size={14} />
                        {primary.reduce((a, t) => a + t.minutes, 0)} of{" "}
                        {capacity} minutes planned
                      </span>
                      <button
                        className="button"
                        onClick={() => {
                          setPlan(recommended.map((t) => t.id));
                          setNotice(
                            "Suggested priorities selected. No task dates were changed.",
                          );
                        }}
                      >
                        Plan My Day <ArrowRight size={15} />
                      </button>
                    </div>
                    {primary.length ? (
                      primary.map(taskRow)
                    ) : (
                      <div className="empty-state">
                        <Leaf size={26} />
                        <h3>A little breathing room.</h3>
                        <p>
                          {now < s.start
                            ? "Your starter plan begins on " +
                              date(s.start) +
                              ". You can add a small task today, or adjust the start in Settings."
                            : "No unblocked tasks fit today’s time. Review your tasks or take a well-earned pause."}
                        </p>
                        <button
                          className="text-link"
                          onClick={() => setPage("Tasks")}
                        >
                          Look at the task list <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                    <div className="card-footer">
                      <Leaf size={15} />
                      <span>
                        Publishing and selling first. Everything else can wait.
                      </span>
                    </div>
                  </section>
                  <section className="card other-tasks">
                    <div className="section-title">
                      <h2>Also on your list</h2>
                      <span className="count">
                        {
                          due.filter((t) => !primary.some((p) => p.id === t.id))
                            .length
                        }
                      </span>
                      <button
                        className="text-link"
                        onClick={() => setPage("Tasks")}
                      >
                        All tasks <ArrowRight size={14} />
                      </button>
                    </div>
                    {due
                      .filter((t) => !primary.some((p) => p.id === t.id))
                      .slice(0, 5)
                      .map((t) => taskRow(t))}
                    {due.length === 0 && (
                      <p className="muted spacious">
                        No other tasks due today. Keep your focus on the next
                        useful step.
                      </p>
                    )}
                    {plannedMinutes > capacity && (
                      <div className="inline-warning">
                        {plannedMinutes - capacity} minutes over capacity.
                        Consider moving lower-priority tasks; dates only change
                        when you choose.{" "}
                        <button onClick={() => setPage("Tasks")}>
                          Review {overdue.length} overdue tasks
                        </button>
                      </div>
                    )}
                  </section>
                  <div className="quote">
                    <span>“</span>
                    <div>
                      You don’t need to do everything.
                      <br />
                      <strong>Just the next right thing.</strong>
                    </div>
                    <Leaf size={28} />
                  </div>
                </div>
                <div>
                  <section className="card milestone-card">
                    <div className="eyebrow">
                      <Flag size={14} />
                      THE NEXT BIG STEP
                    </div>
                    <h2>{launch.name}</h2>
                    <span className="tag blush">Lily’s Digital Arts</span>
                    <div className="progress-caption">
                      <span>Launch readiness</span>
                      <strong>{Math.round(launch.progress * 100)}%</strong>
                    </div>
                    <Progress value={launch.progress * 100} />
                    <div className="date-pair">
                      <div>
                        <small>Original target</small>
                        <strong>{date(launch.target)}</strong>
                      </div>
                      <ArrowRight size={15} />
                      <div>
                        <small>Current forecast</small>
                        <strong>{date(launch.forecast)}</strong>
                      </div>
                    </div>
                    <div
                      className={`schedule-badge ${launch.delay ? "delayed" : ""}`}
                    >
                      <span className="saved-dot" />
                      {launch.delay
                        ? `${launch.delay} days behind target`
                        : "On track"}
                      <small>{launch.workDelay} working days delayed</small>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => setPage("Milestones")}
                    >
                      View milestones <ArrowRight size={14} />
                    </button>
                  </section>
                  <section className="minimum-card">
                    <div className="eyebrow">
                      <Leaf size={15} />
                      LIFE HAPPENS
                    </div>
                    <h2>Only have 15 minutes?</h2>
                    <p>
                      A small step still counts. Choose one useful task and let
                      that be enough.
                    </p>
                    <button
                      className="button secondary"
                      onClick={() => {
                        const small = suggestions(s, now, 15)[0];
                        if (small) {
                          setPlan([small.id]);
                          setNotice(
                            "One small action selected. Your schedule is unchanged.",
                          );
                        } else {
                          const next = suggestions(s, now, 1440)[0];
                          if (next) {
                            setEditor({
                              ...next,
                              minutes: 15,
                              description:
                                next.description +
                                "\nReduce this to one concrete 15-minute action before saving.",
                            });
                            setNotice(
                              "Choose one smaller action in the editor. Changes apply only when you save.",
                            );
                          } else
                            setNotice(
                              "No unblocked task is due. Add one useful 15-minute action when you are ready.",
                            );
                        }
                      }}
                    >
                      Minimum Viable Day <ArrowRight size={15} />
                    </button>
                  </section>
                  <div className="local-note">
                    <span className="saved-dot" />
                    Your progress stays with you.
                    <br />
                    <span>Stored locally. Back up in Settings.</span>
                  </div>
                </div>
              </div>
            </>
          )}
          {page === "Tasks" && (
            <>
              <div className="filters">
                <input
                  placeholder="Search tasks…"
                  aria-label="Search tasks"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  aria-label="Filter project"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                >
                  <option value="">All projects</option>
                  {projects.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {["planned", "in progress", "completed", "skipped"].map(
                    (p) => (
                      <option key={p}>{p}</option>
                    ),
                  )}
                </select>
                <select
                  aria-label="Filter category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">All categories</option>
                  {[...new Set(s.tasks.map((t) => t.category))].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <input
                  type="date"
                  aria-label="Filter scheduled date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              <section className="card">
                {s.tasks
                  .filter(
                    (t) =>
                      t.title.toLowerCase().includes(query.toLowerCase()) &&
                      (!project || t.project === project) &&
                      (!status || t.status === status) &&
                      (!category || t.category === category) &&
                      (!dateFilter || t.scheduled === dateFilter),
                  )
                  .map((t) => (
                    <div key={t.id}>
                      {taskRow(t)}
                      <div className="task-extra">
                        Scheduled {t.scheduled} · Original {t.original} ·{" "}
                        {t.status}
                        {t.deadline && ` · Deadline ${t.deadline}`}
                        {t.scheduled < now &&
                          t.status !== "completed" &&
                          t.status !== "skipped" && (
                            <div className="missed">
                              <span>
                                No verified revenue loss. Possible milestone
                                delay: +
                                {milestones.find((m) => m.id === t.milestone)
                                  ?.delay ?? 0}{" "}
                                days (shared milestone forecast).
                              </span>
                              {t.milestone === "launch" && (
                                <span>
                                  Scenario-based launch exposure:{" "}
                                  {money(Math.min(...exp.map((e) => e.launch)))}
                                  –
                                  {money(Math.max(...exp.map((e) => e.launch)))}
                                  . Confidence: {s.scenarios.Base.confidence}.
                                  Shared window; do not sum per task.
                                </span>
                              )}
                              <button onClick={() => setEditor({ ...t })}>
                                Reschedule / reduce scope / replace
                              </button>
                              <button
                                onClick={() =>
                                  saveTask({ ...t, status: "skipped" })
                                }
                              >
                                Cancel task
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
              </section>
              <section className="card section-space">
                <h2>Activity log</h2>
                {s.logs.length ? (
                  s.logs
                    .slice()
                    .reverse()
                    .slice(0, 30)
                    .map((l, i) => (
                      <p className="log" key={i}>
                        <time>{l.date}</time> {l.text}
                      </p>
                    ))
                ) : (
                  <p className="muted">
                    Schedule changes and completed actions will appear here.
                  </p>
                )}
              </section>
            </>
          )}
          {page === "Milestones" && (
            <>
              <section className="card timeline">
                <div className="section-title">
                  <h2>The six-month view</h2>
                  <span className="tag sage">November 2026 – April 2027</span>
                </div>
                <div className="months">
                  {["Nov 2026", "Dec", "Jan 2027", "Feb", "Mar", "Apr"].map(
                    (m) => (
                      <span key={m}>{m}</span>
                    ),
                  )}
                </div>
                {milestones.map((m) => (
                  <div className="timeline-row" key={m.id}>
                    <span>{m.name}</span>
                    <div className="timeline-track">
                      <div
                        style={{
                          left: `${Math.max(0, Math.min(95, (days("2026-11-01", m.target) / 181) * 100))}%`,
                        }}
                        title={m.target}
                      >
                        ◆
                      </div>
                    </div>
                  </div>
                ))}
              </section>
              <div className="two-col section-space">
                {milestones.map((m) => (
                  <section className="card milestone-detail" key={m.id}>
                    <div className="eyebrow">
                      {m.actual
                        ? "COMPLETED"
                        : m.delay
                          ? "FORECAST DELAY"
                          : "ON TRACK"}
                    </div>
                    <h2>{m.name}</h2>
                    <Progress value={m.progress * 100} />
                    <p>
                      {Math.round(m.progress * 100)}% complete · {m.delay}{" "}
                      calendar / {m.workDelay} working days delayed
                    </p>
                    <label>
                      Original target
                      <input
                        type="date"
                        value={m.target}
                        onChange={(e) => {
                          if (e.target.value)
                            setS({
                              ...s,
                              milestones: s.milestones.map((x) =>
                                x.id === m.id
                                  ? { ...x, target: e.target.value }
                                  : x,
                              ),
                            });
                        }}
                      />
                    </label>
                    <p>
                      Forecast: {m.forecast}
                      <br />
                      Actual: {m.actual || "Not completed"}
                    </p>
                    <small>
                      Depends on:{" "}
                      {m.dependencies
                        .map(
                          (id) => s.milestones.find((x) => x.id === id)?.name,
                        )
                        .join(", ") || "No earlier milestone"}
                    </small>
                    <details>
                      <summary>Linked tasks</summary>
                      {s.tasks
                        .filter((t) => t.milestone === m.id)
                        .map((t) => (
                          <p key={t.id}>
                            <button
                              className="text-link"
                              onClick={() => setEditor({ ...t })}
                            >
                              {t.status === "completed" ? "✓" : "○"} {t.title}
                            </button>
                          </p>
                        ))}
                    </details>
                  </section>
                ))}
              </div>
              <p className="muted">
                Forecast is the earliest feasible finish based on task dates and
                dependencies. Shared daily capacity across separate tasks is
                checked on Today; forecasts are not a resource-levelled project
                schedule.
              </p>
            </>
          )}
          {page === "Revenue Impact" && (
            <>
              <div className="notice-card">
                <Leaf size={20} />
                <div>
                  <strong>No verified revenue loss</strong>
                  <p>
                    Scenarios describe possibilities, not money you definitely
                    lost. All assumptions start at zero and are excluded until
                    enabled.
                  </p>
                </div>
              </div>
              <div className="two-col section-space">
                <section className="card padded">
                  <div className="eyebrow">
                    HYPOTHETICAL · NOT ACTUAL RESULTS
                  </div>
                  <h2>Launch-delay exposure</h2>
                  <div className="big-number">
                    {money(Math.min(...exp.map((e) => e.launch)))} –{" "}
                    {money(Math.max(...exp.map((e) => e.launch)))}
                  </div>
                  <p>
                    Possible milestone delay: +{launch.delay} days (
                    {launch.workDelay} working days).
                  </p>
                  {exp.map((e) => (
                    <p key={e.name}>
                      {e.name}: {money(e.launch)} · Confidence:{" "}
                      {s.scenarios[e.name].confidence}
                    </p>
                  ))}
                  <details>
                    <summary>How this was calculated</summary>
                    <p>
                      Daily contribution = shop visits/day × conversion rate ÷
                      100 × max(0, selling price − fees − variable costs).
                    </p>
                    <p>
                      Launch exposure = daily contribution × calendar days
                      between original launch target and forecast. Only one
                      launch window is counted, so overlapping task delays are
                      not added together. Working days affect forecasts; shop
                      sales may happen every calendar day.
                    </p>
                    <p>
                      Forecasts propagate dependency finish dates; unrelated
                      tasks do not delay launch. Skipped tasks are treated as
                      scope removed and satisfy dependencies without implying
                      completed work.
                    </p>
                  </details>
                </section>
                <section className="card padded">
                  <div className="eyebrow">
                    HYPOTHETICAL · TRACKED SEPARATELY
                  </div>
                  <h2>Content opportunity</h2>
                  {exp.map((e) => (
                    <p key={e.name}>
                      {e.name}: {money(e.content)}
                    </p>
                  ))}
                  <p>
                    Delayed exposure from overdue, unpublished content.
                    Potentially forgone exposure is unknown: publishing later
                    may recover visits. These values are never added to launch
                    exposure.
                  </p>
                  <details>
                    <summary>How this was calculated</summary>
                    <p>
                      Overdue content tasks × expected visits per content item ×
                      conversion rate ÷ 100 × net contribution per order.
                      Includes Content-category tasks only; review tasks are
                      excluded. Only publication tasks should use the Content
                      category; preparation and writing use Preparation. One
                      overdue publication represents one content opportunity.
                    </p>
                  </details>
                </section>
              </div>
              <section className="card padded section-space">
                <div className="section-title">
                  <h2>Business assumptions</h2>
                  <select
                    aria-label="Scenario"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                  >
                    {Object.keys(s.scenarios).map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <Assumptions
                  value={s.scenarios[scenario]}
                  update={(a) =>
                    setS({ ...s, scenarios: { ...s.scenarios, [scenario]: a } })
                  }
                />
                <p>
                  Net contribution per sale:{" "}
                  <strong>{money(net(s.scenarios[scenario]))}</strong> · Daily
                  scenario contribution:{" "}
                  <strong>{money(daily(s.scenarios[scenario]))}</strong>
                </p>
                <p className="muted">
                  Monthly orders, growth and click rate are reference
                  assumptions only; they are not multiplied into the exposure
                  formula.
                </p>
              </section>
              <Sales s={s} setS={setS} now={now} money={money} />
            </>
          )}
          {page === "Progress" && (
            <>
              <div className="two-col">
                <section className="card padded">
                  <h2>Tasks completed by week</h2>
                  {Array.from({ length: 6 }, (_, i) => {
                    const start = addDays(weekStart, (i - 5) * 7);
                    const count = s.tasks.filter(
                      (t) =>
                        t.status === "completed" &&
                        t.completed >= start &&
                        t.completed <= addDays(start, 6),
                    ).length;
                    return (
                      <div className="chart-row" key={start}>
                        <span>{date(start)}</span>
                        <Progress value={Math.min(100, (count / 7) * 100)} />
                        <strong>{count}</strong>
                      </div>
                    );
                  })}
                </section>
                <section className="card padded">
                  <h2>Planned vs actual work</h2>
                  {projects.map((p) => {
                    const tasks = s.tasks.filter((t) => t.project === p);
                    return (
                      <div key={p} className="chart-project">
                        <strong>{p}</strong>
                        <div className="chart-row">
                          <span>Planned</span>
                          <Progress
                            value={Math.min(
                              100,
                              (tasks.reduce((a, t) => a + t.minutes, 0) /
                                1200) *
                                100,
                            )}
                          />
                          <small>
                            {tasks.reduce((a, t) => a + t.minutes, 0)}m
                          </small>
                        </div>
                        <div className="chart-row">
                          <span>Actual</span>
                          <Progress
                            value={Math.min(
                              100,
                              (tasks.reduce((a, t) => a + t.actualMinutes, 0) /
                                1200) *
                                100,
                            )}
                          />
                          <small>
                            {tasks.reduce((a, t) => a + t.actualMinutes, 0)}m
                          </small>
                        </div>
                      </div>
                    );
                  })}
                  <small>
                    Actual time is recorded manually in the task editor.
                  </small>
                </section>
                <section className="card padded">
                  <h2>Milestone completion & delay</h2>
                  {milestones.map((m) => (
                    <div key={m.id}>
                      <p>
                        {m.name} · +{m.delay} days
                      </p>
                      <Progress value={m.progress * 100} />
                    </div>
                  ))}
                </section>
                <section className="card padded">
                  <div className="eyebrow">OBSERVED · ENTERED BY YOU</div>
                  <h2>Actual business results</h2>
                  <div className="big-number">
                    {money(s.sales.reduce((a, b) => a + b.contribution, 0))}
                  </div>
                  <p>
                    {s.sales.reduce((a, b) => a + b.orders, 0)} real orders
                    recorded
                  </p>
                  {s.sales.map((x) => (
                    <div className="chart-row" key={x.id}>
                      <span>{date(x.date)}</span>
                      <Progress
                        value={Math.min(100, Math.abs(x.contribution))}
                      />
                      <span>{money(x.contribution)}</span>
                    </div>
                  ))}
                  <hr />
                  <div className="eyebrow">HYPOTHETICAL · SEPARATE</div>
                  <h3>Launch scenario exposure</h3>
                  {exp.map((e) => (
                    <p key={e.name}>
                      {e.name}: {money(e.launch)}
                    </p>
                  ))}
                </section>
              </div>
              <section className="card padded section-space">
                <h2>Your weekly 15-minute review</h2>
                <p>
                  What did you publish or sell? What did customers actually
                  respond to? What is the one thing to finish next week?
                </p>
                <button
                  className="button secondary"
                  onClick={() => {
                    const review = s.tasks.find(
                      (t) =>
                        t.project === "Business Review" &&
                        t.status !== "completed",
                    );
                    if (review) setEditor({ ...review });
                    else addTask();
                  }}
                >
                  Open review task <ArrowRight size={15} />
                </button>
              </section>
            </>
          )}
          {page === "Idea Parking Lot" && (
            <>
              <form
                className="card idea-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (idea.trim()) {
                    setS({
                      ...s,
                      ideas: [...s.ideas, { id: uid(), text: idea.trim() }],
                    });
                    setIdea("");
                  }
                }}
              >
                <Lightbulb size={24} />
                <input
                  aria-label="New idea"
                  placeholder="A good idea for another day…"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                />
                <button className="button">
                  Park this idea <Plus size={15} />
                </button>
              </form>
              <div className="two-col section-space">
                {s.ideas.map((i) => (
                  <section className="card padded" key={i.id}>
                    <div className="eyebrow">NOT NOW, MAYBE LATER</div>
                    <h2>{i.text}</h2>
                    <button
                      className="text-link"
                      onClick={() =>
                        setS({
                          ...s,
                          ideas: s.ideas.filter((x) => x.id !== i.id),
                        })
                      }
                    >
                      Remove idea
                    </button>
                  </section>
                ))}
              </div>
              {!s.ideas.length && (
                <div className="empty-state">
                  <Leaf />
                  <h2>Good ideas can wait here.</h2>
                  <p>Save the thought. Keep your active plan focused.</p>
                </div>
              )}
            </>
          )}
          {page === "Settings" && (
            <>
              <div className="two-col">
                <section className="card padded">
                  <h2>Your working rhythm</h2>
                  <label>
                    Default daily minutes
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={s.capacity}
                      onChange={(e) => {
                        if (+e.target.value > 0 && +e.target.value <= 1440)
                          setS({ ...s, capacity: +e.target.value });
                      }}
                    />
                  </label>
                  <DayCapacity s={s} setS={setS} currentDate={now} />
                  <p>Working days</p>
                  <div className="workdays">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (d, i) => (
                        <label key={d}>
                          <input
                            type="checkbox"
                            checked={s.workdays.includes(i)}
                            onChange={() => {
                              const w = s.workdays.includes(i)
                                ? s.workdays.filter((x) => x !== i)
                                : [...s.workdays, i];
                              if (w.length) setS({ ...s, workdays: w });
                              else setNotice("Keep at least one working day.");
                            }}
                          />
                          {d}
                        </label>
                      ),
                    )}
                  </div>
                  <label>
                    Time zone
                    <select
                      value={s.timezone}
                      onChange={(e) => setS({ ...s, timezone: e.target.value })}
                    >
                      {[
                        "Europe/Berlin",
                        "Europe/London",
                        "America/New_York",
                        "America/Los_Angeles",
                        "Asia/Tokyo",
                        "Australia/Sydney",
                        "UTC",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Currency
                    <select
                      value={s.currency}
                      onChange={(e) => setS({ ...s, currency: e.target.value })}
                    >
                      {["EUR", "USD", "GBP"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Planning start
                    <input
                      type="date"
                      value={s.start}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (!next) return;
                        const delta = days(s.start, next);
                        if (
                          confirm(
                            "Shift all uncompleted tasks and original milestone targets by this many calendar days? Completed tasks stay unchanged.",
                          )
                        )
                          setS({
                            ...s,
                            start: next,
                            tasks: s.tasks.map((t) =>
                              t.status === "completed"
                                ? t
                                : {
                                    ...t,
                                    scheduled: addDays(t.scheduled, delta),
                                    original: addDays(t.original, delta),
                                    deadline: t.deadline
                                      ? addDays(t.deadline, delta)
                                      : "",
                                  },
                            ),
                            milestones: s.milestones.map((m) => ({
                              ...m,
                              target: addDays(m.target, delta),
                            })),
                            logs: [
                              ...s.logs,
                              log(`Planning baseline changed by ${delta} days`),
                            ],
                          });
                      }}
                    />
                  </label>
                </section>
                <section className="card padded">
                  <h2>Focus on two projects</h2>
                  <p>
                    Keep launch work manageable. New channels can wait until
                    your listings are live.
                  </p>
                  {projects.map((p) => (
                    <label className="check-label" key={p}>
                      <input
                        type="checkbox"
                        checked={s.active.includes(p)}
                        onChange={() => {
                          if (
                            !s.active.includes(p) &&
                            s.active.length >= 2 &&
                            !confirm(
                              "A third active project can dilute your focus. Activate it anyway?",
                            )
                          )
                            return;
                          setS({
                            ...s,
                            active: s.active.includes(p)
                              ? s.active.filter((x) => x !== p)
                              : [...s.active, p],
                          });
                        }}
                      />
                      {p}
                    </label>
                  ))}
                  <hr />
                  <h2>Back up your workspace</h2>
                  <p>
                    Your data is saved only in this browser. Export regularly,
                    especially before clearing browser data or changing devices.
                  </p>
                  <div className="actions">
                    <button className="button secondary" onClick={exportData}>
                      <Download size={15} />
                      Export JSON
                    </button>
                    <label className="button secondary">
                      <Upload size={15} />
                      Import JSON
                      <input
                        className="file-input"
                        type="file"
                        accept="application/json,.json"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            void importData(e.target.files[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </section>
              </div>
            </>
          )}
          <footer>
            <span>lily’s</span> A little less planning. A little more doing.
            <small>LOCAL & PRIVATE · NO ACCOUNT NEEDED</small>
          </footer>
        </main>
      </div>
      {editor && (
        <TaskEditor
          currentDate={now}
          task={editor}
          tasks={s.tasks}
          milestones={s.milestones}
          close={() => setEditor(null)}
          save={saveTask}
          remove={() => {
            if (s.tasks.some((t) => t.dependencies.includes(editor.id))) {
              setNotice(
                "Remove this task from dependent tasks before deleting it.",
              );
              return;
            }
            if (confirm("Delete this task permanently?")) {
              setS({
                ...s,
                tasks: s.tasks.filter((t) => t.id !== editor.id),
                logs: [...s.logs, log(`Deleted “${editor.title}”`)],
              });
              setEditor(null);
            }
          }}
        />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if ("serviceWorker" in navigator && import.meta.env?.PROD)
  navigator.serviceWorker.register("/sw.js").catch(() => {});
