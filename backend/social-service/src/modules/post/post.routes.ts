import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { postController } from './post.controller.js';

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

router.post('/',                       postController.createPost.bind(postController));
router.get('/',                        postController.getPublicPosts.bind(postController));
router.get('/:postId',                 validateUuid('postId'), postController.getPost.bind(postController));
router.put('/:postId',                 validateUuid('postId'), postController.editPost.bind(postController));
router.delete('/:postId',              validateUuid('postId'), postController.deletePost.bind(postController));
router.post('/:postId/share',          validateUuid('postId'), postController.sharePost.bind(postController));
router.get('/user/:userId/shares',     validateUuid('userId'), postController.getUserShares.bind(postController));

export default router;
