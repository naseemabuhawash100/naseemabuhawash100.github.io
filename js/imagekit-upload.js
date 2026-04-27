// js/imagekit-upload.js
export const IMAGEKIT_CONFIG = {
  publicKey: "public_4XqRraihKdGc0zQMHPbVtjjQiiM=",
  urlEndpoint: "https://ik.imagekit.io/6swx5frcc"
};

export async function uploadToImageKit(file, fileName) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async function(event) {
      const base64String = event.target.result.split(',')[1];
      
      try {
        // استخدام خدمة CORS proxy مجانية لتجاوز مشكلة CORS
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const apiUrl = 'https://upload.imagekit.io/api/v1/files/upload';
        
        const formData = new FormData();
        formData.append('file', base64String);
        formData.append('fileName', fileName);
        formData.append('publicKey', IMAGEKIT_CONFIG.publicKey);
        formData.append('useUniqueFileName', 'true');
        
        const response = await fetch(proxyUrl + apiUrl, {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        
        if (response.ok && data.url) {
          resolve({ url: data.url, thumbnail: data.thumbnailUrl || data.url });
        } else {
          reject(new Error(data.message || 'فشل الرفع'));
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
}
