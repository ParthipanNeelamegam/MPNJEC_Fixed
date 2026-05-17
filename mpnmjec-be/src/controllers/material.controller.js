import path from 'path';
import Material from '../models/Material.js';

// GET /api/materials/:id/download
export const serveMaterialFile = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await Material.findById(id);
    if (!material) return res.status(404).json({ error: 'Material not found' });

    // If external link provided, count and redirect
    if (material.externalLink) {
      material.downloads = (material.downloads || 0) + 1;
      await material.save();
      return res.redirect(material.externalLink);
    }

    if (!material.fileUrl) {
      return res.status(404).json({ error: 'No file available for this material' });
    }

    // fileUrl is expected like '/uploads/materials/<filename>'
    const filename = path.basename(material.fileUrl);
    const filePath = path.join(process.cwd(), 'uploads', 'materials', filename);

    material.downloads = (material.downloads || 0) + 1;
    await material.save();

    return res.download(filePath, material.fileName || filename, (err) => {
      if (err) {
        // If download fails, send a friendly error
        return res.status(500).json({ error: 'Failed to send file' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to download material' });
  }
};
