import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { localDB } from './store';
import { AttendancePhoto } from '../types';

export class StorageService {
  /**
   * Uploads watermarked photo to Supabase Storage bucket 'attendance-photos'
   * formatted as: attendance-photos/{user_id}/{attendance_id}.jpg
   */
  public static async uploadAttendancePhoto(
    userId: string,
    attendanceId: string,
    watermarkedDataUrl: string,
    fileHash: string
  ): Promise<AttendancePhoto> {
    const fileName = `${attendanceId}.jpg`;
    const storagePath = `${userId}/${fileName}`;

    if (isLiveSupabaseConfigured() && supabase) {
      try {
        // Convert base64 DataURL to Blob
        const response = await fetch(watermarkedDataUrl);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('attendance-photos')
          .upload(storagePath, blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          console.warn('Supabase storage upload failed, saving to local photo store:', uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('attendance-photos')
            .getPublicUrl(storagePath);

          const photoRecord: AttendancePhoto = {
            id: `photo-${attendanceId}`,
            attendance_id: attendanceId,
            storage_path: storagePath,
            file_hash: fileHash,
            watermarked_url: publicUrlData.publicUrl,
            raw_data_url: watermarkedDataUrl,
            created_at: new Date().toISOString(),
          };

          localDB.savePhoto(photoRecord);
          return photoRecord;
        }
      } catch (err) {
        console.warn('Error connecting to Supabase storage, using fallback:', err);
      }
    }

    // Local / Offline-resilient fallback
    const photoRecord: AttendancePhoto = {
      id: `photo-${attendanceId}`,
      attendance_id: attendanceId,
      storage_path: `attendance-photos/${storagePath}`,
      file_hash: fileHash,
      watermarked_url: watermarkedDataUrl,
      raw_data_url: watermarkedDataUrl,
      created_at: new Date().toISOString(),
    };

    localDB.savePhoto(photoRecord);
    return photoRecord;
  }
}
