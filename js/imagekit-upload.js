// js/imagekit-upload.js
// حل نهائي وموثوق لرفع الصور إلى ImageKit مباشرة من المتصفح

export const IMAGEKIT_CONFIG = {
  publicKey: "public_4XqRraihKdGc0zQMHPbVtjjQiiM=",
  urlEndpoint: "https://ik.imagekit.io/6swx5frcc"
};

export async function uploadToImageKit(file, fileName) {
  console.log("بدء رفع الصورة:", fileName);

  // تحضير البيانات
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);
  formData.append("publicKey", IMAGEKIT_CONFIG.publicKey);
  formData.append("useUniqueFileName", "true");

  try {
    // إرسال الطلب
    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      body: formData
      // لا نحتاج headers مخصصة، FormData يحددها تلقائياً
    });

    const result = await response.json();

    if (response.ok && result.url) {
      console.log("تم الرفع بنجاح:", result.url);
      return {
        url: result.url,
        thumbnail: result.thumbnailUrl || result.url
      };
    } else {
      console.error("خطأ من ImageKit:", result);
      throw new Error(result.message || "فشل الرفع، يرجى التأكد من المفتاح العام");
    }
  } catch (error) {
    console.error("خطأ في الاتصال:", error);
    throw new Error("مشكلة في الاتصال بالإنترنت أو بالخادم");
  }
}
