// ============================================================
// FIREBASE STORAGE - UPLOAD FILES
// ============================================================

class FirebaseStorageService {
    constructor() {
        this.initialized = false;
        this.storage = null;
        this.db = null;
    }

    async init() {
        if (this.initialized) return;

        try {
            // Importer Firebase
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
            const { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            const firebaseConfig = window.SINE?.config?.FIREBASE || {
                apiKey: "AIzaSyB...", 
                authDomain: "auth.sineshophome.com",
                projectId: "sineshop-93e07",
                storageBucket: "sineshop-93e07.appspot.com"
            };

            const app = initializeApp(firebaseConfig);
            this.storage = getStorage(app);
            this.db = getFirestore(app);
            this.initialized = true;

            console.log('✅ Firebase Storage initialized');
            return true;
        } catch (error) {
            console.error('❌ Firebase init error:', error);
            // Fallback: utiliser localStorage
            this.initialized = false;
            return false;
        }
    }

    // Upload d'un fichier
    async uploadFile(file, path = 'products/') {
        try {
            await this.init();

            if (!this.initialized) {
                // Fallback: stocker en base64 dans localStorage
                return this.fallbackUpload(file, path);
            }

            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const fullPath = `${path}${fileName}`;
            const storageRef = ref(this.storage, fullPath);

            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Sauvegarder les métadonnées dans Firestore
            const docRef = await addDoc(collection(this.db, 'files'), {
                name: file.name,
                size: file.size,
                type: file.type,
                path: fullPath,
                url: downloadURL,
                uploadedAt: new Date().toISOString()
            });

            return {
                success: true,
                url: downloadURL,
                path: fullPath,
                name: file.name,
                size: file.size,
                type: file.type,
                id: docRef.id
            };
        } catch (error) {
            console.error('❌ Upload error:', error);
            return this.fallbackUpload(file, path);
        }
    }

    // Upload multiple
    async uploadMultiple(files, path = 'products/') {
        const results = [];
        for (const file of files) {
            const result = await this.uploadFile(file, path);
            results.push(result);
        }
        return results;
    }

    // Supprimer un fichier
    async deleteFile(path) {
        try {
            await this.init();
            if (!this.initialized) {
                // Fallback: supprimer du localStorage
                return this.fallbackDelete(path);
            }

            const storageRef = ref(this.storage, path);
            await deleteObject(storageRef);

            // Supprimer les métadonnées
            const q = query(collection(this.db, 'files'), where('path', '==', path));
            const snapshot = await getDocs(q);
            snapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });

            return { success: true };
        } catch (error) {
            console.error('❌ Delete error:', error);
            return { success: false, error: error.message };
        }
    }

    // FALLBACK: localStorage
    fallbackUpload(file, path) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const dataUrl = e.target.result;
                const files = JSON.parse(localStorage.getItem('sine_uploaded_files') || '[]');
                const fileData = {
                    id: 'file_' + Date.now().toString(36),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    path: path,
                    data: dataUrl,
                    uploadedAt: new Date().toISOString()
                };
                files.push(fileData);
                localStorage.setItem('sine_uploaded_files', JSON.stringify(files));
                resolve({
                    success: true,
                    url: dataUrl,
                    path: path + file.name,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    local: true
                });
            };
            reader.readAsDataURL(file);
        });
    }

    fallbackDelete(path) {
        const files = JSON.parse(localStorage.getItem('sine_uploaded_files') || '[]');
        const filtered = files.filter(f => f.path !== path);
        localStorage.setItem('sine_uploaded_files', JSON.stringify(filtered));
        return { success: true };
    }

    // Récupérer les fichiers d'un utilisateur
    async getUserFiles(userId) {
        try {
            await this.init();
            if (!this.initialized) {
                return JSON.parse(localStorage.getItem('sine_uploaded_files') || '[]');
            }

            const q = query(collection(this.db, 'files'), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            const files = [];
            snapshot.forEach(doc => {
                files.push({ id: doc.id, ...doc.data() });
            });
            return files;
        } catch (error) {
            console.error('❌ Get user files error:', error);
            return [];
        }
    }
}

// Instance globale
const firebaseStorage = new FirebaseStorageService();

// Exposer globalement
window.firebaseStorage = firebaseStorage;

console.log('✅ Firebase Storage service loaded');