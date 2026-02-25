import { DailyMealData } from '../types';

interface EmailExportOptions {
  recipient?: string;
  subject?: string;
  body?: string;
}

interface ExportResult {
  method: 'web-share' | 'download-mailto';
  fileName: string;
  mailtoUrl?: string;
}

interface ExportPayload {
  exportedAt: string;
  totalDays: number;
  records: DailyMealData[];
}

const DEFAULT_SUBJECT = 'NutriTrackAi 식단 데이터 내보내기';
const DEFAULT_BODY = '첨부된 JSON 파일은 NutriTrackAi에서 내보낸 전체 식단 데이터입니다.';

const createMailtoUrl = (recipient: string, subject: string, body: string) => {
  const query = new URLSearchParams({ subject, body }).toString();
  return `mailto:${recipient}?${query}`;
};

const dateStamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}`;
};

const downloadFile = (file: File): void => {
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(file);
  link.href = objectUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

export const createMealDataExport = (records: DailyMealData[]) => {
  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    totalDays: records.length,
    records
  };
  const fileName = `nutritrack-meals-${dateStamp()}.json`;
  const json = JSON.stringify(payload, null, 2);
  const file = new File([json], fileName, { type: 'application/json' });

  return { file, fileName, json };
};

export const exportMealDataToEmail = async (
  records: DailyMealData[],
  options: EmailExportOptions = {}
): Promise<ExportResult> => {
  if (records.length === 0) {
    throw new Error('내보낼 식단 데이터가 없습니다.');
  }

  const { file, fileName } = createMealDataExport(records);
  const recipient = options.recipient ?? '';
  const subject = options.subject ?? DEFAULT_SUBJECT;
  const body = options.body ?? DEFAULT_BODY;
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  if (typeof nav.share === 'function') {
    const shareData: ShareData = {
      title: subject,
      text: body,
      files: [file]
    };

    if (!nav.canShare || nav.canShare(shareData)) {
      try {
        await nav.share(shareData);
        return { method: 'web-share', fileName };
      } catch (error) {
        // User explicitly canceled share flow.
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }
        // Fall through to download + mailto for permission or platform errors.
      }
    }
  }

  downloadFile(file);
  const mailtoBody = `${body}\n\n다운로드된 ${fileName} 파일을 첨부해서 전송해주세요.`;
  const mailtoUrl = createMailtoUrl(recipient, subject, mailtoBody);

  return {
    method: 'download-mailto',
    fileName,
    mailtoUrl
  };
};
