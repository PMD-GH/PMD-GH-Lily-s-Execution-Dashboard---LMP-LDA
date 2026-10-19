import { useState } from "react";
import { X } from "lucide-react";
import { uid, projects, type State, type Task, type Assumption } from "./model";
export function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Completion"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ width: `${value}%` }} />
    </div>
  );
}
export function Assumptions({
  value: a,
  update,
}: {
  value: Assumption;
  update: (a: Assumption) => void;
}) {
  const fields: [keyof Assumption, string][] = [
    ["price", "Average selling price (€)"],
    ["fees", "Platform fees per order (€)"],
    ["costs", "Variable costs per order (€)"],
    ["visits", "Expected shop visits / day"],
    ["conversion", "Conversion rate (%)"],
    ["monthlyOrders", "Expected monthly orders"],
    ["growth", "Monthly growth scenario (%)"],
    ["clickRate", "Content-to-shop click rate (%)"],
    ["contentVisits", "Expected visits per carousel / pin"],
  ];
  return (
    <>
      <label className="check-label enable">
        <input
          type="checkbox"
          checked={a.enabled}
          onChange={(e) => update({ ...a, enabled: e.target.checked })}
        />
        Explicitly enable this hypothetical scenario
      </label>
      <div className="form-grid">
        {fields.map(([key, label]) => (
          <div key={key}>
            <label>
              {label}
              <input
                type="number"
                min="0"
                max={
                  key === "conversion" || key === "clickRate" ? 100 : undefined
                }
                step="any"
                value={Number(a[key])}
                onChange={(e) => {
                  const n = +e.target.value;
                  if (
                    n >= 0 &&
                    ((key !== "conversion" && key !== "clickRate") || n <= 100)
                  )
                    update({ ...a, [key]: n });
                }}
              />
            </label>
            <details className="assumption-evidence">
              <summary>Confidence & source</summary>
              <select
                aria-label={`${label} confidence`}
                value={a.evidence?.[key]?.confidence || "Low"}
                onChange={(e) =>
                  update({
                    ...a,
                    evidence: {
                      ...a.evidence,
                      [key]: {
                        source: a.evidence?.[key]?.source || "",
                        confidence: e.target.value,
                      },
                    },
                  })
                }
              >
                {["Low", "Medium", "High"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                aria-label={`${label} source`}
                placeholder="Source or explanation"
                value={a.evidence?.[key]?.source || ""}
                onChange={(e) =>
                  update({
                    ...a,
                    evidence: {
                      ...a.evidence,
                      [key]: {
                        confidence: a.evidence?.[key]?.confidence || "Low",
                        source: e.target.value,
                      },
                    },
                  })
                }
              />
            </details>
          </div>
        ))}
      </div>
      <label>
        Overall scenario confidence
        <select
          value={a.confidence}
          onChange={(e) => update({ ...a, confidence: e.target.value })}
        >
          {["Low", "Medium", "High"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label>
        Overall scenario notes
        <textarea
          value={a.source}
          onChange={(e) => update({ ...a, source: e.target.value })}
          placeholder="Price: … Fees: … Traffic: … Conversion: …"
        />
      </label>
    </>
  );
}
export function Sales({
  s,
  setS,
  now,
  money,
}: {
  s: State;
  setS: (s: State) => void;
  now: string;
  money: (n: number) => string;
}) {
  return (
    <section className="card padded section-space">
      <div className="eyebrow">OBSERVED · NEVER INFERRED</div>
      <h2>Real sales & contribution</h2>
      <form
        className="sales-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setS({
            ...s,
            sales: [
              ...s.sales,
              {
                id: uid(),
                date: String(f.get("date")),
                orders: Number(f.get("orders")),
                contribution: Number(f.get("contribution")),
              },
            ],
          });
          e.currentTarget.reset();
        }}
      >
        <label>
          Date
          <input type="date" name="date" defaultValue={now} required />
        </label>
        <label>
          Orders
          <input type="number" name="orders" min="0" step="1" required />
        </label>
        <label>
          Actual net contribution
          <input type="number" name="contribution" step="0.01" required />
        </label>
        <button className="button">Record result</button>
      </form>
      {s.sales.map((x) => (
        <div className="sale-row" key={x.id}>
          {x.date} · {x.orders} orders · {money(x.contribution)}
          <button
            className="text-link"
            onClick={() => {
              if (confirm("Delete this sales record?"))
                setS({ ...s, sales: s.sales.filter((y) => y.id !== x.id) });
            }}
          >
            Remove
          </button>
        </div>
      ))}
    </section>
  );
}
export function TaskEditor({
  currentDate,
  task,
  tasks,
  milestones,
  close,
  save,
  remove,
}: {
  currentDate: string;
  task: Task;
  tasks: Task[];
  milestones: State["milestones"];
  close: () => void;
  save: (t: Task) => void;
  remove: () => void;
}) {
  const [t, setT] = useState(task);
  const update = (key: keyof Task, value: unknown) =>
    setT({ ...t, [key]: value });
  const text = (key: keyof Task, label: string, type = "text") => (
    <label>
      {label}
      <input
        type={type}
        value={String(t[key])}
        required={["title", "scheduled", "minutes"].includes(key)}
        min={type === "number" ? (key === "minutes" ? 1 : 0) : undefined}
        onChange={(e) =>
          update(key, type === "number" ? +e.target.value : e.target.value)
        }
      />
    </label>
  );
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          if (e.key === "Tab") {
            const nodes = e.currentTarget.querySelectorAll<HTMLElement>(
              "button,input,select,textarea",
            );
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="section-title">
          <h2 id="editor-title">A useful next step</h2>
          <button
            autoFocus
            className="icon-button"
            aria-label="Close task editor"
            onClick={close}
          >
            <X />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save({
              ...t,
              completed:
                t.status === "completed" ? t.completed || currentDate : "",
            });
          }}
        >
          {text("title", "Task title")}
          <label>
            Description
            <textarea
              value={t.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </label>
          <div className="form-grid">
            <label>
              Project
              <select
                value={t.project}
                onChange={(e) => update("project", e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            {text("category", "Category")}
            {text("minutes", "Estimated minutes", "number")}
            {text("actualMinutes", "Actual minutes", "number")}
            {text("scheduled", "Scheduled date", "date")}
            {text("deadline", "Deadline (optional)", "date")}
            <label>
              Priority
              <select
                value={t.priority}
                onChange={(e) => update("priority", +e.target.value)}
              >
                <option value="3">High</option>
                <option value="2">Medium</option>
                <option value="1">Low</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={t.status}
                onChange={(e) => update("status", e.target.value)}
              >
                {["planned", "in progress", "completed", "skipped"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Milestone
              <select
                value={t.milestone}
                onChange={(e) => update("milestone", e.target.value)}
              >
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Repeat
              <select
                value={t.recurrence}
                onChange={(e) => update("recurrence", e.target.value)}
              >
                <option value="none">Does not repeat</option>
                <option value="weekly">Weekly (created on completion)</option>
              </select>
            </label>
          </div>
          <label>
            Dependencies (hold Ctrl / Cmd to select multiple)
            <select
              multiple
              value={t.dependencies}
              onChange={(e) =>
                update(
                  "dependencies",
                  Array.from(e.target.selectedOptions, (o) => o.value),
                )
              }
            >
              {tasks
                .filter((x) => x.id !== t.id)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={t.critical}
              onChange={(e) => update("critical", e.target.checked)}
            />
            Critical path priority
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={t.revenue}
              onChange={(e) => update("revenue", e.target.checked)}
            />
            Direct revenue relevance
          </label>
          <label>
            Notes
            <textarea
              value={t.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </label>
          <p className="muted">
            Original scheduled date: {t.original}. Dependencies, rather than the
            priority flag alone, determine milestone delays.
          </p>
          <div className="actions">
            <button className="button" type="submit">
              Save task
            </button>
            <button type="button" className="button secondary" onClick={close}>
              Cancel
            </button>
            {tasks.some((x) => x.id === t.id) && (
              <button
                className="text-link danger"
                type="button"
                onClick={remove}
              >
                Delete task
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
export function DayCapacity({
  s,
  setS,
  currentDate,
}: {
  s: State;
  setS: (s: State) => void;
  currentDate: string;
}) {
  const [date, setDate] = useState(currentDate);
  return (
    <>
      <h3>Time for a specific day</h3>
      <label>
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
          }}
        />
      </label>
      <label>
        Available minutes
        <input
          type="number"
          min="1"
          max="1440"
          value={s.dayCapacity[date] ?? s.capacity}
          onChange={(e) => {
            if (+e.target.value >= 1 && +e.target.value <= 1440)
              setS({
                ...s,
                dayCapacity: { ...s.dayCapacity, [date]: +e.target.value },
              });
          }}
        />
      </label>
      <button
        className="text-link"
        onClick={() => {
          const next = { ...s.dayCapacity };
          delete next[date];
          setS({ ...s, dayCapacity: next });
        }}
      >
        Use default for this date
      </button>
    </>
  );
}
