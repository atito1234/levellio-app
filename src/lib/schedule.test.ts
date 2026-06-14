import {
  clampScheduleMinutes,
  isValidScheduleMinutes,
  minutesToLabel,
  minutesToParts,
  partsToMinutes,
} from './schedule';

describe('isValidScheduleMinutes', () => {
  it('accepts whole minutes in 0..1439 and rejects everything else', () => {
    expect(isValidScheduleMinutes(0)).toBe(true);
    expect(isValidScheduleMinutes(1439)).toBe(true);
    expect(isValidScheduleMinutes(1440)).toBe(false);
    expect(isValidScheduleMinutes(-1)).toBe(false);
    expect(isValidScheduleMinutes(12.5)).toBe(false);
    expect(isValidScheduleMinutes('600')).toBe(false);
    expect(isValidScheduleMinutes(undefined)).toBe(false);
  });
});

describe('clampScheduleMinutes', () => {
  it('clamps and rounds into range', () => {
    expect(clampScheduleMinutes(-5)).toBe(0);
    expect(clampScheduleMinutes(5000)).toBe(1439);
    expect(clampScheduleMinutes(90.4)).toBe(90);
    expect(clampScheduleMinutes(NaN)).toBe(0);
  });
});

describe('parts <-> minutes round trip', () => {
  it('converts 12-hour parts to minutes', () => {
    expect(partsToMinutes({ hour12: 12, minute: 0, meridiem: 'AM' })).toBe(0); // midnight
    expect(partsToMinutes({ hour12: 7, minute: 30, meridiem: 'AM' })).toBe(450);
    expect(partsToMinutes({ hour12: 12, minute: 0, meridiem: 'PM' })).toBe(720); // noon
    expect(partsToMinutes({ hour12: 9, minute: 15, meridiem: 'PM' })).toBe(1275);
  });

  it('splits minutes back into parts', () => {
    expect(minutesToParts(0)).toEqual({ hour12: 12, minute: 0, meridiem: 'AM' });
    expect(minutesToParts(450)).toEqual({ hour12: 7, minute: 30, meridiem: 'AM' });
    expect(minutesToParts(720)).toEqual({ hour12: 12, minute: 0, meridiem: 'PM' });
    expect(minutesToParts(1275)).toEqual({ hour12: 9, minute: 15, meridiem: 'PM' });
  });
});

describe('minutesToLabel', () => {
  it('renders a friendly clock label with zero-padded minutes', () => {
    expect(minutesToLabel(0)).toBe('12:00 AM');
    expect(minutesToLabel(450)).toBe('7:30 AM');
    expect(minutesToLabel(720)).toBe('12:00 PM');
    expect(minutesToLabel(1275)).toBe('9:15 PM');
    expect(minutesToLabel(605)).toBe('10:05 AM');
  });
});
