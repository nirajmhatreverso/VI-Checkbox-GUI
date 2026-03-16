import { apiRequest } from '@/lib/queryClient';
import { BulkUploadType } from '@/types/bulk-upload.types';

export const bulkUploadApi = {
  /**
   * Uploads the bulk data file.
   * The uploadType is appended to FormData so the backend knows which processor to use.
   */
  async uploadFile(file: File, type: BulkUploadType) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', type);

    // Calls the BFF endpoint
    return apiRequest('/bulk/upload', 'POST', formData);
  },
};