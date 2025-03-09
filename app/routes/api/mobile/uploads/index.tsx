import { ActionFunctionArgs, data, unstable_composeUploadHandlers, unstable_createMemoryUploadHandler, unstable_parseMultipartFormData } from '@remix-run/node';
import { hash } from '~/cryptography.server';
import { updateUserProfilePhoto } from '~/models/user.server';
import { requireAuth } from '~/utils/auth.server';
import { CloudinaryUploadResult, deleteCloudinaryAsset, uploadToCloudinary } from '~/utils/cloudinary.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await requireAuth(request);

  if (request.headers.get("Content-Type")?.includes("multipart/form-data")) {
    const uploadHandler = unstable_composeUploadHandlers(
      uploadToCloudinary,
      unstable_createMemoryUploadHandler()
    );
    const avatarFormData = await unstable_parseMultipartFormData(request, uploadHandler);
    const resultString = avatarFormData.get("file") as string | null;
    if (!resultString) {
      return data({ error: "Upload failed" }, { status: 500 });
    }
    try {
      const result = JSON.parse(resultString) as CloudinaryUploadResult;
      const currentPublicId = user.profilePhotoId
      const updatedProfilePhoto = await updateUserProfilePhoto(user.id, result.url, result.public_id)
      if (updatedProfilePhoto && currentPublicId) {
        deleteCloudinaryAsset(currentPublicId)
      }
      return { success: true, url: result.url, filename: result.filename };
    } catch (error) {
      return data({ error: "Failed to process upload result" }, { status: 500 });
    }
  }

  const method = request.method;

  switch (method) {
    case "POST": {
      const jsonData = await request.json();
      const publicId = jsonData['public_id']; // Unique file name
      const timestamp = Math.floor(Date.now() / 1000); // Cloudinary requires a timestamp
      if (!publicId) {
        return data({ error: 'Missing public_id' }, { status: 400 });
      }
    
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
      // Parameters to sign (sorted alphabetically)
      const paramsToSign = `folder=fitizen&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = hash(paramsToSign);
    
      return data({ 
        signature, 
        timestamp, 
        apiKey, 
        cloudName,
        publicId,
      });
    }
    case "PUT":
      // Handle workout update
      break;
    case "DELETE":
      // Handle workout deletion
      break;
    default:
      return data({ error: "Method not allowed" }, { status: 405 });
  }
};