import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { commentController } from './comment.controller.js';

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

// Post comments
router.get('/posts/:postId/comments',                       validateUuid('postId'), commentController.getPostComments.bind(commentController));
router.post('/posts/:postId/comments',                      validateUuid('postId'), commentController.createComment.bind(commentController));
router.put('/comments/:commentId',                          validateUuid('commentId'), commentController.editComment.bind(commentController));
router.delete('/comments/:commentId',                       validateUuid('commentId'), commentController.deleteComment.bind(commentController));

// Comment replies
router.post('/comments/:commentId/replies',                 validateUuid('commentId'), commentController.createReply.bind(commentController));
router.put('/replies/:replyId',                             commentController.editReply.bind(commentController));
router.delete('/replies/:replyId',                          commentController.deleteReply.bind(commentController));

export default router;
