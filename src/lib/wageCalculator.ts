import { AttendanceRecord, UserProfile } from '../types';
import { isSunday, parseISO } from 'date-fns';

export interface WageDetails {
  h100: number;
  h130: number;
  h150: number;
  h200: number;
  h270: number;
  h300: number;
  h390: number;
  totalIncome: number;
}

export function calculateWageDetails(records: AttendanceRecord[], profile: UserProfile): WageDetails {
  const details: WageDetails = {
    h100: 0, h130: 0, h150: 0, h200: 0, h270: 0, h300: 0, h390: 0,
    totalIncome: 0
  };

  const hourlyRate = (profile.lcb || 0) / 208;

  records.forEach(record => {
    const isSun = isSunday(parseISO(record.date));
    const isHol = record.isHoliday;
    const { hoursHC, hoursOT, shift } = record;

    if (isHol) {
      if (shift === 'day') {
        details.h300 += (hoursHC + hoursOT);
      } else {
        // Night Shift Holiday: 2h @ 300%, 7h @ 390%, rest @ 300%
        let total = hoursHC + hoursOT;
        let p1 = Math.min(total, 2);
        details.h300 += p1;
        total -= p1;

        let p2 = Math.min(total, 7);
        details.h390 += p2;
        total -= p2;

        details.h300 += total;
      }
    } else if (isSun) {
      if (shift === 'day') {
        details.h200 += (hoursHC + hoursOT);
      } else {
        // Night Shift Sunday: 2h @ 200%, 7h @ 270%, rest @ 200%
        let total = hoursHC + hoursOT;
        let p1 = Math.min(total, 2);
        details.h200 += p1;
        total -= p1;

        let p2 = Math.min(total, 7);
        details.h270 += p2;
        total -= p2;

        details.h200 += total;
      }
    } else {
      // Normal Day
      if (shift === 'day') {
        details.h100 += hoursHC;
        details.h150 += hoursOT;
      } else {
        // Night Shift Normal
        // HC: 2h @ 100%, 6h @ 130%, rest @ 100%
        let hcLeft = hoursHC;
        let p1 = Math.min(hcLeft, 2);
        details.h100 += p1;
        hcLeft -= p1;

        let p2 = Math.min(hcLeft, 6);
        details.h130 += p2;
        hcLeft -= p2;

        details.h100 += hcLeft;

        // OT: 1h @ 200%, rest @ 150%
        let otLeft = hoursOT;
        let o1 = Math.min(otLeft, 1);
        details.h200 += o1;
        otLeft -= o1;
        details.h150 += otLeft;
      }
    }
  });

  const baseWage = (
    details.h100 * 1.0 +
    details.h130 * 1.3 +
    details.h150 * 1.5 +
    details.h200 * 2.0 +
    details.h270 * 2.7 +
    details.h300 * 3.0 +
    details.h390 * 3.9
  ) * hourlyRate;

  details.totalIncome = baseWage + (profile.chuyenCan || 0) + (profile.doiSong || 0) + (profile.thamNien || 0);

  return details;
}
