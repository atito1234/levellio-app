/**
 * Firebase Storage upload — ready for photo/video sharing once the project is on
 * the Blaze plan (Storage isn't available on Spark). NOT yet wired into the UI:
 * to enable, add an `expo-image-picker` button in PostComposer (same pattern as
 * JournalComposerScreen), call `uploadMedia(uri, path)`, and pass the returned
 * URL as `draft.media = { url, type }`.
 */
import { getApp } from 'firebase/app';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

/** Upload a local file URI to Storage and return its public download URL. */
export async function uploadMedia(localUri: string, storagePath: string): Promise<string> {
  const res = await fetch(localUri);
  const blob = await res.blob();
  const storage = getStorage(getApp());
  const target = ref(storage, storagePath);
  await uploadBytes(target, blob);
  return getDownloadURL(target);
}
