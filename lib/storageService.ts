import { supabase } from './supabaseClient';
import { saveVaultItem } from './indexedDbStorage';

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  isPlatformHosted: boolean;
  storageProvider: 'supabase' | 'mediafire' | 'drive' | 'local_fallback';
}

/**
 * Detects if a given URL is from MediaFire, Google Drive, or external provider
 */
export function detectLinkProvider(url: string): 'mediafire' | 'drive' | 'onedrive' | 'mega' | 'platform' | 'direct' {
  if (!url) return 'direct';
  const lower = url.toLowerCase();
  if (lower.includes('mediafire.com')) return 'mediafire';
  if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) return 'drive';
  if (lower.includes('onedrive') || lower.includes('1drv.ms') || lower.includes('sharepoint.com')) return 'onedrive';
  if (lower.includes('mega.nz') || lower.includes('mega.io')) return 'mega';
  if (lower.startsWith('idb://') || lower.includes('supabase.co') || lower.startsWith('data:application/pdf') || lower.startsWith('blob:')) return 'platform';
  return 'direct';
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
