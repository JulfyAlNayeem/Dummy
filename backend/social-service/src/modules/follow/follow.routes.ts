import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { followController } from './follow.controller.js';

const router = Router();
router.use(requireAuth);

router.post('/suggestions',              followController.getSuggestions.bind(followController));
router.get('/suggestions',               followController.getSuggestions.bind(followController));
router.post('/:userId',                  followController.follow.bind(followController));
router.delete('/:userId',                followController.unfollow.bind(followController));
router.get('/:userId/status',            followController.getFollowStatus.bind(followController));
router.get('/:userId/followers',         followController.getFollowers.bind(followController));
router.get('/:userId/following',         followController.getFollowing.bind(followController));
router.get('/:userId/mutuals',           followController.getMutuals.bind(followController));

export default router;
