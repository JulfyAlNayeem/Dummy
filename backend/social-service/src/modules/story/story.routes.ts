import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { storyController } from './story.controller.js';

const router = Router();
router.use(requireAuth);

const isUuid = (value: string): boolean =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const validateUuid = (paramName: string) => (req: any, res: any, next: any): void => {
	if (!isUuid(req.params[paramName])) {
		res.status(400).json({ message: `Invalid ${paramName} format` });
		return;
	}
	next();
};

router.post('/',                          storyController.createStory.bind(storyController));
router.get('/my',                         storyController.getMyStories.bind(storyController));
router.get('/user/:userId',               validateUuid('userId'), storyController.getUserStories.bind(storyController));
router.post('/:storyId/view',             validateUuid('storyId'), storyController.viewStory.bind(storyController));
router.delete('/:storyId',                validateUuid('storyId'), storyController.deleteStory.bind(storyController));

export default router;
