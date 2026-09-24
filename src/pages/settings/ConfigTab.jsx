import { useState, useEffect } from 'react';
import { getGlobalSettings, updateGlobalSettings } from '../../services/settingsService';
import { DEFAULT_LOAN_POLICY, normalizePolicy } from '../../lib/loanPolicy';
import SectionTitle from './SectionTitle';
import { CARD, INPUT, LABEL, BTN_PRIMARY } from './ui';

function fmtDateTime(value) {
  return value ? (value.toDate ? value.toDate() : new Date(value)).toLocaleString() : '';
}

export default function ConfigTab({ admin }) {
  const { txns } = admin;
  const [settings, setSettings] = useState({ libraryName: '', contactNumber: '', ...DEFAULT_LOAN_POLICY });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGlobalSettings()
      .then((s) => { if (s) setSettings((prev) => ({ ...prev, ...s, ...normalizePolicy(s) })); })
      .catch((err) => console.error('Failed to load settings', err));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { libraryName = '', contactNumber = '' } = settings;
      await updateGlobalSettings({ libraryName, contactNumber, ...normalizePolicy(settings) });
      alert("Global settings saved. New loan period applies to books borrowed from now on.");
    } catch (err) {
      alert("Error saving settings: " + err.message);
    }
    setSaving(false);
  }

  async function handleExportExcel() {
    try {
      const xlsx = await import('xlsx');
      const exportData = txns.map(t => ({
        'Book Title': t.bookTitle,
        'Member': t.userName,
        'Member ID': t.userId,
        'Borrowed Date': fmtDateTime(t.borrowedAt) || 'N/A',
        'Due Date': fmtDateTime(t.dueDate) || 'N/A',
        'Returned Date': fmtDateTime(t.returnedAt) || 'Not Returned',
        'Status': t.isReturned ? 'Returned' : (t.isOverdue ? 'Overdue' : 'Active'),
        'Fine Recorded (₹)': t.fineAmount ?? '',
        'Fine Outstanding (₹)': t.fineDue || 0,
      }));

      const worksheet = xlsx.utils.json_to_sheet(exportData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Borrow History");
      xlsx.writeFile(workbook, "Library_Transactions_Export.xlsx");
    } catch (err) {
      alert("Failed to export: " + err.message);
    }
  }

  const set = (key) => (e) => setSettings({ ...settings, [key]: e.target.value });

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className={CARD}>
        <SectionTitle>Global Configuration</SectionTitle>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={LABEL}>Library Name</label>
            <input type="text" value={settings.libraryName} onChange={set('libraryName')} className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Loan Period (days)</label>
              <input type="number" min="1" value={settings.loanDays} onChange={set('loanDays')} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Overdue Fine (₹)</label>
              <input type="number" min="0" value={settings.fineAmount} onChange={set('fineAmount')} className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Admin WhatsApp</label>
            <input type="tel" value={settings.contactNumber} onChange={set('contactNumber')} className={INPUT} />
          </div>
          <button type="submit" disabled={saving} className={`w-full ${BTN_PRIMARY}`}>{saving ? 'Saving...' : 'Save Globally'}</button>
        </form>
      </div>

      <div className={`${CARD} flex flex-col justify-center items-center text-center`}>
        <span className="text-3xl mb-2">📊</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Data Export</h3>
        <button onClick={handleExportExcel} className={`w-full ${BTN_PRIMARY}`}>Export Transactions (.xlsx)</button>
      </div>
    </div>
  );
}
