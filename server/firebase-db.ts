import { db } from "./firebase-config";
import { FirebaseStorage } from "./firebase-storage";

// Export Firebase database instance
export { db };

// Export Firebase storage implementation
export const storage = new FirebaseStorage();