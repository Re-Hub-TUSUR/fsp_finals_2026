import React from 'react';
import type { ParticipationStatus } from '../types';
import { PARTICIPATION_LABELS, PARTICIPATION_STYLES } from '../utils/format';

export const ParticipationBadge: React.FC<{ status: ParticipationStatus; className?: string }> = ({
  status,
  className = '',
}) => (
  <span
    className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${PARTICIPATION_STYLES[status]} ${className}`}
  >
    {PARTICIPATION_LABELS[status]}
  </span>
);
