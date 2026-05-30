import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { reactionController } from './reaction.controller.js';

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

router.post('/posts/:postId/reactions',         validateUuid('postId'), reactionController.togglePostReaction.bind(reactionController));
router.get('/posts/:postId/reactions',          validateUuid('postId'), reactionController.getPostReactions.bind(reactionController));
router.get('/posts/:postId/reactions/mine',     validateUuid('postId'), reactionController.getMyPostReaction.bind(reactionController));
router.post('/comments/:commentId/reactions',   validateUuid('commentId'), reactionController.toggleCommentReaction.bind(reactionController));

export default router;
