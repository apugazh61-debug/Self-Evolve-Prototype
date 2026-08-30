"""
Executive Intelligence & Performance Audit Report Generator.
Compiles audit telemetry, ToT graph branches, debate transcripts, and lessons
into a publication-grade standalone executive briefing.
"""

from __future__ import annotations

from datetime import datetime, timezone
from app import memory
from app.tasks import TASK_DESCRIPTIONS


def generate_executive_report_html() -> str:
    summary = memory.get_summary()
    lessons = memory.get_all_lessons()
    tools = memory.get_custom_tools()
    stats = memory.get_stats()
    now_str = datetime.now(timezone.utc).strftime("%B %d, %Y - %H:%M UTC")

    lesson_rows = "".join([
        f"""
        <tr>
          <td><strong style="color:#0284c7;">{l['task_type']}</strong></td>
          <td><code>{l['error_tag']}</code></td>
          <td>{l['lesson_text']}</td>
          <td><span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:4px; font-weight:bold;">{int(l['effectiveness']*100)}% ({l['times_used']} uses)</span></td>
        </tr>
        """
        for l in lessons
    ]) or "<tr><td colspan='4' style='text-align:center;'>No lessons recorded yet.</td></tr>"

    tool_rows = "".join([
        f"""
        <tr>
          <td><strong>{t['name']}</strong></td>
          <td>{t['description']}</td>
          <td><code>{t['times_executed']} executions</code></td>
        </tr>
        """
        for t in tools
    ]) or "<tr><td colspan='3' style='text-align:center;'>No custom tools synthesized.</td></tr>"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Self-Evolve v1.0 — Executive Intelligence Report</title>
  <style>
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px; }}
    .report-container {{ max-width: 900px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 48px; }}
    .header {{ border-bottom: 2px solid #0284c7; padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end; }}
    .title {{ font-size: 28px; font-weight: 900; color: #0f172a; margin: 0; }}
    .sub {{ color: #0284c7; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; }}
    .meta-date {{ font-size: 12px; color: #64748b; font-family: monospace; }}
    .stat-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }}
    .stat-box {{ background: #f1f5f9; border-radius: 10px; padding: 18px; text-align: center; border: 1px solid #e2e8f0; }}
    .stat-val {{ font-size: 26px; font-weight: 900; color: #0284c7; font-family: monospace; }}
    .stat-lbl {{ font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-top: 4px; }}
    h2 {{ font-size: 18px; font-weight: 800; text-transform: uppercase; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-top: 36px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }}
    th, td {{ padding: 12px 14px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
    th {{ background: #f8fafc; font-weight: 800; color: #475569; text-transform: uppercase; font-size: 11px; }}
    code {{ font-family: monospace; color: #0369a1; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; }}
    .footer {{ margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; }}
    @media print {{ body {{ background: #fff; padding: 0; }} .report-container {{ border: none; box-shadow: none; padding: 0; }} }}
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <div>
        <h1 class="title">Self-Evolve Intelligence Audit</h1>
        <div class="sub">Autonomous Agentic AI Platform · Performance Dossier</div>
      </div>
      <div class="meta-date">Generated: {now_str}</div>
    </div>

    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-val">{summary.get('total_runs', 0)}</div>
        <div class="stat-lbl">Total Executions</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">{summary.get('total_lessons', 0)}</div>
        <div class="stat-lbl">Lessons Retained</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">{int(summary.get('first_attempt_success_rate', 0) * 100)}%</div>
        <div class="stat-lbl">1st-Try Accuracy</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">{len(tools)}</div>
        <div class="stat-lbl">Custom Tools</div>
      </div>
    </div>

    <h2>1. Reusable Episodic Memory Catalog</h2>
    <table>
      <thead>
        <tr>
          <th>Task Type</th>
          <th>Error Pattern Tag</th>
          <th>Distilled Lesson / Heuristic</th>
          <th>Effectiveness</th>
        </tr>
      </thead>
      <tbody>
        {lesson_rows}
      </tbody>
    </table>

    <h2>2. Autonomous Tool Forge Registry</h2>
    <table>
      <thead>
        <tr>
          <th>Tool Name</th>
          <th>Capability Description</th>
          <th>Telemetry Usage</th>
        </tr>
      </thead>
      <tbody>
        {tool_rows}
      </tbody>
    </table>

    <div class="footer">
      Self-Evolve v1.0 Autonomous Agentic AI · Team Red-Ant · All Rights Reserved.
    </div>
  </div>
</body>
</html>
"""
