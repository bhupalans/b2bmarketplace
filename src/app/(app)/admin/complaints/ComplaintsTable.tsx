"use client";

import { useState } from "react";

export default function ComplaintsTable({ complaints }: any) {

  const [rows, setRows] = useState(complaints);
  const [notes, setNotes] = useState<any>({});

  async function updateStatus(id: string, status: string) {

  const adminNote = notes[id] || "";

  try {

    const res = await fetch("/api/admin/updateComplaint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id,
        status,
        adminNote
      })
    });

    const data = await res.json();

    console.log("API response:", data);

    if (data.success) {

      setRows((prev: any) =>
        prev.map((r: any) =>
          r.id === id ? { ...r, status } : r
        )
      );

      alert("Complaint updated");

    } else {
      alert("Update failed");
    }

  } catch (err) {

    console.error("Update error:", err);
    alert("API request failed");

  }
}

  return (

    <div className="border rounded-lg overflow-hidden">

      <table className="w-full text-sm">

        <thead className="bg-muted">
          <tr>
            <th className="p-3 text-left">Reporter</th>
            <th className="p-3 text-left">Target</th>
            <th className="p-3 text-left">Reason</th>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Admin Note</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Action</th>
          </tr>
        </thead>

        <tbody>

          {rows.map((c: any) => {

            let link = "#";

            if (c.targetType === "product")
              link = `/products/${c.targetId}`;

            if (c.targetType === "seller")
              link = `/seller/${c.targetId}`;

            if (c.targetType === "sourcing")
              link = `/sourcing/${c.targetId}`;

            return (

              <tr key={c.id} className="border-t hover:bg-muted/40">

                <td className="p-3 font-medium">
                  {c.reporterName}
                </td>

                <td className="p-3">

                  <a
                    href={link}
                    target="_blank"
                    className="text-primary hover:underline capitalize"
                  >
                    {c.targetType}
                  </a>

                </td>

                <td className="p-3 max-w-md truncate">
                  {c.reason}
                </td>

                <td className="p-3">
                  {c.date}
                </td>

                <td className="p-3">

                  <input
                    placeholder="Admin note..."
                    className="border rounded px-2 py-1 text-xs w-full"
                    value={notes[c.id] || ""}
                    onChange={(e) =>
                      setNotes({
                        ...notes,
                        [c.id]: e.target.value
                      })
                    }
                  />

                </td>

                <td className="p-3 capitalize">
                  {c.status || "open"}
                </td>

                <td className="p-3">

                  <select
                    value={c.status || "open"}
                    onChange={(e) =>
                      updateStatus(c.id, e.target.value)
                    }
                    className="border rounded px-2 py-1 text-sm"
                  >

                    <option value="open">Open</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>

                  </select>

                </td>

              </tr>

            );
          })}

        </tbody>

      </table>

    </div>

  );
}