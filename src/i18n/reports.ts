import { Language, Category } from '../types';

export interface ReportTitles {
    title: string;
    summary: string;
    totalTickets: string;
    highPriority: string;
    languageDistribution: string;
    categoryStats: string;
    highPriorityQueue: string;
}

export function getReportTitles(language: Language): ReportTitles {
    const titles: Record<Language, ReportTitles> = {
        'zh-CN': {
            title: '客诉巡航报告',
            summary: '执行摘要',
            totalTickets: '新增客诉',
            highPriority: '高优先级',
            languageDistribution: '语言分布',
            categoryStats: '分类统计',
            highPriorityQueue: '高优先级队列'
        },
        'zh-TW': {
            title: '客訴巡航報告',
            summary: '執行摘要',
            totalTickets: '新增客訴',
            highPriority: '高優先級',
            languageDistribution: '語言分布',
            categoryStats: '分類統計',
            highPriorityQueue: '高優先級佇列'
        },
        'en': {
            title: 'Ticket Cruise Report',
            summary: 'Executive Summary',
            totalTickets: 'New Tickets',
            highPriority: 'High Priority',
            languageDistribution: 'Language Distribution',
            categoryStats: 'Category Statistics',
            highPriorityQueue: 'High Priority Queue'
        },
        'ja': {
            title: '問い合わせ巡航レポート',
            summary: '概要',
            totalTickets: '新規問い合わせ',
            highPriority: '高優先度',
            languageDistribution: '言語分布',
            categoryStats: 'カテゴリ統計',
            highPriorityQueue: '高優先度キュー'
        },
        'ko': {
            title: '문의 순회 보고서',
            summary: '요약',
            totalTickets: '신규 문의',
            highPriority: '높은 우선순위',
            languageDistribution: '언어 분포',
            categoryStats: '카테고리 통계',
            highPriorityQueue: '높은 우선순위 대기열'
        },
        'es': {
            title: 'Informe de Crucero de Tickets',
            summary: 'Resumen Ejecutivo',
            totalTickets: 'Nuevos Tickets',
            highPriority: 'Alta Prioridad',
            languageDistribution: 'Distribución de Idiomas',
            categoryStats: 'Estadísticas de Categoría',
            highPriorityQueue: 'Cola de Alta Prioridad'
        },
        'unknown': {
            title: 'Ticket Cruise Report',
            summary: 'Executive Summary',
            totalTickets: 'New Tickets',
            highPriority: 'High Priority',
            languageDistribution: 'Language Distribution',
            categoryStats: 'Category Statistics',
            highPriorityQueue: 'High Priority Queue'
        }
    };
    
    return titles[language] || titles['en'];
}

export function getCategoryIcon(category: Category): string {
    const icons: Record<Category, string> = {
        'payment': '💰',
        'refund': '🔄',
        'bug': '🐛',
        'ban_appeal': '🔒',
        'abuse': '⚠️',
        'general': '📝'
    };
    return icons[category] || '❓';
}

export function getCategoryName(category: Category, language: Language): string {
    // 返回本地化分类名称
    const names: Record<Language, Record<Category, string>> = {
        'zh-CN': {
            'payment': '充值/支付',
            'refund': '退款',
            'bug': '游戏Bug',
            'ban_appeal': '封号申诉',
            'abuse': '举报/作弊',
            'general': '其他'
        },
        'zh-TW': {
            'payment': '充值/支付',
            'refund': '退款',
            'bug': '遊戲Bug',
            'ban_appeal': '封號申訴',
            'abuse': '舉報/作弊',
            'general': '其他'
        },
        'en': {
            'payment': 'Payment',
            'refund': 'Refund',
            'bug': 'Bug Report',
            'ban_appeal': 'Ban Appeal',
            'abuse': 'Report/Abuse',
            'general': 'General'
        },
        'ja': {
            'payment': '課金/支払い',
            'refund': '返金',
            'bug': 'バグ報告',
            'ban_appeal': 'BAN解除申請',
            'abuse': '通報/不正',
            'general': 'その他'
        },
        'ko': {
            'payment': '결제',
            'refund': '환불',
            'bug': '버그 신고',
            'ban_appeal': '계정 정지 항소',
            'abuse': '신고/부정행위',
            'general': '기타'
        },
        'es': {
            'payment': 'Pago',
            'refund': 'Reembolso',
            'bug': 'Reporte de Bug',
            'ban_appeal': 'Apelación de Baneo',
            'abuse': 'Reporte/Abuso',
            'general': 'General'
        },
        'unknown': {
            'payment': 'Payment',
            'refund': 'Refund',
            'bug': 'Bug Report',
            'ban_appeal': 'Ban Appeal',
            'abuse': 'Report/Abuse',
            'general': 'General'
        }
    };
    
    return names[language]?.[category] || category;
}

export function getLanguageName(lang: string, displayLanguage: Language): string {
    // 返回语言本地化名称
    const names: Record<Language, Record<string, string>> = {
        'zh-CN': {
            'zh-CN': '简体中文',
            'zh-TW': '繁体中文',
            'en': '英文',
            'ja': '日文',
            'ko': '韩文',
            'es': '西班牙文',
            'unknown': '未知'
        },
        'zh-TW': {
            'zh-CN': '簡體中文',
            'zh-TW': '繁體中文',
            'en': '英文',
            'ja': '日文',
            'ko': '韓文',
            'es': '西班牙文',
            'unknown': '未知'
        },
        'en': {
            'zh-CN': 'Simplified Chinese',
            'zh-TW': 'Traditional Chinese',
            'en': 'English',
            'ja': 'Japanese',
            'ko': 'Korean',
            'es': 'Spanish',
            'unknown': 'Unknown'
        },
        'ja': {
            'zh-CN': '簡体字中国語',
            'zh-TW': '繁体字中国語',
            'en': '英語',
            'ja': '日本語',
            'ko': '韓国語',
            'es': 'スペイン語',
            'unknown': '不明'
        },
        'ko': {
            'zh-CN': '간체 중국어',
            'zh-TW': '번체 중국어',
            'en': '영어',
            'ja': '일본어',
            'ko': '한국어',
            'es': '스페인어',
            'unknown': '알 수 없음'
        },
        'es': {
            'zh-CN': 'Chino Simplificado',
            'zh-TW': 'Chino Tradicional',
            'en': 'Inglés',
            'ja': 'Japonés',
            'ko': 'Coreano',
            'es': 'Español',
            'unknown': 'Desconocido'
        },
        'unknown': {
            'zh-CN': 'Simplified Chinese',
            'zh-TW': 'Traditional Chinese',
            'en': 'English',
            'ja': 'Japanese',
            'ko': 'Korean',
            'es': 'Spanish',
            'unknown': 'Unknown'
        }
    };
    
    return names[displayLanguage]?.[lang] || lang;
}
