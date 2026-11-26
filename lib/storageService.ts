import { supabase } from './supabaseClient';
import { saveVaultItem } from './indexedDbStorage';

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  isPlatformHosted: boolean;
  storageProvider: 'supabase' | 'mediafire' | 'drive' | 'local_fallback';
}

export type DocumentLinkProvider =
  | 'mediafire'
  | 'drive'
  | 'dropbox'
  | 'onedrive'
  | 'mega'
  | 'platform'
  | 'direct';

export type DocumentFileKind =
  | 'pdf'
  | 'image'
  | 'office'
  | 'archive'
  | 'google_drive'
  | 'external';

export interface ResolvedDocumentUrls {
  provider: DocumentLinkProvider;
  safeUrl: string;
  previewUrl: string;
  officeViewerUrl: string;
  downloadUrl: string;
  canEmbedInPlatform: boolean;
  fileKind: DocumentFileKind;
  fileExtension: string;
  providerLabel: string;
}

/**
 * Sanitizes document URLs to prevent unsafe schemes like javascript: or data:text/html
 */
export function sanitizeDocumentUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('idb://') ||
    lower.startsWith('blob:') ||
    lower.startsWith('/') ||
    lower.startsWith('data:application/pdf') ||
    lower.startsWith('data:image/')
  ) {
    return trimmed;
  }

  return '';
}

/**
 * Detects if a given URL is from MediaFire, Google Drive, Dropbox, OneDrive, or platform storage
 */
export function detectLinkProvider(url: string): DocumentLinkProvider {
  if (!url) return 'direct';
  const lower = url.toLowerCase();
  if (lower.includes('mediafire.com')) return 'mediafire';
  if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) return 'drive';
  if (lower.includes('dropbox.com') || lower.includes('dropboxusercontent.com')) return 'dropbox';
  if (lower.includes('onedrive') || lower.includes('1drv.ms') || lower.includes('sharepoint.com')) return 'onedrive';
  if (lower.includes('mega.nz') || lower.includes('mega.io')) return 'mega';
  if (
    lower.startsWith('idb://') ||
    lower.includes('supabase.co') ||
    lower.startsWith('data:application/pdf') ||
    lower.startsWith('data:image/') ||
    lower.startsWith('blob:')
  ) {
    return 'platform';
  }
  return 'direct';
}

function extractFileExtension(url: string): string {
  try {
    const clean = url.split('#')[0].split('?')[0];
    const lastSegment = clean.split('/').pop() || '';
    if (!lastSegment.includes('.')) return '';
    return lastSegment.split('.').pop()?.toLowerCase() || '';
  } catch {
    return '';
  }
}

function extractGoogleDriveFileId(url: string): string | null {
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch?.[1]) return fileMatch[1];

  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch?.[1]) return openMatch[1];

  return null;
}

function extractGoogleDocsInfo(url: string): { docType: 'document' | 'presentation' | 'spreadsheets'; id: string } | null {
  const match = url.match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/i);
  if (!match) return null;
  return {
    docType: match[1].toLowerCase() as 'document' | 'presentation' | 'spreadsheets',
    id: match[2],
  };
}

/**
 * Resolves any free external or platform document URL into an embeddable preview URL + direct desktop download URL
 */
