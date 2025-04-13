require("dotenv").config();
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  secure: true,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (filePath, folder = "Sports") => {
  try {
    const options = {
      folder,
      resource_type: "auto",
    };

    const result = await cloudinary.uploader.upload(filePath, options);
    console.log("Upload successful:", result);

    return result;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

module.exports = { uploadToCloudinary };
