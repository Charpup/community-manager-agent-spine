import { formatDuration, formatPercentage, formatDateCN } from '../../../src/reports/formatters';

describe('Formatters', () => {
    describe('formatDuration', () => {
        it('should format milliseconds to seconds only', () => {
            expect(formatDuration(5000)).toBe('5s');
            expect(formatDuration(59000)).toBe('59s');
            expect(formatDuration(0)).toBe('0s');
        });

        it('should format milliseconds to minutes and seconds', () => {
            expect(formatDuration(60000)).toBe('1m 0s');
            expect(formatDuration(90000)).toBe('1m 30s');
            expect(formatDuration(3599000)).toBe('59m 59s');
        });

        it('should format milliseconds to hours, minutes and seconds', () => {
            expect(formatDuration(3600000)).toBe('1h 0m 0s');
            expect(formatDuration(3661000)).toBe('1h 1m 1s');
            expect(formatDuration(3723000)).toBe('1h 2m 3s');
            expect(formatDuration(9000000)).toBe('2h 30m 0s');
        });

        it('should handle edge cases', () => {
            expect(formatDuration(1000)).toBe('1s');
            expect(formatDuration(61000)).toBe('1m 1s');
        });
    });

    describe('formatPercentage', () => {
        it('should format percentage correctly', () => {
            expect(formatPercentage(50, 100)).toBe('50.0%');
            expect(formatPercentage(25, 100)).toBe('25.0%');
            expect(formatPercentage(1, 3)).toBe('33.3%');
        });

        it('should return 0.0% when total is 0', () => {
            expect(formatPercentage(0, 0)).toBe('0.0%');
            expect(formatPercentage(5, 0)).toBe('0.0%');
        });

        it('should handle decimal percentages', () => {
            expect(formatPercentage(1, 1000)).toBe('0.1%');
            expect(formatPercentage(1, 6)).toBe('16.7%');
        });
    });

    describe('formatDateCN', () => {
        it('should format date with single digit month and day', () => {
            const timestamp = new Date('2024-01-05 08:30:00').getTime();
            const result = formatDateCN(timestamp);
            expect(result).toMatch(/^2024-01-05 08:30$/);
        });

        it('should format date with double digit month and day', () => {
            const timestamp = new Date('2024-12-25 23:59:00').getTime();
            const result = formatDateCN(timestamp);
            expect(result).toMatch(/^2024-12-25 23:59$/);
        });

        it('should pad single digit values', () => {
            const timestamp = new Date(2024, 0, 1, 9, 5).getTime(); // Jan 1, 2024 09:05
            expect(formatDateCN(timestamp)).toBe('2024-01-01 09:05');
        });

        it('should handle zero values correctly', () => {
            const timestamp = new Date(2024, 0, 1, 0, 0).getTime();
            expect(formatDateCN(timestamp)).toBe('2024-01-01 00:00');
        });
    });
});
