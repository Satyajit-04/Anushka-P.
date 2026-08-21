import { GoogleDriveFile } from '../types';
import { getAccessToken } from './firebaseAuth';

export async function listDrivePdfFiles(searchTerm?: string, pageToken?: string): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in with Google to access your Google Drive files.');
  }

  let query = "mimeType = 'application/pdf' and trashed = false";
  if (searchTerm && searchTerm.trim()) {
    const escaped = searchTerm.replace(/'/g, "\\'");
    query += ` and name contains '${escaped}'`;
  }

  const fields = 'nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink, thumbnailLink, webViewLink)';
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.append('q', query);
  url.searchParams.append('fields', fields);
  url.searchParams.append('pageSize', '25');
  url.searchParams.append('orderBy', 'modifiedTime desc');
  if (pageToken) {
    url.searchParams.append('pageToken', pageToken);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || response.statusText;
    if (response.status === 401 || response.status === 403 || message.toLowerCase().includes('scope') || message.toLowerCase().includes('permission')) {
      throw new Error('Google Drive permissions required: Your current session needs drive.readonly scope authorization. Please click Re-authorize Google Drive below.');
    }
    throw new Error(`Google Drive API error: ${message}`);
  }

  const data = await response.json();
  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken,
  };
}

export async function downloadDrivePdfBinary(fileId: string): Promise<ArrayBuffer> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in with Google to download files.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF from Google Drive (${response.status}: ${response.statusText})`);
  }

  return await response.arrayBuffer();
}

export function formatFileSize(bytes?: string | number): string {
  if (!bytes) return 'Unknown size';
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(num)) return 'Unknown size';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(isoString?: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}
