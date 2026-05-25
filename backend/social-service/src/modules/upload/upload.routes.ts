import { Router, Request, Response } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { uploadImage } from '../../common/middleware/upload.middleware.js';

const router = Router();
router.use(requireAuth);

router.post('/', (req: Request, res: Response) => {
  uploadImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    const url = `/api/social/uploads/${req.file.filename}`;
    res.status(201).json({ url });
  });
});

export default router;
