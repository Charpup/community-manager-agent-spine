/**
 * 格式化持续时间
 * @param ms 毫秒
 * @returns 例如 "1h 32m 15s"
 */
export function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

/**
 * 格式化百分比
 */
export function formatPercentage(count: number, total: number): string {
    if (total === 0) return '0.0%';
    return ((count / total) * 100).toFixed(1) + '%';
}

/**
 * 格式化日期 (中文)
 */
export function formatDateCN(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