export function resolveDocumentUrls(rawUrl: string): ResolvedDocumentUrls {
  const safeUrl = sanitizeDocumentUrl(rawUrl);
  const provider = detectLinkProvider(safeUrl);
  const ext = extractFileExtension(safeUrl);

  const isImageExt = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext) || safeUrl.startsWith('data:image/');
  const isOfficeExt = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext);
  const isArchiveExt = ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
  const isPdfExt = ext === 'pdf' || safeUrl.startsWith('data:application/pdf');

  if (!safeUrl) {
    return {
      provider: 'direct',
      safeUrl: '',
      previewUrl: '',
      officeViewerUrl: '',
      downloadUrl: '',
      canEmbedInPlatform: false,
      fileKind: 'external',
      fileExtension: '',
      providerLabel: 'رابط غير صالح',
    };
  }

  // 1. Google Drive / Google Docs / Slides / Sheets (Free 15GB, zero API keys required)
  if (provider === 'drive') {
    const docsInfo = extractGoogleDocsInfo(safeUrl);
    if (docsInfo) {
      const exportFormat = docsInfo.docType === 'spreadsheets' ? 'xlsx' : 'pdf';
      return {
        provider: 'drive',
        safeUrl,
        previewUrl: `https://docs.google.com/${docsInfo.docType}/d/${docsInfo.id}/preview`,
        officeViewerUrl: `https://docs.google.com/${docsInfo.docType}/d/${docsInfo.id}/preview`,
        downloadUrl: `https://docs.google.com/${docsInfo.docType}/d/${docsInfo.id}/export?format=${exportFormat}`,
        canEmbedInPlatform: true,
        fileKind: 'google_drive',
        fileExtension: exportFormat,
        providerLabel: 'Google Drive / Docs قارئ مباشر',
      };
    }

    const driveId = extractGoogleDriveFileId(safeUrl);
    if (driveId) {
      return {
        provider: 'drive',
        safeUrl,
        previewUrl: `https://drive.google.com/file/d/${driveId}/preview`,
        officeViewerUrl: `https://drive.google.com/file/d/${driveId}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${driveId}`,
        canEmbedInPlatform: true,
        fileKind: 'google_drive',
        fileExtension: ext,
        providerLabel: 'Google Drive قارئ مدمج',
      };
    }

    // Folder or unrecognized Drive link
    return {
      provider: 'drive',
      safeUrl,
      previewUrl: safeUrl,
      officeViewerUrl: safeUrl,
      downloadUrl: safeUrl,
      canEmbedInPlatform: false,
      fileKind: 'external',
      fileExtension: ext,
      providerLabel: 'Google Drive رابط مجلد',
    };
  }

  // 2. Dropbox
  if (provider === 'dropbox') {
    let rawPreview = safeUrl;
    let directDl = safeUrl;
    try {
      const parsed = new URL(safeUrl);
      parsed.searchParams.delete('dl');
      parsed.searchParams.set('raw', '1');
      rawPreview = parsed.toString();

      const dlParsed = new URL(safeUrl);
      dlParsed.searchParams.delete('raw');
      dlParsed.searchParams.set('dl', '1');
      directDl = dlParsed.toString();
    } catch {
      rawPreview = safeUrl.replace(/([?&])dl=0/, '$1raw=1');
      directDl = safeUrl.replace(/([?&])dl=0/, '$1dl=1');
    }

    const fileKind: DocumentFileKind = isImageExt
      ? 'image'
      : isOfficeExt
      ? 'office'
      : isArchiveExt
      ? 'archive'
      : 'pdf';

    return {
      provider: 'dropbox',
      safeUrl,
      previewUrl: isOfficeExt
        ? `https://docs.google.com/gview?url=${encodeURIComponent(rawPreview)}&embedded=true`
        : rawPreview,
      officeViewerUrl: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawPreview)}`,
      downloadUrl: directDl,
      canEmbedInPlatform: !isArchiveExt,
      fileKind,
      fileExtension: ext,
      providerLabel: 'Dropbox قارئ مباشر',
    };
  }

  // 3. OneDrive / SharePoint
  if (provider === 'onedrive') {
    let dlUrl = safeUrl;
    if (!safeUrl.toLowerCase().includes('download=1') && !safeUrl.toLowerCase().includes('1drv.ms')) {
      dlUrl = safeUrl.includes('?') ? `${safeUrl}&download=1` : `${safeUrl}?download=1`;
    }
    const embedUrl = safeUrl.includes('onedrive.live.com/redir')
      ? safeUrl.replace('/redir?', '/embed?')
      : `https://docs.google.com/gview?url=${encodeURIComponent(safeUrl)}&embedded=true`;

    return {
      provider: 'onedrive',
      safeUrl,
      previewUrl: embedUrl,
      officeViewerUrl: embedUrl,
      downloadUrl: dlUrl,
      canEmbedInPlatform: !isArchiveExt,
      fileKind: isOfficeExt ? 'office' : isImageExt ? 'image' : 'pdf',
      fileExtension: ext,
      providerLabel: 'OneDrive قارئ سحابي',
    };
  }

  // 4. MediaFire / MEGA (blocks iframe embedding)
  if (provider === 'mediafire' || provider === 'mega') {
    return {
      provider,
      safeUrl,
      previewUrl: '',
      officeViewerUrl: '',
      downloadUrl: safeUrl,
      canEmbedInPlatform: false,
      fileKind: 'external',
      fileExtension: ext,
      providerLabel: provider === 'mediafire' ? 'MediaFire تحميل خارجي' : 'MEGA تحميل خارجي',
    };
  }

  // 5. Platform-hosted (Supabase / IndexedDB / Blob / Data URI)
  if (provider === 'platform') {
    return {
      provider: 'platform',
      safeUrl,
      previewUrl: safeUrl,
      officeViewerUrl: safeUrl,
      downloadUrl: safeUrl,
      canEmbedInPlatform: !isArchiveExt,
      fileKind: isImageExt ? 'image' : isOfficeExt ? 'office' : isArchiveExt ? 'archive' : 'pdf',
      fileExtension: ext || 'pdf',
      providerLabel: 'قارئ المنصة الداخلي',
    };
  }

  // 6. Direct URL (Cloudflare R2, GitHub Releases/Raw, CDN, direct PDF/image/Office/Archive)
  if (isArchiveExt) {
    return {
      provider: 'direct',
      safeUrl,
      previewUrl: '',
      officeViewerUrl: '',
      downloadUrl: safeUrl,
      canEmbedInPlatform: false,
      fileKind: 'archive',
      fileExtension: ext,
      providerLabel: `ملف مضغوط (${ext.toUpperCase()})`,
    };
  }

  if (isOfficeExt) {
    return {
      provider: 'direct',
      safeUrl,
      previewUrl: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(safeUrl)}`,
      officeViewerUrl: `https://docs.google.com/gview?url=${encodeURIComponent(safeUrl)}&embedded=true`,
      downloadUrl: safeUrl,
      canEmbedInPlatform: true,
      fileKind: 'office',
      fileExtension: ext,
      providerLabel: `عارض مستندات (${ext.toUpperCase()})`,
    };
  }

  if (isImageExt) {
    return {
      provider: 'direct',
      safeUrl,
      previewUrl: safeUrl,
      officeViewerUrl: safeUrl,
      downloadUrl: safeUrl,
      canEmbedInPlatform: true,
      fileKind: 'image',
      fileExtension: ext,
      providerLabel: `عارض صور عالي الدقة (${ext.toUpperCase()})`,
    };
  }

  return {
    provider: 'direct',
    safeUrl,
    previewUrl: isPdfExt
      ? safeUrl
      : `https://docs.google.com/gview?url=${encodeURIComponent(safeUrl)}&embedded=true`,
    officeViewerUrl: safeUrl,
    downloadUrl: safeUrl,
    canEmbedInPlatform: true,
    fileKind: isPdfExt ? 'pdf' : 'external',
    fileExtension: ext,
    providerLabel: isPdfExt ? 'قارئ PDF مباشر' : 'قارئ مستندات مباشر',
  };
}

