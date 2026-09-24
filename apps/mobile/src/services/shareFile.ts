import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Write a string to a cache file and open the share sheet on it — the phone's
 * version of a download. Throws on failure so the caller can say so; the
 * silent case is a device with no share target, where there is nothing to say.
 */
export async function shareFile(content: string, filename: string, mimeType: string, uti: string) {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, UTI: uti });
  }
}
