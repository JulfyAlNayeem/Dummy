import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { profileController } from './profile.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/me',                       profileController.getMyProfile.bind(profileController));
router.put('/me',                       profileController.updateProfile.bind(profileController));
router.get('/me/posts',                 profileController.getMyPosts.bind(profileController));
router.get('/:userId',                  profileController.getProfile.bind(profileController));
router.get('/:userId/posts',            profileController.getUserPosts.bind(profileController));
router.get('/:userId/stats',            profileController.getStats.bind(profileController));

export default router;