/**
 * Uploads a document/PDF file to Supabase Storage with robust fallback
 */
export async function uploadDocumentToSupabase(
  file: File,
  folder: string = 'course_materials',
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileExt = sanitizedName.split('.').pop() || 'pdf';
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const filePath = `${folder}/${uniqueId}.${fileExt}`;

  if (onProgress) onProgress(20);

  try {
    // Attempt Supabase Storage upload
    const bucketName = 'course_materials';
    
    // Check or upload directly
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (onProgress) onProgress(70);

    if (error) {
      console.warn('Supabase storage bucket upload error, trying attachments bucket:', error.message);
      // Try fallback bucket 'attachments'
      const { data: attachData, error: attachError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!attachError && attachData) {
        const { data: publicUrlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        if (onProgress) onProgress(100);

        return {
          url: publicUrlData.publicUrl,
          fileName: file.name,
          fileSize: file.size,
          isPlatformHosted: true,
          storageProvider: 'supabase'
        };
      }
      
      throw new Error(attachError?.message || error.message);
    }

    if (data) {
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (onProgress) onProgress(100);

      return {
        url: publicUrlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        isPlatformHosted: true,
        storageProvider: 'supabase'
      };
    }
  } catch (err: any) {
    console.warn('Supabase storage unavailable, saving to IndexedDB Vault:', err?.message || err);
  }

  // Safe fallback: Store Blob in IndexedDB (prevents localStorage quota overflow)
  try {
    const vaultId = `doc_${uniqueId}`;
    const virtualUrl = await saveVaultItem(vaultId, file, {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/pdf',
    });

    if (onProgress) onProgress(100);

    return {
      url: virtualUrl, // 'idb://doc_...'
      fileName: file.name,
      fileSize: file.size,
      isPlatformHosted: true,
      storageProvider: 'local_fallback',
    };
  } catch (idbErr) {
    console.warn('IndexedDB fallback error, using local Blob URL:', idbErr);
    const blobUrl = URL.createObjectURL(file);
    if (onProgress) onProgress(100);
    return {
      url: blobUrl,
      fileName: file.name,
      fileSize: file.size,
      isPlatformHosted: true,
      storageProvider: 'local_fallback',
    };
  }
}
