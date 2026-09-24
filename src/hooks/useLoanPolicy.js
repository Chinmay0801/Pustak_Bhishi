import { useEffect, useState } from 'react';
import { getLoanPolicy } from '../services/settingsService';
import { DEFAULT_LOAN_POLICY } from '../lib/loanPolicy';

export function useLoanPolicy() {
  const [policy, setPolicy] = useState(DEFAULT_LOAN_POLICY);
  useEffect(() => {
    let cancelled = false;
    getLoanPolicy().then((p) => { if (!cancelled) setPolicy(p); });
    return () => { cancelled = true; };
  }, []);
  return policy;
}
