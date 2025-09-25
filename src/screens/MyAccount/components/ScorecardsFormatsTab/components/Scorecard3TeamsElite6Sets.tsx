import type { ComponentProps } from 'react';
import { Scorecard3Teams6Sets } from './Scorecard3Teams6Sets';

type Props = Omit<ComponentProps<typeof Scorecard3Teams6Sets>, 'eliteSummary' | 'resultsLabel'>;

// Elite-specific 3-team (6 sets) scorecard wrapper
// Forces elite-only behavior without affecting the standard 3-team component.
export function Scorecard3TeamsElite6Sets(props: Props) {
  return (
    <Scorecard3Teams6Sets
      {...props}
      eliteSummary={true}
    />
  );
}
