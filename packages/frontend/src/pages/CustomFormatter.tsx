import { useState, useEffect } from "react";
import { api } from "../api.js";
import type { AppSharedState } from "../App.js";

const FONTS = ["Times New Roman", "Arial", "Calibri", "Cambria", "Garamond", "Tahoma"];

export default function CustomFormatter({ shared }: { shared: AppSharedState }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fontFamily, setFontFamily] = useState("Times New Roman");
  const [bodyFontSize, setBodyFontSize] = useState(12);
  const [headingFontSize, setHeadingFontSize] = useState(14);
  const [lineSpacing, setLineSpacing] = useState(1.5);
  const [margin, setMargin] = useState(25.4);
  const [sections, setSections] = useState<Array<{ id: string; name: string; mandatory: boolean; order: number }>>([
    { id: "intro", name: "Introduction", mandatory: true, order: 0 },
    { id: "body", name: "Body", mandatory: true, order: 1 },
    { id: "conclusion", name: "Conclusion", mandatory: true, order: 2 },
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const data = await api.getTemplates();
      setTemplates(data.templates);
    } catch {}
  }

  function addSection() {
    const order = sections.length;
    setSections([...sections, { id: `section_${Date.now()}`, name: "New Section", mandatory: false, order }]);
  }

  function removeSection(index: number) {
    setSections(sections.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
  }

  function updateSection(index: number, field: string, value: string | boolean) {
    const updated = [...sections];
    (updated[index] as any)[field] = value;
    setSections(updated);
  }

  function moveSection(index: number, direction: -1 | 1) {
    if (index + direction < 0 || index + direction >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[index + direction]] = [updated[index + direction], updated[index]];
    setSections(updated.map((s, i) => ({ ...s, order: i })));
  }

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setMessage("");
    try {
      await api.createTemplate({
        name,
        description,
        formatting: {
          fontFamily,
          bodyFontSize,
          headingFontSize,
          subHeadingFontSize: headingFontSize - 2,
          lineSpacing,
          paragraphSpacingBefore: 0,
          paragraphSpacingAfter: 6,
          margins: { top: margin, right: margin, bottom: margin, left: margin },
          pageSize: "A4",
          orientation: "portrait",
        },
        sections,
      });
      setMessage("Template saved successfully!");
      setName("");
      setDescription("");
      await loadTemplates();
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Custom Formatter</h1>
      <p className="text-gray-500 text-sm mb-6">Create and save reusable document formatting templates</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Formatting settings */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Formatting Settings</h2>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Custom Template"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Font Family</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-400"
            >
              {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Body Font Size</label>
              <input type="number" value={bodyFontSize} onChange={(e) => setBodyFontSize(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Heading Size</label>
              <input type="number" value={headingFontSize} onChange={(e) => setHeadingFontSize(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Line Spacing</label>
              <select value={lineSpacing} onChange={(e) => setLineSpacing(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-400">
                <option value={1}>1.0</option>
                <option value={1.15}>1.15</option>
                <option value={1.5}>1.5</option>
                <option value={2}>2.0</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Margin (mm)</label>
              <input type="number" step="0.1" value={margin} onChange={(e) => setMargin(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-400" />
            </div>
          </div>
        </div>

        {/* Right: Section builder */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Sections</h2>
            <button onClick={addSection} className="text-sm px-3 py-1 bg-accent-50 text-accent-700 rounded-lg hover:bg-accent-100">
              + Add Section
            </button>
          </div>

          <div className="space-y-2">
            {sections.map((section, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <div className="flex flex-col">
                  <button onClick={() => moveSection(i, -1)} className="text-gray-400 hover:text-gray-600 text-xs">▲</button>
                  <button onClick={() => moveSection(i, 1)} className="text-gray-400 hover:text-gray-600 text-xs">▼</button>
                </div>
                <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                <input
                  type="text"
                  value={section.name}
                  onChange={(e) => updateSection(i, "name", e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-accent-400"
                />
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={section.mandatory}
                    onChange={(e) => updateSection(i, "mandatory", e.target.checked)}
                  />
                  Required
                </label>
                <button onClick={() => removeSection(i)} className="text-red-400 hover:text-red-600 text-sm">×</button>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="w-full mt-4 py-2.5 bg-accent-600 text-white font-medium rounded-lg hover:bg-accent-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Template"}
          </button>
          {message && <p className="mt-2 text-sm text-center text-gray-600">{message}</p>}
        </div>
      </div>

      {/* Saved templates */}
      {templates.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-gray-900 mb-3">Saved Templates</h2>
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900 text-sm">{t.name}</span>
                  {t.description && <span className="text-gray-400 text-sm ml-2">{t.description}</span>}
                  <p className="text-xs text-gray-500 mt-0.5">{t.sectionCount} sections · Created {new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
