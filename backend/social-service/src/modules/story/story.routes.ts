import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { storyController } from './story.controller.js';

const router = Router();
router.use(requireAuth);

router.post('/',                          storyController.createStory.bind(storyController));
router.get('/my',                         storyController.getMyStories.bind(storyController));
router.get('/user/:userId',               storyController.getUserStories.bind(storyController));
router.post('/:storyId/view',             storyController.viewStory.bind(storyController));
router.delete('/:storyId',                storyController.deleteStory.bind(storyController));

export default router;
