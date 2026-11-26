const flows = [
  {
    title: "1 · Reservation & Availability",
    steps: ["Enter stay dates and guests", "Filter room types", "Check six floors for date overlap", "Select available floor", "Enter guest details", "Continue to payment", "Save reservation"],
  },
  {
    title: "2 · Payment",
    steps: ["Choose 10% reservation fee or full payment", "Select card, GCash, Maya, or bank", "Validate payment details", "Record amount paid and remaining balance", "Generate booking reference", "Show confirmation"],
  },
  {
    title: "3 · Check-in",
    steps: ["Sign in to Guest Portal", "Verify arrival date", "Open reservation", "Settle remaining balance", "Record check-in timestamp", "Issue room access code"],
  },
  {
    title: "4 · Check-out & Receipt",
    steps: ["Open checked-in stay", "Add minibar, dining, and incidentals", "Settle final charges", "Record checkout timestamp", "Mark stay completed", "Generate final receipt", "Print or download"],
  },
];

export default function Flowchart() {
  return (
    <main className="min-h-screen px-5 py-12 md:px-12" style={{ background: "#0e0d0b", color: "#f0ece4" }}>
      <div className="mx-auto max-w-6xl">
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.24em", textTransform: "uppercase" }}>System Analysis · Updated</p>
        <h1 className="mt-3" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,5vw,54px)", fontWeight: 400 }}>Complete Hotel Booking Flow</h1>
        <p className="mt-3 max-w-3xl" style={{ fontSize: "15px", color: "#a89880", lineHeight: 1.8 }}>
          The operational journey from availability search through final checkout receipt. Records and simulated payments persist locally in the current browser.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {flows.map((flow) => (
            <section key={flow.title} className="border p-5 md:p-7" style={{ borderColor: "#2a2620", background: "#161410" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "#c9a96e" }}>{flow.title}</h2>
              <ol className="mt-6 flex flex-col">
                {flow.steps.map((step, index) => (
                  <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < flow.steps.length - 1 && <span className="absolute left-[21px] top-11 h-[calc(100%-32px)] w-px" style={{ background: "#4a4030" }} />}
                    <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: "#c9a96e", background: "#0e0d0b", color: "#c9a96e", fontFamily: "var(--font-mono)", fontSize: "12px" }}>{index + 1}</span>
                    <div className="min-h-11 flex items-center border px-4 flex-1" style={{ borderColor: "#2a2620", color: "#d6cec1", fontSize: "14px" }}>{step}</div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        <section className="mt-6 border p-6" style={{ borderColor: "#2a2620", background: "#161410" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "#c9a96e" }}>Decision Rules</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              ["Room unavailable?", "Choose another floor, room type, or stay date."],
              ["Arrival date not reached?", "Check-in remains locked until the booked arrival date."],
              ["Balance or charges due?", "Valid simulated payment is required before status can advance."],
            ].map(([question, answer]) => (
              <div key={question} className="border p-4" style={{ borderColor: "#2a2620" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e" }}>{question}</p>
                <p className="mt-2" style={{ fontSize: "14px", color: "#a89880", lineHeight: 1.6 }}>{answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
