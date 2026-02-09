import json
import os
from datetime import datetime
import tkinter as tk
from tkinter import ttk, messagebox

DATA_FILE = "attendance_log.json"


# Data layer

def load_data():
    if not os.path.exists(DATA_FILE):
        return {"events": []}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {"events": []}

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def now_ts():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# App

class TouchPointApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("TouchPoint - Proof of Concept (Python)")
        self.geometry("760x420")
        self.resizable(False, False)

        self.data = load_data()
        self.role = tk.StringVar(value="Student")

        # Demo data
        self.students = [
            {"id": "S1001", "name": "Alex Johnson"},
            {"id": "S1002", "name": "Maya Rivera"},
            {"id": "S1003", "name": "Jordan Lee"},
        ]
        self.selected_student_id = tk.StringVar(value=self.students[0]["id"])

        # UI
        self._build_header()
        self._build_body()
        self.refresh_views()

    def _build_header(self):
        header = ttk.Frame(self, padding=12)
        header.pack(fill="x")

        ttk.Label(header, text="TouchPoint", font=("Segoe UI", 16, "bold")).pack(side="left")
        ttk.Label(header, text="Proof of Concept: Simulated Tap + Approval + Persistence", font=("Segoe UI", 10))\
            .pack(side="left", padx=12)

        ttk.Label(header, text="Role:", font=("Segoe UI", 10, "bold")).pack(side="right")
        role_switch = ttk.Combobox(header, textvariable=self.role, values=["Student", "Instructor"], width=12, state="readonly")
        role_switch.pack(side="right", padx=8)
        role_switch.bind("<<ComboboxSelected>>", lambda e: self.refresh_views())

    def _build_body(self):
        body = ttk.Frame(self, padding=12)
        body.pack(fill="both", expand=True)

        # Left panel
        left = ttk.LabelFrame(body, text="Student Actions", padding=12)
        left.pack(side="left", fill="both", expand=True, padx=(0, 10))

        ttk.Label(left, text="Select Student:", font=("Segoe UI", 10)).pack(anchor="w")
        student_names = [f'{s["name"]} ({s["id"]})' for s in self.students]
        self.student_combo = ttk.Combobox(left, values=student_names, width=35, state="readonly")
        self.student_combo.current(0)
        self.student_combo.pack(anchor="w", pady=(4, 10))
        self.student_combo.bind("<<ComboboxSelected>>", self._on_student_selected)

        self.status_label = ttk.Label(left, text="Today’s Status: Not Checked In Yet", font=("Segoe UI", 11, "bold"))
        self.status_label.pack(anchor="w", pady=(0, 10))

        ttk.Label(left, text="Connectivity / Tag Scenario:", font=("Segoe UI", 10)).pack(anchor="w")
        self.scenario = tk.StringVar(value="Normal (has tag + on wifi)")
        scenario_combo = ttk.Combobox(
            left,
            textvariable=self.scenario,
            values=[
                "Normal (has tag + on wifi)",
                "Missing Tag",
                "No Wi-Fi (cellular only)"
            ],
            width=35,
            state="readonly"
        )
        scenario_combo.pack(anchor="w", pady=(4, 12))

        self.tap_btn = ttk.Button(left, text="Tap to Check In (Simulated)", command=self.simulate_tap)
        self.tap_btn.pack(anchor="w", pady=(0, 8))

        self.return_btn = ttk.Button(left, text="Return to Dashboard", command=self.refresh_views)
        self.return_btn.pack(anchor="w")

        ttk.Separator(left).pack(fill="x", pady=12)

        ttk.Label(left, text="Demo Notes:", font=("Segoe UI", 10, "bold")).pack(anchor="w")
        ttk.Label(
            left,
            text="• Normal = auto-mark present\n• Missing Tag or No Wi-Fi = Pending approval",
            font=("Segoe UI", 10)
        ).pack(anchor="w")

        # Right panel
        right = ttk.LabelFrame(body, text="Instructor View (Approvals)", padding=12)
        right.pack(side="right", fill="both", expand=True)

        ttk.Label(right, text="Pending Check-Ins:", font=("Segoe UI", 10, "bold")).pack(anchor="w")
        self.pending_list = tk.Listbox(right, height=10, width=45)
        self.pending_list.pack(fill="x", pady=(6, 10))

        btn_row = ttk.Frame(right)
        btn_row.pack(fill="x")

        self.approve_btn = ttk.Button(btn_row, text="Approve Selected", command=self.approve_selected)
        self.approve_btn.pack(side="left")

        self.reject_btn = ttk.Button(btn_row, text="Reject Selected", command=self.reject_selected)
        self.reject_btn.pack(side="left", padx=8)

        self.clear_btn = ttk.Button(btn_row, text="Clear All Data (Demo)", command=self.clear_data)
        self.clear_btn.pack(side="right")

        ttk.Separator(right).pack(fill="x", pady=12)

        ttk.Label(right, text="Recent Events:", font=("Segoe UI", 10, "bold")).pack(anchor="w")
        self.events_list = tk.Listbox(right, height=7, width=45)
        self.events_list.pack(fill="x", pady=(6, 0))

    def _on_student_selected(self, _event=None):
        idx = self.student_combo.current()
        self.selected_student_id.set(self.students[idx]["id"])
        self.refresh_views()

    def simulate_tap(self):
        student = self._get_selected_student()
        scenario = self.scenario.get()

        # Determine status based on scenario
        if scenario == "Normal (has tag + on wifi)":
            status = "approved"
            status_text = "Checked In – Present"
        else:
            status = "pending"
            status_text = "Check-In Pending Instructor Approval"

        event = {
            "timestamp": now_ts(),
            "student_id": student["id"],
            "student_name": student["name"],
            "scenario": scenario,
            "status": status
        }

        self.data["events"].append(event)
        save_data(self.data)

        message = "Attendance Recorded Successfully" if status == "approved" else "Check-In Submitted for Instructor Approval"
        messagebox.showinfo("TouchPoint", f"{message}\n\n{student['name']} ({student['id']})\n{status_text}\nRecorded at: {event['timestamp']}")
        self.refresh_views()

    def approve_selected(self):
        sel = self.pending_list.curselection()
        if not sel:
            messagebox.showwarning("TouchPoint", "Select a pending check-in to approve.")
            return

        item_text = self.pending_list.get(sel[0])
        # Find matching event by timestamp+id in the text
        event = self._find_event_from_list_text(item_text)
        if not event:
            messagebox.showerror("TouchPoint", "Could not locate the selected event.")
            return

        event["status"] = "approved"
        event["approved_at"] = now_ts()
        save_data(self.data)
        messagebox.showinfo("TouchPoint", f"Check-In Approved by Instructor\n\n{event['student_name']} ({event['student_id']})")
        self.refresh_views()

    def reject_selected(self):
        sel = self.pending_list.curselection()
        if not sel:
            messagebox.showwarning("TouchPoint", "Select a pending check-in to reject.")
            return

        item_text = self.pending_list.get(sel[0])
        event = self._find_event_from_list_text(item_text)
        if not event:
            messagebox.showerror("TouchPoint", "Could not locate the selected event.")
            return

        event["status"] = "rejected"
        event["rejected_at"] = now_ts()
        save_data(self.data)
        messagebox.showinfo("TouchPoint", f"Check-In Rejected\n\n{event['student_name']} ({event['student_id']})")
        self.refresh_views()

    def clear_data(self):
        if messagebox.askyesno("TouchPoint", "Clear all demo data? This will wipe attendance_log.json."):
            self.data = {"events": []}
            save_data(self.data)
            self.refresh_views()

    def refresh_views(self):
        # Update student status line based on latest event
        student = self._get_selected_student()
        latest = self._latest_event_for_student(student["id"])

        if not latest:
            self.status_label.config(text="Today’s Status: Not Checked In Yet")
        else:
            if latest["status"] == "approved":
                self.status_label.config(text=f"Today’s Status: Checked In – Present (at {latest['timestamp']})")
            elif latest["status"] == "pending":
                self.status_label.config(text=f"Today’s Status: Waiting for Instructor Approval (submitted {latest['timestamp']})")
            elif latest["status"] == "rejected":
                self.status_label.config(text=f"Today’s Status: Check-In Rejected (at {latest.get('rejected_at', latest['timestamp'])})")

        # Pending list
        self.pending_list.delete(0, tk.END)
        pending = [e for e in self.data["events"] if e.get("status") == "pending"]
        for e in reversed(pending):
            self.pending_list.insert(tk.END, f'{e["timestamp"]} | {e["student_name"]} ({e["student_id"]}) | {e["scenario"]}')

        # Events list (last 10)
        self.events_list.delete(0, tk.END)
        for e in reversed(self.data["events"][-10:]):
            status = e.get("status", "unknown").upper()
            self.events_list.insert(tk.END, f'{e["timestamp"]} | {e["student_id"]} | {status}')

        # Role behavior (minimal): disable instructor panel actions when role is Student
        if self.role.get() == "Student":
            self.approve_btn.state(["disabled"])
            self.reject_btn.state(["disabled"])
        else:
            self.approve_btn.state(["!disabled"])
            self.reject_btn.state(["!disabled"])

    def _get_selected_student(self):
        sid = self.selected_student_id.get()
        for s in self.students:
            if s["id"] == sid:
                return s
        return self.students[0]

    def _latest_event_for_student(self, student_id):
        events = [e for e in self.data["events"] if e.get("student_id") == student_id]
        return events[-1] if events else None

    def _find_event_from_list_text(self, text):
        # text format: "timestamp | name (id) | scenario"
        try:
            ts = text.split("|")[0].strip()
            sid_part = text.split("(")[-1]
            sid = sid_part.split(")")[0].strip()
        except Exception:
            return None

        # find most recent pending event match
        for e in reversed(self.data["events"]):
            if e.get("timestamp") == ts and e.get("student_id") == sid and e.get("status") in ("pending", "approved", "rejected"):
                return e
        return None


if __name__ == "__main__":
    # Tkinter is built-in with most Python installs on Windows/macOS.
    app = TouchPointApp()
    app.mainloop()
