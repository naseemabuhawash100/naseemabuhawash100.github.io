// imagekit-config.js
export const IMAGEKIT_CONFIG = {
  publicKey: "public_4XqRraihKdGc0zQMHPbVtjjQiiM=",
  urlEndpoint: "https://ik.imagekit.io/6swx5frcc"
};

export async function uploadToImageKit(file, fileName) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);
  formData.append("useUniqueFileName", "true");
  
  const response = await fetch(`https://upload.imagekit.io/api/v1/files/upload`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(IMAGEKIT_CONFIG.publicKey + ":")}`
    },
    body: formData
  });
  
  const data = await response.json();
  if (response.ok) {
    return { url: data.url, thumbnail: data.thumbnailUrl || data.url };
  } else {
    throw new Error(data.message || "فشل الرفع");
  }
}